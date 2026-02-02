import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.journeyclips.app',
  appName: 'Journey Clips',
  webDir: 'dist',
  ios: {
    // iOS-specific settings for camera access
    contentInset: 'automatic',
    allowsLinkPreview: false
  },
  // Live reload for faster development - remove for production builds
  server: {
    url: 'https://428fe18c-b98b-488a-bf64-8a4dd15def8d.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
