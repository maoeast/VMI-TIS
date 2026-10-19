#!/usr/bin/env node
/**
 * Task 5 静态验收：三端工程、9 个教师页、4 款学生游戏、4 个家长 Tab、
 * 通用组件、hooks、Capacitor 配置与生产构建产物。
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? `：${detail}` : ''}`);
    console.error(`✗ ${name}${detail ? `：${detail}` : ''}`);
  }
}

function exists(path) {
  return existsSync(resolve(root, path));
}

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

const files = [
  'apps/web/package.json',
  'apps/web/vite.config.ts',
  'apps/web/tailwind.config.js',
  'apps/web/postcss.config.js',
  'apps/web/index.html',
  'apps/web/src/main.tsx',
  'apps/web/src/App.tsx',
  'apps/web/src/styles/tailwind.css',
  'apps/web/src/api/client.ts',
  'apps/web/src/store/useAppStore.ts',
  'apps/web/src/hooks/useKeyboardShortcuts.ts',
  'apps/web/src/hooks/useWebSocket.ts',
  'apps/web/src/components/Header.tsx',
  'apps/web/src/components/Sidebar.tsx',
  'apps/web/src/components/Toast.tsx',
  'apps/web/src/components/TrialBox.tsx',
  'apps/web/src/components/TeacherLayout.tsx',
  'apps/web/src/pages/web/HomePage.tsx',
  'apps/web/src/pages/web/StudentsPage.tsx',
  'apps/web/src/pages/web/AssessmentPage.tsx',
  'apps/web/src/pages/web/IepPage.tsx',
  'apps/web/src/pages/web/SessionPage.tsx',
  'apps/web/src/pages/web/AnalyticsPage.tsx',
  'apps/web/src/pages/web/HomeschoolPage.tsx',
  'apps/web/src/pages/web/LibraryPage.tsx',
  'apps/web/src/pages/web/SettingsPage.tsx',
  'apps/web/src/pages/student/StudentPadPage.tsx',
  'apps/web/src/pages/student/BubbleGame.tsx',
  'apps/web/src/pages/student/BrockGame.tsx',
  'apps/web/src/pages/student/StarGame.tsx',
  'apps/web/src/pages/student/CalibrationGame.tsx',
  'apps/web/src/pages/student/EyeRestOverlay.tsx',
  'apps/web/src/pages/parent/ParentAppPage.tsx',
  'apps/web/src/pages/parent/TasksTab.tsx',
  'apps/web/src/pages/parent/VideosTab.tsx',
  'apps/web/src/pages/parent/ProgressTab.tsx',
  'apps/web/src/pages/parent/ChatTab.tsx',
  'apps/web/capacitor.config.ts',
  'apps/web/android/app/src/main/AndroidManifest.xml',
];

for (const file of files) {
  check(`文件存在：${file}`, exists(file));
}

const packageJson = JSON.parse(read('apps/web/package.json'));
for (const dependency of [
  'react',
  'react-router-dom',
  'zustand',
  'socket.io-client',
  'chart.js',
  'react-chartjs-2',
  '@capacitor/core',
  '@capacitor/android',
]) {
  check(
    `依赖包含 ${dependency}`,
    Boolean(packageJson.dependencies?.[dependency]),
    JSON.stringify(packageJson.dependencies),
  );
}
for (const devDependency of ['vite', 'tailwindcss', '@capacitor/cli']) {
  check(
    `开发依赖包含 ${devDependency}`,
    Boolean(packageJson.devDependencies?.[devDependency]),
  );
}

const app = read('apps/web/src/App.tsx');
for (const route of ['/web/:page', '/student', '/parent']) {
  check(`App 路由包含 ${route}`, app.includes(route));
}

const shortcuts = read('apps/web/src/hooks/useKeyboardShortcuts.ts');
for (const key of ["case ' '", "case '1'", "case '0'", "case 'ArrowUp'", "case 'ArrowDown'", "case 'n'"]) {
  check(`快捷键包含 ${key}`, shortcuts.includes(key));
}

const viteConfig = read('apps/web/vite.config.ts');
check('Vite 代理 /api', viteConfig.includes("'/api'"));
check('Vite 代理 /socket.io（含 ws）', viteConfig.includes("'/socket.io'") && viteConfig.includes('ws: true'));

const capacitorConfig = read('apps/web/capacitor.config.ts');
check('Capacitor appId = com.vmitis.pad', capacitorConfig.includes('com.vmitis.pad'));
check('Capacitor webDir = dist', capacitorConfig.includes("webDir: 'dist'"));

const mainTs = read('apps/api/src/main.ts');
check('API 托管前端 dist', mainTs.includes('webDist'));
check('SPA 深链回退', mainTs.includes("webDist, 'index.html'"));
check('报告静态目录', mainTs.includes("'/api/reports/'"));

check('生产构建产物存在', exists('apps/web/dist/index.html'));
check('Android 工程存在', exists('apps/web/android/build.gradle'));

if (failures.length > 0) {
  console.error(`\nTask 5 静态验收失败：${failures.length} 项`);
  process.exitCode = 1;
} else {
  console.log('\nTask 5 静态验收 ALL CHECKS PASSED');
}
