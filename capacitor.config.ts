import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'app.mathpro.scientific',
  appName: 'MathPro Scientific Calculator',
  webDir: 'dist',
  android: { allowMixedContent: false }
};
export default config;