FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/prisma ./prisma
COPY backend/tsconfig.json ./
COPY backend/src ./src

ENV DATABASE_URL=mysql://build:build@127.0.0.1:3306/voki
RUN npx prisma generate && npx tsc

ENV NODE_ENV=production
EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node dist/index.js"]
