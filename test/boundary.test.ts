/**
 * Rajatesti (suunnitelma §4, §5.5).
 *
 * `src/optics/` on ydin: puhdas TypeScript, ei importteja hakemiston ulkopuolelta,
 * ei DOM:ia, ei tiedostojen lukemista. Hakemistoraja ei estä mitään mekaanisesti,
 * joten se valvotaan tällä testillä. Ilman tätä ero monorepoon olisi pelkkä lupaus.
 *
 * Tämä testi on kirjoitettu ENNEN ytimen tiedostoja, jotta se ohjaa rakennetta
 * eikä kritisoi sitä jälkikäteen.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '..');
const CORE_DIR = join(REPO_ROOT, 'src', 'optics');

/** Selainympäristön globaalit, joita ydin ei saa koskettaa. */
const FORBIDDEN_GLOBALS = [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'navigator',
  'location',
  'fetch',
  'alert',
  'requestAnimationFrame',
];

/** Node-ympäristön globaalit ja moduulit: ydin ei saa lukea tiedostoja eikä olettaa Nodea. */
const FORBIDDEN_NODE = ['process', '__dirname', 'require'];

function listCoreFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listCoreFiles(full));
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Poistaa kommentit ja merkkijonoliteraalit, jotta sanahaku ei osu
 * dokumentaatioon ("...ei koske DOM:iin") eikä virheviesteihin.
 */
function stripCommentsAndStrings(src: string): string {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && next === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === '\\') i++;
        i++;
      }
      i++;
      out += ' ';
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Importtien ja re-exportien lähteet, myös dynaaminen import ja require. */
function importSources(src: string): string[] {
  const sources: string[] = [];
  const patterns = [
    /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]/g,
    /(?:^|[^.\w])import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /(?:^|[^.\w])require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g,
  ];
  for (const re of patterns) {
    for (const m of src.matchAll(re)) {
      if (m[1]) sources.push(m[1]);
    }
  }
  return sources;
}

const coreFiles = listCoreFiles(CORE_DIR);

describe('ytimen eristys (src/optics)', () => {
  it('ytimessä on tiedostoja (testi ei saa läpäistä tyhjällä hakemistolla)', () => {
    expect(coreFiles.length).toBeGreaterThan(0);
  });

  for (const file of coreFiles) {
    const rel = relative(REPO_ROOT, file).replaceAll('\\', '/');
    const raw = readFileSync(file, 'utf8');
    const code = stripCommentsAndStrings(raw);

    it(`${rel}: importoi vain ytimen sisältä`, () => {
      for (const source of importSources(raw)) {
        expect(source, `${rel}: kielletty import "${source}"`).toMatch(/^\.\//);
        expect(source, `${rel}: import ei saa nousta hakemistosta ylös`).not.toContain('..');
        expect(source, `${rel}: ydin ei lue data-hakemistoa`).not.toContain('data/');
        expect(source, `${rel}: ydin ei importoi JSONia`).not.toMatch(/\.json$/);
      }
    });

    it(`${rel}: ei DOM- eikä Node-globaaleja`, () => {
      for (const name of [...FORBIDDEN_GLOBALS, ...FORBIDDEN_NODE]) {
        const re = new RegExp(`(?<![.\\w$])${name}(?![\\w$])`);
        expect(re.test(code), `${rel}: sisältää viittauksen "${name}"`).toBe(false);
      }
    });
  }
});
