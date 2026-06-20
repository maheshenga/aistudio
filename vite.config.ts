import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
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
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');
            if (!normalizedId.includes('/node_modules/')) {
              if (
                normalizedId.includes('/src/components/Store') ||
                normalizedId.includes('/src/components/Crm') ||
                normalizedId.includes('/src/components/Customer')
              ) {
                return 'app-commerce';
              }
              if (
                normalizedId.includes('/src/components/ECommerce') ||
                normalizedId.includes('/src/components/Image') ||
                normalizedId.includes('/src/components/Video') ||
                normalizedId.includes('/src/components/Remix') ||
                normalizedId.includes('/src/components/Avatar') ||
                normalizedId.includes('/src/components/AICanvas') ||
                normalizedId.includes('/src/components/Copywriting') ||
                normalizedId.includes('/src/components/Design') ||
                normalizedId.includes('/src/components/Marketing') ||
                normalizedId.includes('/src/components/Director')
              ) {
                return 'app-creative';
              }
              if (
                normalizedId.includes('/src/components/Admin') ||
                normalizedId.includes('/src/components/Billing') ||
                normalizedId.includes('/src/components/Finance') ||
                normalizedId.includes('/src/components/Tax') ||
                normalizedId.includes('/src/components/Settings') ||
                normalizedId.includes('/src/components/ApiKeys') ||
                normalizedId.includes('/src/components/ActivityLogs') ||
                normalizedId.includes('/src/components/Agent') ||
                normalizedId.includes('/src/components/Tasks') ||
                normalizedId.includes('/src/components/TaskCenter') ||
                normalizedId.includes('/src/components/Team') ||
                normalizedId.includes('/src/components/SubAccounts') ||
                normalizedId.includes('/src/components/Risk') ||
                normalizedId.includes('/src/components/Plugin') ||
                normalizedId.includes('/src/components/Employee')
              ) {
                return 'app-ops';
              }
              return undefined;
            }
            if (normalizedId.includes('/react/') || normalizedId.includes('/react-dom/') || normalizedId.includes('/scheduler/')) {
              return 'vendor-react';
            }
            if (normalizedId.includes('/recharts/') || normalizedId.includes('/d3')) {
              return 'vendor-charts';
            }
            const packagePath = normalizedId.split('/node_modules/')[1] ?? '';
            const packageName = packagePath.startsWith('@')
              ? packagePath.split('/').slice(0, 2).join('/')
              : packagePath.split('/')[0];
            if (packageName === 'motion' || packageName === 'robust-predicates' || packageName === 'delaunator') {
              return undefined;
            }
            return `vendor-${packageName.replace('@', '').replace('/', '-')}`;
          },
        },
      },
    },
  };
});
