import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages配信時はワークフローが CELLAB_BASE=/cellab/ を渡す
  base: process.env.CELLAB_BASE ?? '/',
  test: {
    // 既定は node。UIのテストはファイル先頭で happy-dom を指定する。
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
