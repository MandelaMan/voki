FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

ENV DATABASE_URL=mysql://build:build@127.0.0.1:3306/voki
RUN npx prisma generate && npx tsc

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
