import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.journeyclips.app',
  appName: 'Journey Clips',
  webDir: 'dist',
  ios: {
    // iOS-specific settings for camera access
    contentInset: 'automatic',
    allowsLinkPreview: false
  }
};

export default config;
