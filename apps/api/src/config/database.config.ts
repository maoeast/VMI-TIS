/**
 * 数据库连接配置。
 *
 * 唯一事实源：仓库根目录 prisma/schema.prisma。
 * SQLite 的相对路径在 Prisma CLI 中以 schema.prisma 所在目录（prisma/）为基准，
 * 但 Prisma Client 运行时会受 cwd 影响。这里统一把相对 file: URL 解析成绝对路径，
 * 保证 CLI 与 Client 指向同一个数据库文件。
 */
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../../../..');
const SCHEMA_DIR = resolve(REPO_ROOT, 'prisma');
const DEFAULT_SQLITE_URL = 'file:../apps/api/data/vmi_tis.db';

function toAbsoluteSqliteUrl(url: string): string {
  if (!url.startsWith('file:')) {
    return url;
  }

  const rawPath = url.slice('file:'.length);
  const isAbsolute =
    rawPath.startsWith('/') || /^[A-Za-z]:[\\/]/.test(rawPath);
  if (isAbsolute) {
    return url;
  }

  const absolutePath = resolve(SCHEMA_DIR, rawPath).replace(/\\/g, '/');
  return `file:${absolutePath}`;
}

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  return toAbsoluteSqliteUrl(url && url.length > 0 ? url : DEFAULT_SQLITE_URL);
}

export function isPostgres(): boolean {
  const url = getDatabaseUrl();
  return url.startsWith('postgresql://') || url.startsWith('postgres://');
}

export function databaseModeLabel(): 'sqlite' | 'postgresql' {
  return isPostgres() ? 'postgresql' : 'sqlite';
}
