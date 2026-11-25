FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend API, separate Web Admin Portal, and Firebase compat libraries served to /libs/firebase
COPY backend ./backend
COPY admin ./admin
COPY www/libs/firebase ./www/libs/firebase

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "backend/server.js"]
