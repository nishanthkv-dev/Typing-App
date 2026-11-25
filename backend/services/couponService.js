const { roundInr } = require('../security');

function resolveCourseAlias(courseId) {
  const aliases = {
    tamil_speed: 'tamil_senior',
    english_speed: 'english_senior'
  };
  return aliases[courseId] || courseId;
}

function createAppError(message, statusCode = 400, code = 'BAD_REQUEST') {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

/**
 * Evaluates a course price and optional coupon code strictly from server DB state.
 * Never trusts client-supplied price, discount, or totals.
 */
function evaluateCouponQuote({ db, userId, courseId, couponCode, now = new Date() }) {
  const resolvedId = resolveCourseAlias(courseId);
  const course = db.courses.find(c => c.id === resolvedId || c.id === courseId);
  if (!course || !course.active) {
    throw createAppError('Selected course is not available.', 404, 'COURSE_NOT_FOUND');
  }

  const originalPrice = roundInr(course.priceInr);
  const normalizedCode = couponCode ? String(couponCode).trim().toUpperCase() : '';

  if (!normalizedCode) {
    return {
      course,
      coupon: null,
      couponApplied: false,
      couponCode: null,
      originalPrice,
      discountAmount: 0,
      finalPrice: originalPrice,
      isFreeEnrollment: originalPrice === 0,
      breakdownLabel: originalPrice === 0 ? 'Free Course' : 'Standard Course Fee'
    };
  }

  const coupon = db.coupons.find(c => c.code === normalizedCode);
  if (!coupon) {
    throw createAppError(`Coupon code "${normalizedCode}" does not exist.`, 404, 'COUPON_NOT_FOUND');
  }
  if (!coupon.active) {
    throw createAppError(`Coupon "${normalizedCode}" is currently inactive.`, 400, 'COUPON_INACTIVE');
  }
  if (coupon.startsAt && now < new Date(coupon.startsAt)) {
    throw createAppError(`Coupon "${normalizedCode}" is not active yet.`, 400, 'COUPON_NOT_STARTED');
  }
  if (coupon.expiresAt && now > new Date(coupon.expiresAt)) {
    throw createAppError(`Coupon "${normalizedCode}" has expired.`, 400, 'COUPON_EXPIRED');
  }

  const applicableIds = Array.isArray(coupon.applicableCourseIds) ? coupon.applicableCourseIds : [];
  if (applicableIds.length > 0 && !applicableIds.includes(course.id) && !applicableIds.includes(courseId)) {
    throw createAppError(`Coupon "${normalizedCode}" is not applicable to ${course.title}.`, 400, 'COUPON_COURSE_MISMATCH');
  }

  const minPurchase = roundInr(coupon.minPurchaseAmount || 0);
  if (originalPrice < minPurchase) {
    throw createAppError(`Minimum purchase of ₹${minPurchase} is required for coupon "${normalizedCode}".`, 400, 'COUPON_MIN_PURCHASE');
  }

  const activeRedemptions = db.couponRedemptions.filter(
    r => r.couponId === coupon.id && r.status !== 'released'
  );

  if (coupon.maxRedemptions !== null && coupon.maxRedemptions !== undefined && Number(coupon.maxRedemptions) >= 0) {
    if (activeRedemptions.length >= Number(coupon.maxRedemptions)) {
      throw createAppError(`Coupon "${normalizedCode}" has reached its maximum redemption limit.`, 400, 'COUPON_LIMIT_REACHED');
    }
  }

  if (userId && coupon.perStudentLimit !== null && coupon.perStudentLimit !== undefined) {
    const userCount = activeRedemptions.filter(r => r.userId === userId).length;
    if (userCount >= Number(coupon.perStudentLimit)) {
      throw createAppError(`You have already used coupon "${normalizedCode}" up to the per-student limit (${coupon.perStudentLimit}).`, 400, 'COUPON_USER_LIMIT_REACHED');
    }
  }

  let rawDiscount = 0;
  let breakdownLabel = '';
  if (coupon.discountType === 'free_100' || (coupon.discountType === 'percentage' && Number(coupon.discountValue) >= 100)) {
    rawDiscount = originalPrice;
    breakdownLabel = `100% Free Coupon (${coupon.code})`;
  } else if (coupon.discountType === 'percentage') {
    const pct = Math.max(0, Math.min(100, Number(coupon.discountValue) || 0));
    rawDiscount = roundInr((originalPrice * pct) / 100);
    breakdownLabel = `${pct}% Discount (${coupon.code})`;
  } else if (coupon.discountType === 'fixed') {
    const fixedAmt = Math.max(0, roundInr(coupon.discountValue));
    rawDiscount = Math.min(originalPrice, fixedAmt);
    breakdownLabel = `₹${fixedAmt} Flat Discount (${coupon.code})`;
  } else {
    throw createAppError('Invalid coupon configuration.', 500, 'COUPON_INVALID_TYPE');
  }

  const discountAmount = Math.max(0, Math.min(originalPrice, rawDiscount));
  const finalPrice = Math.max(0, roundInr(originalPrice - discountAmount));

  return {
    course,
    coupon,
    couponApplied: true,
    couponCode: coupon.code,
    originalPrice,
    discountAmount,
    finalPrice,
    isFreeEnrollment: finalPrice === 0,
    breakdownLabel
  };
}

module.exports = {
  resolveCourseAlias,
  createAppError,
  evaluateCouponQuote
};
