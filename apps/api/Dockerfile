# VMI-TIS API — 医院服务器版（PostgreSQL）
# 构建：docker compose -f deploy/docker-compose.yml build
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/api/package.json apps/api/
RUN npm ci

COPY . .

# 构建期按 PostgreSQL provider 生成 Prisma Client
ENV PRISMA_PROVIDER=postgresql
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app ./

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
