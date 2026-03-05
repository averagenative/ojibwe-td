import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ojibwetd.app',
  appName: 'Ojibwe TD',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0a0e0a',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      overlaysWebView: true,
    },
  },
  ios: {
    preferredContentMode: 'mobile',
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: false,
  },
};

export default config;
