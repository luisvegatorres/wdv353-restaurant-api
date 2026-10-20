import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    // Keep Axios requests same-origin; forward them to the existing Node API.
    proxy: { '/api': { target: 'http://127.0.0.1:3000' } },
  },
  test: { environment: 'jsdom', setupFiles: ['./test/setup.js'] },
});
