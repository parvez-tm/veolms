# ---- Build stage ----
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json env.d.ts ./
COPY src ./src
RUN npm run build

# ---- Runtime stage ----
FROM node:24-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# ffmpeg powers the encrypted-HLS transcode of uploaded videos.
RUN apk add --no-cache ffmpeg

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Run as the built-in non-root user (uploads go to R2, so no writable disk needed).
RUN chown -R node:node /app
USER node

EXPOSE 5005
CMD ["node", "dist/app.js"]
