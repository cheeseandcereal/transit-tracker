import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text'],
    },
  },
  // swc plugin used for emitDecoratorMetadata ts support for typeORM: https://github.com/vitest-dev/vitest/discussions/3320
  plugins: [swc.vite()],
});
