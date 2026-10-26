import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Deployed under https://<user>.github.io/pint-ae/, so assets live under /pint-ae/.
export default defineConfig({
  base: '/pint-ae/',
  plugins: [react()],
});
