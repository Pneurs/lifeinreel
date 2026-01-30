import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.journeyclips.app',
  appName: 'Journey Clips',
  webDir: 'dist',
  // Hot-reload: Points to Lovable preview for live development
  server: {
    url: 'https://428fe18c-b98b-488a-bf64-8a4dd15def8d.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    // iOS-specific settings for camera access
    contentInset: 'automatic',
    allowsLinkPreview: false
  }
};

export default config;
