import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const packageJson = JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8'),
) as { version: string };

const gitSha = (process.env.VITE_GIT_SHA ?? 'dev').slice(0, 12);

/**
 * Service worker buildin osana: `pwa/sw.js` saa buildin tiedostolistan ja
 * build-tunnisteen. Tiedostolista tekee sovelluksesta offline-kelpoisen heti
 * ensimmäisen käynnin jälkeen, ja tunniste vaihtaa välimuistin nimen, jolloin vanhat
 * hajautetut tiedostot siivoutuvat. Devissä SW:tä ei rekisteröidä (ks. main.tsx).
 */
function serviceWorker(): Plugin {
  const publicFiles = [
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/icon-maskable.png',
    'icons/icon.svg',
  ];
  return {
    name: 'wraprx-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle).filter((file) => !file.endsWith('.map'));
      const precache = ['./', './index.html', ...[...built, ...publicFiles].map((file) => `./${file}`)];
      const template = readFileSync(resolve(import.meta.dirname, 'pwa/sw.js'), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace(
            "'__BUILD__'",
            JSON.stringify(`${packageJson.version}-${gitSha}-${Date.now().toString(36)}`),
          )
          .replace('= __PRECACHE__;', `= ${JSON.stringify(precache)};`),
      });
    },
  };
}

// base: './' -> suhteelliset polut, jotta sama build toimii GitHub Pagesin
// alihakemistossa ja PWA:na ilman repon nimen kovakoodausta (ks. CLAUDE.md).
export default defineConfig({
  base: './',
  // Versionäkyvyys (suunnitelma §4): laskurin tulos on jäljitettävissä koodiversioon.
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __GIT_SHA__: JSON.stringify(gitSha),
  },
  plugins: [serviceWorker()],
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
