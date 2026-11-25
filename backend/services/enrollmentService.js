const { generateId, verifyPaymentSignature, computePaymentSignature } = require('../security');
const { evaluateCouponQuote, createAppError, resolveCourseAlias } = require('./couponService');

const ACCESS_GRANTED_STATUSES = new Set([
  'free_enrollment',
  'payment_verified',
  'active',
  'exam_date_pending',
  'scheduled',
  'completed',
  'rebooking_eligible'
]);

const ACTIVE_ATTEMPT_STATUSES = new Set([
  'payment_pending',
  'free_enrollment',
  'payment_verified',
  'active',
  'exam_date_pending',
  'scheduled'
]);

function addAuditLog(db, { actor, action, entityType, entityId, details = {}, ipAddress = '' }) {
  db.auditLogs.unshift({
    id: generateId('aud'),
    actorId: actor ? actor.id : null,
    actorRole: actor ? actor.role : 'system',
    actorEmail: actor ? actor.email : 'system',
    action,
    entityType,
    entityId,
    details,
    ipAddress,
    createdAt: new Date().toISOString()
  });
  if (db.auditLogs.length > 2000) {
    db.auditLogs.length = 2000;
  }
}

function addNotification(db, { userId, type, title, message, enrollmentId = null }) {
  db.notifications.unshift({
    id: generateId('ntf'),
    userId,
    type,
    title,
    message,
    enrollmentId,
    read: false,
    createdAt: new Date().toISOString()
  });
}

function computeStudentEntitlement(db, userId) {
  const userEnrollments = db.enrollments.filter(e => e.userId === userId && e.status !== 'cancelled');
  const now = Date.now();
  const validEnrollments = userEnrollments.filter(e => {
    if (!ACCESS_GRANTED_STATUSES.has(e.status)) return false;
    if (e.expiresAt && new Date(e.expiresAt).getTime() <= now) return false;
    return true;
  });

  const unlockedLanguages = new Set();
  const activePlans = [];
  for (const enr of validEnrollments) {
    const course = db.courses.find(c => c.id === enr.courseId);
    const lang = course ? course.language : 'both';
    if (lang === 'both') {
      unlockedLanguages.add('en');
      unlockedLanguages.add('ta');
    } else if (lang) {
      unlockedLanguages.add(lang);
    }
    activePlans.push(enr.courseId);
  }

  const primary = validEnrollments[0] || null;
  return {
    isPremium: validEnrollments.length > 0,
    plan: primary ? primary.courseId : 'free',
    courseName: primary ? primary.courseTitle : 'Free Practice Guest',
    expiresAt: primary ? primary.expiresAt : null,
    maxPassages: validEnrollments.length > 0 ? 50 : 2,
    unlockedLanguages: Array.from(unlockedLanguages),
    activePlans
  };
}

function enrichEnrollment(enrollment, purchase) {
  const examDisplayStatus = enrollment.examDate
    ? `Scheduled: ${enrollment.examDate}${enrollment.examSlot ? ` (${enrollment.examSlot})` : ''}`
    : (enrollment.status === 'completed' || enrollment.status === 'rebooking_eligible')
      ? 'Examination Completed'
      : enrollment.status === 'payment_pending'
        ? 'Awaiting Payment Verification'
        : enrollment.status === 'cancelled'
          ? 'Cancelled'
          : 'Exam Date Awaiting Admin Assignment';

  return {
    ...enrollment,
    examDisplayStatus,
    purchase: purchase || null
  };
}

