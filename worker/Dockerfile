FROM node:22-alpine AS base
RUN apk add --no-cache ffmpeg libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
# Worker health endpoint (GET /health)
EXPOSE 9999
CMD ["node", "dist/index.js"]
