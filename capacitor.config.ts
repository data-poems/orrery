import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'solar.orrery',
  appName: 'Solar Orrery',
  webDir: 'dist',
  loggingBehavior: 'production',
  ios: {
    contentInset: 'never',
    // The Xcode project dir must stay App.xcodeproj (Capacitor hardcodes that
    // path); the shared scheme is named Orrery, so point the CLI at it.
    scheme: 'Orrery',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      backgroundColor: '#000000',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000',
      overlaysWebView: true,
    },
  },
};

export default config;
