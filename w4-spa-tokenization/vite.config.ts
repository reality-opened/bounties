import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { apiMockPlugin } from './mock/apiMock';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * MINIMAL vite config, hand-written for this kit — NOT a copy of apps/webserver/vite.config.ts.
 * The real app's config wires 12 HTML entrypoints, three.js/socket.io optimizeDeps, an HTTPS dev
 * cert, an object-layer fixture static server, and a much larger API mock containing client-name
 * comments (see README.md). None of that applies to this single-page kit.
 */
export default defineConfig({
  root: '.',
  plugins: [apiMockPlugin()],
  resolve: {
    alias: {
      // Kit-relative — the real apps/webserver aliases these to ../../packages/{protocol,design};
      // here design/ is a sibling directory instead.
      '@reality/design': resolve(__dirname, 'design/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        refine: resolve(__dirname, 'refine.html'),
      },
    },
  },
  server: {
    port: 3000,
  },
});
