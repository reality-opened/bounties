import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Kit-relative alias — points at ./protocol (this kit's own copy of @reality/protocol)
// instead of the platform-repo path (../../packages/protocol) the original
// apps/mobile/test-harness used. See ../README.md "Fixing the @reality/protocol import".
export default defineConfig({
  resolve: {
    alias: {
      '@reality/protocol': resolve(__dirname, '../protocol/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
});
