import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.focl.personal',
  appName: 'Focl',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#0C1416'
  },
  plugins: {
    LocalNotifications: {
      iconColor: '#5CC6CF'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0C1416'
    }
  }
};

export default config;
