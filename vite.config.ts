import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const packageJson = JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8'),
) as { version: string };

// base: './' -> suhteelliset polut, jotta sama build toimii GitHub Pagesin
// alihakemistossa ja PWA:na ilman repon nimen kovakoodausta (ks. CLAUDE.md).
export default defineConfig({
  base: './',
  // Versionäkyvyys (suunnitelma §4): laskurin tulos on jäljitettävissä koodiversioon.
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __GIT_SHA__: JSON.stringify((process.env.VITE_GIT_SHA ?? 'dev').slice(0, 12)),
  },
  resolve: {
    alias: {
      '@optics': resolve(import.meta.dirname, 'src/optics'),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
