/**
 * Valmistajadatan validointi (suunnitelma §5.4).
 *
 * Ajaa ytimen linssitalon palauttamia kompensoituja arvoja vastaan ja raportoi eron
 * per tapaus sekä hajonnan. Tärkein tehtävä ei ole todeta eroa vaan kertoa, MISTÄ
 * ero johtuu: skripti kokeilee neljää hypoteesia siitä, mitä oletuksia valmistaja
 * käyttää, ja kertoo mikä niistä selittää datan parhaiten.
 *
 *   1. exakti kerroin + wrap per linssi
 *   2. exakti kerroin + wrap kokonaisarvona
 *   3. Martinin sarjakehitelmä + wrap per linssi
 *   4. Martinin sarjakehitelmä + wrap kokonaisarvona
 *
 * Tämä on projektin tärkein avoin epävarmuus ja se on eristetty tähän skriptiin.
 * Kansio `test/cases/lab/` saa olla tyhjä — silloin skripti kertoo sen ja poistuu
 * onnistuneesti.
 *
 * Ajo: npm run validate:lab
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { solve, type Eye, type SolveInput } from '../src/optics/index.js';
import { matrixFromSpheroCyl, dioptricDistance } from '../src/optics/matrix.js';
import { D, deg, mm, pd } from '../src/optics/units.js';

const LAB_DIR = join(import.meta.dirname, '..', 'test', 'cases', 'lab');

/** CSV-otsikot; järjestys ei ratkaise, nimet ratkaisevat. */
const COLUMNS = [
  'lab',
  'lens',
  'index',
  'rxSph',
  'rxCyl',
  'rxAxis',
  'rxPrism',
  'rxBase',
  'panto',
  'wrap',
  'wrapMode',
  'vertexRef',
  'vertexWorn',
  'pd',
  'eye',
  'retSph',
  'retCyl',
  'retAxis',
  'retPrism',
  'retBase',
] as const;

type Row = Record<(typeof COLUMNS)[number], string>;

interface Hypothesis {
  readonly name: string;
  readonly ocrMethod: 'exact' | 'martin';
  readonly wrapMode: 'total' | 'perLens';
}

const HYPOTHESES: readonly Hypothesis[] = [
  { name: 'exakti + per linssi', ocrMethod: 'exact', wrapMode: 'perLens' },
  { name: 'exakti + kokonais', ocrMethod: 'exact', wrapMode: 'total' },
  { name: 'Martin + per linssi', ocrMethod: 'martin', wrapMode: 'perLens' },
  { name: 'Martin + kokonais', ocrMethod: 'martin', wrapMode: 'total' },
];

function parseCsv(text: string): Row[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
  if (lines.length === 0) return [];
  const header = lines[0].split(',').map((cell) => cell.trim());
  const missing = COLUMNS.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    throw new Error(`CSV:stä puuttuu sarakkeita: ${missing.join(', ')}`);
  }
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((cell) => cell.trim());
    const row = {} as Row;
    header.forEach((column, index) => {
      if ((COLUMNS as readonly string[]).includes(column)) {
        row[column as keyof Row] = cells[index] ?? '';
      }
    });
    return row;
  });
}

/** Plus-sylinterimuoto: CSV voi tulla kummassa tahansa muodossa. */
function toPlus(sphere: number, cylinder: number, axis: number) {
  if (cylinder >= 0) return { sphere, cylinder, axis };
  return { sphere: sphere + cylinder, cylinder: -cylinder, axis: ((axis + 90) % 180) || 180 };
}