async function createCheckoutOrEnroll({
  db,
  user,
  courseId,
  couponCode = '',
  attemptType = 'initial',
  paymentMethod = 'razorpay',
  idempotencyKey = '',
  ipAddress = '',
  config
}) {
  if (!user || user.role !== 'student') {
    throw createAppError('Only authenticated students can enroll in courses.', 403, 'STUDENT_REQUIRED');
  }

  return db.runTransaction((draft) => {
    if (idempotencyKey) {
      const existingIdemp = draft.idempotencyKeys[`${user.id}:${idempotencyKey}`];
      if (existingIdemp) {
        const purchase = draft.purchases.find(p => p.id === existingIdemp.purchaseId);
        const enrollment = draft.enrollments.find(e => e.id === existingIdemp.enrollmentId);
        return {
          idempotentReplay: true,
          nextStep: purchase && purchase.finalAmount === 0 ? 'enrolled_free' : 'payment_required',
          purchase,
          enrollment: enrichEnrollment(enrollment, purchase),
          paymentOrder: existingIdemp.paymentOrder || null,
          entitlement: computeStudentEntitlement(draft, user.id)
        };
      }
    }

    const quote = evaluateCouponQuote({
      db: draft,
      userId: user.id,
      courseId,
      couponCode
    });
    const course = quote.course;

    const existingForCourse = draft.enrollments
      .filter(e => e.userId === user.id && e.courseId === course.id && e.status !== 'cancelled')
      .sort((a, b) => a.attemptNumber - b.attemptNumber);

    const activeAttempt = existingForCourse.find(e => ACTIVE_ATTEMPT_STATUSES.has(e.status));
    if (activeAttempt) {
      throw createAppError(
        activeAttempt.status === 'payment_pending'
          ? 'You already have a pending payment for this course. Complete payment or contact admin.'
          : 'You already have an active enrollment for this course.',
        409,
        'ALREADY_ENROLLED'
      );
    }

    const lastAttempt = existingForCourse[existingForCourse.length - 1] || null;
    let attemptNumber = 1;
    let parentEnrollmentId = null;
    let resolvedAttemptType = 'initial';

    if (lastAttempt) {
      if (!(lastAttempt.status === 'rebooking_eligible' || lastAttempt.rebookingAllowed === true)) {
        throw createAppError(
          'Rebooking is not yet enabled for this completed course. Wait for admin to enable rebooking.',
          403,
          'REBOOKING_NOT_ENABLED'
        );
      }
      attemptNumber = lastAttempt.attemptNumber + 1;
      parentEnrollmentId = lastAttempt.id;
      resolvedAttemptType = 'rebooking';
      // Mark previous rebooking_eligible attempt back to completed history once new attempt starts
      lastAttempt.rebookingAllowed = false;
      if (lastAttempt.status === 'rebooking_eligible') {
        lastAttempt.status = 'completed';
      }
      lastAttempt.updatedAt = new Date().toISOString();
    } else if (attemptType === 'rebooking') {
      throw createAppError('No prior completed enrollment exists to rebook for this course.', 400, 'NO_PRIOR_ATTEMPT');
    }

    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + (course.durationDays || 365) * 86400 * 1000).toISOString();
    const purchaseId = generateId('pur');
    const enrollmentId = generateId('enr');
    const isFree = quote.isFreeEnrollment;
    const orderId = isFree ? null : `order_${generateId('pay')}`;

    const purchase = {
      id: purchaseId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      courseId: course.id,
      courseTitle: course.title,
      couponId: quote.coupon ? quote.coupon.id : null,
      couponCode: quote.couponCode,
      originalAmount: quote.originalPrice,
      discountAmount: quote.discountAmount,
      finalAmount: quote.finalPrice,
      currency: 'INR',
      paymentMethod: isFree ? 'free_coupon' : String(paymentMethod || 'razorpay'),
      paymentStatus: isFree ? 'free_enrollment' : 'pending',
      transactionRef: isFree ? `FREE-${purchaseId.toUpperCase()}` : orderId,
      orderId,
      attemptType: resolvedAttemptType,
      attemptNumber,
      idempotencyKey: idempotencyKey || null,
      createdAt: nowIso,
      verifiedAt: isFree ? nowIso : null,
      verifiedByAdminId: null
    };

    const enrollment = {
      id: enrollmentId,
      userId: user.id,
      courseId: course.id,
      courseTitle: course.title,
      purchaseId,
      attemptNumber,
      parentEnrollmentId,
      status: isFree ? 'exam_date_pending' : 'payment_pending',
      paymentStatus: isFree ? 'free_enrollment' : 'pending',
      examDate: null,
      examSlot: null,
      examCenter: 'Sri Kalaimagal Typewriting Institute, Gummidipoondi',
      examRemarks: null,
      rebookingAllowed: false,
      activatedAt: isFree ? nowIso : null,
      completedAt: null,
      expiresAt,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    if (quote.coupon) {
      draft.couponRedemptions.push({
        id: generateId('red'),
        couponId: quote.coupon.id,
        couponCode: quote.coupon.code,
        userId: user.id,
        purchaseId,
        enrollmentId,
        courseId: course.id,
        originalPrice: quote.originalPrice,
        discountAmount: quote.discountAmount,
        finalPrice: quote.finalPrice,
        status: isFree ? 'redeemed' : 'reserved',
        redeemedAt: nowIso
      });
      quote.coupon.redemptionCount = draft.couponRedemptions.filter(
        r => r.couponId === quote.coupon.id && r.status !== 'released'
      ).length;
      quote.coupon.updatedAt = nowIso;
    }

    draft.purchases.unshift(purchase);
    draft.enrollments.unshift(enrollment);
    upsertExamAttempt(draft, enrollment);

    if (isFree) {
      addNotification(draft, {
        userId: user.id,
        type: 'enrollment_activated',
        title: `Free Enrollment Confirmed: ${course.title}`,
        message: `100% coupon ${quote.couponCode} applied (₹0 payable). Course access unlocked! Exam date is awaiting admin assignment.`,
        enrollmentId
      });
    }

    addAuditLog(draft, {
      actor: user,
      action: isFree ? 'STUDENT_FREE_COUPON_ENROLLMENT' : 'STUDENT_CHECKOUT_INITIATED',
      entityType: 'enrollment',
      entityId: enrollmentId,
      details: {
        courseId: course.id,
        couponCode: quote.couponCode,
        originalAmount: quote.originalPrice,
        discountAmount: quote.discountAmount,
        finalAmount: quote.finalPrice,
        attemptNumber
      },
      ipAddress
    });

    const paymentOrder = isFree ? null : {
      orderId,
      purchaseId,
      amount: quote.finalPrice,
      currency: 'INR',
      // Signature helper preview is NEVER used for authorization bypass; real client gateway sends paymentId + signature verified server-side.
      courseTitle: course.title
    };

    if (idempotencyKey) {
      draft.idempotencyKeys[`${user.id}:${idempotencyKey}`] = {
        purchaseId,
        enrollmentId,
        paymentOrder,
        createdAt: nowIso
      };
    }

    return {
      idempotentReplay: false,
      nextStep: isFree ? 'enrolled_free' : 'payment_required',
      purchase,
      enrollment: enrichEnrollment(enrollment, purchase),
      paymentOrder,
      entitlement: computeStudentEntitlement(draft, user.id)
    };
  });
}

