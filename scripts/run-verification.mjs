#!/usr/bin/env node
/**
 * Task 2/3/4/6 验收 runner：每个任务使用全新的隔离 SQLite 库，
 * 单独启动一个测试 API（端口 3100），跑完即删除测试库，避免污染主库。
 *
 * 用法：node scripts/run-verification.mjs
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = resolve(root, 'apps/api');
const testDb = resolve(apiDir, 'data/vmi_tis_test.db');
const testUploads = resolve(apiDir, 'data/uploads-test');
const testDbUrl = 'file:../apps/api/data/vmi_tis_test.db';
const testPort = 3100;
const testBase = `http://localhost:${testPort}`;
const socketToken = 'vmi-tis-dev-token';
const digitalResetCode = '0808';

const tasks = [
  { name: 'Task 2', script: 'scripts/verify-task2.mjs' },
  { name: 'Task 3', script: 'scripts/verify-task3.mjs' },
  { name: 'Task 4', script: 'scripts/verify-task4.mjs' },
  { name: 'Task 6', script: 'scripts/verify-task6.mjs' },
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} 失败（exit ${result.status}）`);
  }
}

function removeTestDb() {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    rmSync(`${testDb}${suffix}`, { force: true });
  }
}

function buildIfNeeded() {
  if (!existsSync(resolve(apiDir, 'dist/main.js'))) {
    console.log('[runner] API dist 缺失，先执行 npm run build…');
    run('npm', ['run', 'build']);
  }
}

function resetDatabase() {
  removeTestDb();
  const env = {
    ...process.env,
    DATABASE_URL: testDbUrl,
    NODE_ENV: 'test',
  };

  console.log('[runner] prisma db push（隔离测试库）…');
  run('npm', ['run', 'db:push'], { cwd: apiDir, env });
  console.log('[runner] seed（13 卡 / 6 学生）…');
  run('npm', ['run', 'db:seed'], { cwd: apiDir, env });
}

async function waitForHealth(timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${testBase}/api/health`);
      if (response.ok) return;
    } catch {
      // 服务尚未就绪，继续等待。
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  throw new Error('测试 API 未能在 30 秒内就绪');
}

async function stopApi(child) {
  if (!child || child.exitCode !== null) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  }

  await new Promise((resolvePromise) => {
    const timer = setTimeout(resolvePromise, 3000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolvePromise();
    });
  });
}

async function runTask(task) {
  console.log(`\n========== ${task.name} ==========`);
  resetDatabase();

  const api = spawn(process.execPath, ['dist/main.js'], {
    cwd: apiDir,
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
      NODE_ENV: 'test',
      PORT: String(testPort),
      SOCKET_TOKEN: socketToken,
      DIGITAL_RESET_CODE: digitalResetCode,
      UPLOADS_DIR: testUploads,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });

  let stderr = '';
  api.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });

  try {
    await waitForHealth();
    const result = spawnSync(process.execPath, [task.script], {
      cwd: root,
      stdio: 'inherit',
      env: {
        ...process.env,
        API_BASE: `${testBase}/api`,
        API_ORIGIN: testBase,
        SOCKET_TOKEN: socketToken,
        DIGITAL_RESET_CODE: digitalResetCode,
      },
    });

    if (result.status !== 0) {
      if (stderr.trim()) {
        console.error(`[runner] ${task.name} API stderr:\n${stderr}`);
      }
      return false;
    }
    return true;
  } finally {
    await stopApi(api);
    removeTestDb();
    rmSync(testUploads, { recursive: true, force: true });
  }
}

async function main() {
  buildIfNeeded();

  const results = [];
  for (const task of tasks) {
    let passed = false;
    try {
      passed = await runTask(task);
    } catch (error) {
      console.error(`[runner] ${task.name} 失败:`, error);
    }
    results.push({ name: task.name, passed });
  }

  console.log('\n========== 汇总 ==========');
  for (const result of results) {
    console.log(`${result.passed ? '✓' : '✗'} ${result.name}`);
  }

  const failed = results.filter((result) => !result.passed);
  if (failed.length > 0) {
    console.error(`\n${failed.length} 个任务失败`);
    process.exitCode = 1;
    return;
  }

  console.log('\n全部验收任务通过（每个任务均使用全新测试库）');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