function buildInput(row: Row, hypothesis: Hypothesis): { input: SolveInput; eye: Eye } {
  const eye: Eye = row.eye.toUpperCase() === 'OS' ? 'OS' : 'OD';
  const rx = toPlus(Number(row.rxSph), Number(row.rxCyl), Number(row.rxAxis));
  const prism = Number(row.rxPrism);
  const eyeInput = {
    rx: {
      sphere: D(rx.sphere),
      cylinder: D(rx.cylinder),
      axis: deg(rx.axis),
      ...(prism > 0 ? { prism: { magnitude: pd(prism), base: deg(Number(row.rxBase)) } } : {}),
    },
    monoPd: mm(Number(row.pd)),
  };
  return {
    eye,
    input: {
      eyes: { OD: eyeInput, OS: eyeInput },
      frame: {
        pantoscopicTiltDeg: deg(Number(row.panto)),
        wrapDeg: deg(Number(row.wrap)),
        wrapMode: hypothesis.wrapMode,
        anglesMeasured: true,
      },
      material: { index: Number(row.index), abbe: 40 },
      vertexRefraction: mm(Number(row.vertexRef)),
      vertexWorn: mm(Number(row.vertexWorn)),
      cra: mm(13.5),
      lensType: 'singleVision',
      labProfile: {
        compensatesInternally: false,
        axisStep: deg(1),
        prismStep: pd(0.25),
        cylForm: 'minus',
      },
      flags: { baseCurveModel: false, ocrMethod: hypothesis.ocrMethod, prismModel: 'wedgeSnell' },
    },
  };
}

function statistics(values: number[]): { mean: number; sd: number; max: number } {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, values.length - 1);
  return { mean, sd: Math.sqrt(variance), max: Math.max(...values) };
}

function main(): void {
  if (!existsSync(LAB_DIR)) {
    console.log(`Kansiota ei ole: ${LAB_DIR}`);
    return;
  }
  const files = readdirSync(LAB_DIR).filter((name) => name.toLowerCase().endsWith('.csv'));
  if (files.length === 0) {
    console.log('Valmistajadataa ei ole vielä saatavilla (test/cases/lab/ on tyhjä).');
    console.log('Skeema ja ajopolku ovat valmiina: pudota CSV-tiedostot kansioon ja aja uudelleen.');
    console.log(`Odotetut sarakkeet:\n  ${COLUMNS.join(',')}`);
    return;
  }

  const perHypothesis = new Map<string, number[]>();
  let rowCount = 0;

  for (const file of files) {
    const rows = parseCsv(readFileSync(join(LAB_DIR, file), 'utf8'));
    console.log(`\n=== ${file} (${rows.length} riviä) ===`);
    for (const row of rows) {
      rowCount++;
      const returned = toPlus(Number(row.retSph), Number(row.retCyl), Number(row.retAxis));
      const returnedMatrix = matrixFromSpheroCyl(returned);
      const differences: string[] = [];

      for (const hypothesis of HYPOTHESES) {
        const { input, eye } = buildInput(row, hypothesis);
        const outcome = solve(input);
        if (!outcome.ok) {
          console.log(`  ${row.lab}/${row.lens} ${row.eye}: validointivirhe`);
          continue;
        }
        const result = eye === 'OD' ? outcome.od : outcome.os;
        const ours = {
          sphere: result.exact.sphere as number,
          cylinder: result.exact.cylinder as number,
          axis: result.exact.axis as number,
        };
        const distance = dioptricDistance(matrixFromSpheroCyl(ours), returnedMatrix);
        const list = perHypothesis.get(hypothesis.name) ?? [];
        list.push(distance);
        perHypothesis.set(hypothesis.name, list);
        differences.push(`${hypothesis.name}: ${distance.toFixed(4)} D`);
      }
      console.log(`  ${row.lab}/${row.lens} ${row.eye}  ${differences.join(' | ')}`);
    }
  }

  console.log(`\n=== Yhteenveto (${rowCount} tapausta) ===`);
  const ranked = [...perHypothesis.entries()]
    .map(([name, values]) => ({ name, ...statistics(values) }))
    .sort((a, b) => a.mean - b.mean);
  for (const entry of ranked) {
    console.log(
      `  ${entry.name.padEnd(22)} keskiarvo ${entry.mean.toFixed(4)} D | ` +
        `hajonta ${entry.sd.toFixed(4)} D | suurin ${entry.max.toFixed(4)} D`,
    );
  }
  if (ranked.length > 0) {
    console.log(
      `\nDataa parhaiten selittävä oletusjoukko: ${ranked[0].name}. ` +
        'Jos ero on suuri kaikilla hypoteeseilla, valmistaja tekee jotain, mitä tämä malli ei kuvaa.',
    );
  }
}

main();
