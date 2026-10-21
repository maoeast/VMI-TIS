# VMI-TIS API — 医院服务器版（PostgreSQL）
# 构建：docker compose -f deploy/docker-compose.yml build
FROM node:24-alpine AS build

# Prisma 引擎在 Alpine 上需要 OpenSSL；否则会误判为 openssl-1.1.x。
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY . .

# 构建期按 PostgreSQL provider 生成 Prisma Client
ENV PRISMA_PROVIDER=postgresql
RUN npm run build

FROM node:24-alpine AS runtime

# 运行期 npx prisma db push / schema engine 同样需要 OpenSSL。
RUN apk add --no-cache openssl

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app ./

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
