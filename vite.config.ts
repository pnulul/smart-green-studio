import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), tailwindcss()],
    base: process.env.SGS_BASE_PATH || '/',
    publicDir: '.prepared-public',
    build: { outDir: mode === 'pages' ? 'dist-pages' : 'dist' },
    worker: {
      format: 'es' as const
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // Always ignore the log data folder so writing logs doesn't trigger reload loops.
      watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/data/logs/**', '**/.prepared-public/**', '**/public/data/**', '**/dist-pages/**'] },
      allowedHosts: ['.trycloudflare.com'],
    },
  };
});
