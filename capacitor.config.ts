import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.koerspoule',
  appName: 'koerspoule',
  webDir: 'dist',
  server: {
    url: 'https://00edb85e-4817-4978-88c8-1708211db2a7.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
