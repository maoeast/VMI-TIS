import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // `@vmi-tis/shared-types` 是 npm workspace 软链，CommonJS 产物不在 node_modules 下；
    // 显式纳入 commonjs 转换，Vite 才能识别种子模块的具名导出。
    commonjsOptions: {
      include: [/node_modules/, /packages[\\/]shared-types[\\/]dist/],
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
