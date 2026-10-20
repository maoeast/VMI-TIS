import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vmitis.pad',
  appName: '星眸智康 Pad',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    // Pad 通过局域网 HTTP 访问 API；HTTPS 页面请求 HTTP 属 mixed content，
    // WebView 默认拦截（Capacitor 默认 allowMixedContent=false）。
    // 生产改用 HTTPS 后应移除此开关。
    allowMixedContent: true,
  },
};

export default config;
