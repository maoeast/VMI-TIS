#!/usr/bin/env node
/**
 * 按 PRISMA_PROVIDER 生成 Prisma Schema 与 Client。
 *
 * - 默认 sqlite（单机版）：直接使用唯一事实源 prisma/schema.prisma，
 *   避免生成副本改变 SQLite 相对路径的基准目录。
 * - Docker / 医院服务器版：在构建时设置 PRISMA_PROVIDER=postgresql，
 *   从 prisma/.generated/schema.postgresql.prisma 生成。
 *
 * 生成产物位于 prisma/.generated/（已 gitignore）。
 */
import { execFileSync, execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = resolve(rootDir, 'apps', 'api');
const target = process.env.PRISMA_PROVIDER ?? 'sqlite';

if (!['sqlite', 'postgresql'].includes(target)) {
  console.error(
    `[generate-client] 不支持的 PRISMA_PROVIDER: ${target}；可选值: sqlite, postgresql`
  );
  process.exit(1);
}

execFileSync(
  process.execPath,
  ['scripts/prepare-schema.mjs', '--target', target],
  { cwd: rootDir, stdio: 'inherit' }
);

// cwd 固定为 apps/api：Prisma CLI 会加载 apps/api/.env 中的 DATABASE_URL。
// sqlite 直接用根 Schema；postgresql 用生成副本。
const schemaPath =
  target === 'sqlite'
    ? '../../prisma/schema.prisma'
    : `../../prisma/.generated/schema.${target}.prisma`;

execSync(`npx prisma generate --schema "${schemaPath}"`, {
  cwd: apiDir,
  stdio: 'inherit',
});

console.log(`[generate-client] Prisma Client 已按 provider="${target}" 生成`);
