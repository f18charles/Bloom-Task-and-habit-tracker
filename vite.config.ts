import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      modulePreload: {
        resolveDependencies(filename, deps, { hostId, hostType }) {
          return deps.filter(
            (dep) =>
              !dep.includes('vendor-charts') &&
              !dep.includes('vendor-dnd') &&
              !dep.includes('Kanban') &&
              !dep.includes('Progress') &&
              !dep.includes('Calendar') &&
              !dep.includes('Settings') &&
              !dep.includes('ResetPassword') &&
              !dep.includes('Auth') &&
              !dep.includes('Welcome')
          );
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/') || id.includes('/scheduler/') || id.includes('clsx') || id.includes('tailwind-merge')) {
                return 'vendor-react';
              }
              if (id.includes('recharts') || id.includes('d3-')) {
                return 'vendor-charts';
              }
              if (id.includes('@dnd-kit')) {
                return 'vendor-dnd';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