async function verifyStudentPayment({
  db,
  user,
  purchaseId,
  orderId,
  paymentId,
  signature,
  ipAddress = '',
  config
}) {
  return db.runTransaction((draft) => {
    const purchase = draft.purchases.find(p => p.id === purchaseId && p.userId === user.id);
    if (!purchase) {
      throw createAppError('Purchase record not found.', 404, 'PURCHASE_NOT_FOUND');
    }
    if (purchase.paymentStatus === 'verified' || purchase.paymentStatus === 'free_enrollment') {
      const enrollment = draft.enrollments.find(e => e.purchaseId === purchase.id);
      return {
        alreadyVerified: true,
        purchase,
        enrollment: enrichEnrollment(enrollment, purchase),
        entitlement: computeStudentEntitlement(draft, user.id)
      };
    }
    if (purchase.orderId !== orderId) {
      throw createAppError('Order ID mismatch for purchase verification.', 400, 'ORDER_MISMATCH');
    }

    const isValidSig = verifyPaymentSignature({
      orderId,
      paymentId,
      amount: purchase.finalAmount,
      signature,
      secret: config.paymentWebhookSecret
    });
    if (!isValidSig) {
      throw createAppError('Invalid payment signature. Verification rejected.', 400, 'INVALID_PAYMENT_SIGNATURE');
    }

    const nowIso = new Date().toISOString();
    purchase.paymentStatus = 'verified';
    purchase.transactionRef = paymentId;
    purchase.verifiedAt = nowIso;

    const enrollment = draft.enrollments.find(e => e.purchaseId === purchase.id);
    if (enrollment) {
      enrollment.paymentStatus = 'verified';
      enrollment.status = 'exam_date_pending';
      enrollment.activatedAt = nowIso;
      enrollment.updatedAt = nowIso;
      upsertExamAttempt(draft, enrollment);
    }

    const redemption = draft.couponRedemptions.find(r => r.purchaseId === purchase.id);
    if (redemption) {
      redemption.status = 'redeemed';
    }

    addNotification(draft, {
      userId: user.id,
      type: 'payment_verified',
      title: `Payment Verified: ${purchase.courseTitle}`,
      message: `Payment of ₹${purchase.finalAmount} (${paymentId}) verified. Course unlocked! Exam date is awaiting admin assignment.`,
      enrollmentId: enrollment ? enrollment.id : null
    });

    addAuditLog(draft, {
      actor: user,
      action: 'STUDENT_PAYMENT_VERIFIED',
      entityType: 'purchase',
      entityId: purchase.id,
      details: { orderId, paymentId, amount: purchase.finalAmount },
      ipAddress
    });

    return {
      alreadyVerified: false,
      purchase,
      enrollment: enrichEnrollment(enrollment, purchase),
      entitlement: computeStudentEntitlement(draft, user.id)
    };
  });
}

