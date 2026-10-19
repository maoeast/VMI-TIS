import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vmitis.pad',
  appName: '星眸智康 Pad',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
