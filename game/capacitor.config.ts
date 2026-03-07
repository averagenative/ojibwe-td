import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ojibwetd.app',
  appName: 'Ojibwe TD',
  webDir: 'dist',
  plugins: {},
  ios: {
    preferredContentMode: 'mobile',
    contentInset: 'never',
    allowsLinkPreview: false,
    scrollEnabled: false,
  },
};

export default config;
