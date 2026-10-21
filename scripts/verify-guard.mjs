#!/usr/bin/env node
/**
 * 验收脚本目标防护：默认只允许打到隔离测试库（3100），拒绝 3000 端口的开发库。
 *
 * 背景：verify-task2/3/4/6 会写入学生、课次、评估等测试数据；它们过去默认指向 3000，
 * 直接运行会把验收数据写进开发库。现在默认值是 3100，且 3000 需要显式放行。
 *
 * 放行方式：ALLOW_DEV_API=1 API_BASE=http://localhost:3000/api node scripts/verify-task2.mjs
 */

/**
 * 校验验收目标地址：解析失败、或命中本机 3000 且未放行时打印拒绝说明并退出（退出码 1），
 * 校验通过时原样返回地址，供脚本当作 API_BASE / API_ORIGIN 使用。
 */
export function assertSafeTarget(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    console.error(
      `[verify-guard] 无法解析目标地址：${raw}（需要完整 URL，如 http://localhost:3100/api）`,
    );
    process.exit(1);
  }

  const host = url.hostname.replace(/^\[|\]$/g, '');
  const isLocalHost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1';
  const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;

  if (isLocalHost && port === 3000 && process.env.ALLOW_DEV_API !== '1') {
    console.error(
      [
        `[verify-guard] 拒绝在 3000 端口运行验收脚本：${raw}`,
        '  3000 是开发数据库，验收脚本会写入测试数据。默认请用隔离测试库的 3100（npm run verify:all 会自动起 3100 + 临时库）。',
        '  确需对 3000 运行时显式放行：ALLOW_DEV_API=1 ' +
          'API_BASE=http://localhost:3000/api node scripts/verify-taskN.mjs',
      ].join('\n'),
    );
    process.exit(1);
  }

  return raw;
}