function upsertExamAttempt(draft, enrollment) {
  if (!draft.examAttempts) draft.examAttempts = [];
  const attemptId = `att_${enrollment.id}`;
  const idx = draft.examAttempts.findIndex(a => a.id === attemptId || a.enrollmentId === enrollment.id);
  const record = {
    id: attemptId,
    enrollmentId: enrollment.id,
    userId: enrollment.userId,
    studentId: enrollment.userId,
    courseId: enrollment.courseId,
    courseTitle: enrollment.courseTitle,
    attemptNumber: enrollment.attemptNumber || 1,
    parentEnrollmentId: enrollment.parentEnrollmentId || null,
    status: enrollment.status,
    scoreSummary: enrollment.scoreSummary || null,
    examRemarks: enrollment.examRemarks || null,
    rebookingAllowed: Boolean(enrollment.rebookingAllowed),
    completedAt: enrollment.completedAt || null,
    createdAt: enrollment.createdAt,
    updatedAt: enrollment.updatedAt || new Date().toISOString()
  };
  if (idx >= 0) draft.examAttempts[idx] = record;
  else draft.examAttempts.unshift(record);
  return record;
}

function upsertExamSchedule(draft, enrollment) {
  if (!draft.examSchedules) draft.examSchedules = [];
  const scheduleId = `sch_${enrollment.id}`;
  const idx = draft.examSchedules.findIndex(s => s.id === scheduleId || s.enrollmentId === enrollment.id);
  const record = {
    id: scheduleId,
    enrollmentId: enrollment.id,
    userId: enrollment.userId,
    studentId: enrollment.userId,
    courseId: enrollment.courseId,
    courseTitle: enrollment.courseTitle,
    attemptNumber: enrollment.attemptNumber || 1,
    examDate: enrollment.examDate,
    examSlot: enrollment.examSlot || '10:00 AM Batch',
    examCenter: enrollment.examCenter || 'Sri Kalaimagal Typewriting Institute',
    examRemarks: enrollment.examRemarks || null,
    status: (enrollment.status === 'completed' || enrollment.status === 'rebooking_eligible') ? 'completed' : 'scheduled',
    createdAt: idx >= 0 ? draft.examSchedules[idx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (idx >= 0) draft.examSchedules[idx] = record;
  else draft.examSchedules.unshift(record);
  return record;
}

module.exports = {
  ACCESS_GRANTED_STATUSES,
  ACTIVE_ATTEMPT_STATUSES,
  addAuditLog,
  addNotification,
  computeStudentEntitlement,
  enrichEnrollment,
  createCheckoutOrEnroll,
  verifyStudentPayment,
  resolveCourseAlias,
  computePaymentSignature,
  upsertExamAttempt,
  upsertExamSchedule
};
