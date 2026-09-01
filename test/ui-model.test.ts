/**
 * Käyttöliittymän syöttöpolku (vaihe P1).
 *
 * Testi ajaa referenssitapauksen LOMAKKEEN kautta: lomakkeen merkkijonot ->
 * `buildSolveInput` -> `solve`. Odotusarvot ovat samat käsin johdetut luvut kuin
 * `test/cases/internal.json`:issa (johto: `test/cases/derivations.md`), joten testi
 * ei vertaa koodia itseensä vaan riippumattomaan johtoon.
 *
 * Näin varmistuu se, mikä P1:ssä voi mennä rikki ilman että ydin muuttuu:
 * desimaalipilkku, miinusmuotoisen sylinterin transpositio ja kenttien kytkentä.
 * DOM:ia ei tarvita — `model.ts` on tarkoituksella puhdas.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { solve } from '../src/optics/index.js';
import {
  buildSolveInput,
  createDefaultForm,
  createExampleForm,
  parseDecimal,
  type FormState,
} from '../src/ui/state/model.js';

interface CasePower {
  sphere: number;
  cylinder: number;
  axis: number;
}

interface InternalCases {
  cases: {
    id: string;
    expected: { od: { exact?: CasePower }; os: { exact?: CasePower } };
  }[];
}

const CASES = JSON.parse(
  readFileSync(join(import.meta.dirname, 'cases', 'internal.json'), 'utf8'),
) as InternalCases;

const PLAN_CASE = CASES.cases.find((entry) => entry.id === 'plan-own-case');
if (!PLAN_CASE?.expected.od.exact || !PLAN_CASE.expected.os.exact) {
  throw new Error('internal.json: tapausta plan-own-case ei löydy tai siitä puuttuu odotusarvo');
}
const EXPECTED_OD = PLAN_CASE.expected.od.exact;
const EXPECTED_OS = PLAN_CASE.expected.os.exact;

const POWER_TOLERANCE = 0.005;
const AXIS_TOLERANCE = 0.5;

function expectPower(actual: { sphere: number; cylinder: number; axis: number }, expected: CasePower) {
  expect(Math.abs(actual.sphere - expected.sphere)).toBeLessThan(POWER_TOLERANCE);
  expect(Math.abs(actual.cylinder - expected.cylinder)).toBeLessThan(POWER_TOLERANCE);
  expect(Math.abs(actual.axis - expected.axis)).toBeLessThan(AXIS_TOLERANCE);
}

describe('lomakkeen syöttöpolku', () => {
  it('esimerkkitapaus tuottaa referenssitapauksen luvut', () => {
    const outcome = solve(buildSolveInput(createExampleForm()));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expectPower(outcome.od.exact, EXPECTED_OD);
    expectPower(outcome.os.exact, EXPECTED_OS);
  });

  it('miinusmuotoinen sylinteri ja desimaalipilkku antavat saman tuloksen', () => {
    // Sama resepti miinusmuodossa: OD -1,00 +0,50 ax 175 == -0,50 -0,50 ax 85.
    const example = createExampleForm();
    const minusForm: FormState = {
      ...example,
      eyes: {
        OD: { ...example.eyes.OD, sphere: '-0,50', cylinder: '-0,50', axis: '85' },
        OS: { ...example.eyes.OS, sphere: '0,25', cylinder: '-2,00', axis: '80' },
      },
    };

    const outcome = solve(buildSolveInput(minusForm));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expectPower(outcome.od.exact, EXPECTED_OD);
    expectPower(outcome.os.exact, EXPECTED_OS);
  });

  it('hyötyarvio on silmäkohtainen: heikko OD ei hyödy, vahva OS hyötyy', () => {
    // Sama kehys molemmille, eri voimakkuus. Heikolla linssillä kompensointi katoaa
    // 0,25 D:n askeleeseen (§3.6), vahvalla ei. Arvio ei siis saa olla lasikohtainen.
    const example = createExampleForm();
    const asymmetric: FormState = {
      ...example,
      eyes: {
        OD: { ...example.eyes.OD, sphere: '-0,25', cylinder: '0', axis: '180' },
        OS: { ...example.eyes.OS, sphere: '-6,00', cylinder: '0', axis: '180' },
      },
    };

    const outcome = solve(buildSolveInput(asymmetric));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.od.compensationWorthwhile).toBe(false);
    expect(outcome.os.compensationWorthwhile).toBe(true);

    // Varoitus tulee vain siitä silmästä, jota se koskee.
    const odCodes = outcome.od.warnings.map((warning) => warning.code);
    const osCodes = outcome.os.warnings.map((warning) => warning.code);
    expect(odCodes).toContain('compensationNotWorthwhile');
    expect(osCodes).not.toContain('compensationNotWorthwhile');
  });

  it('esimerkkitapauksessa kompensointi kannattaa molemmilla silmillä', () => {
    const outcome = solve(buildSolveInput(createExampleForm()));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.od.compensationWorthwhile).toBe(true);
    expect(outcome.os.compensationWorthwhile).toBe(true);
  });

  it('kehysmitat tuottavat OC-korkeuden päätetyllä kriteerillä', () => {
    const outcome = solve(buildSolveInput(createExampleForm()));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const decentration = outcome.od.decentration;
    expect(decentration).not.toBeNull();
    // Kriteeri (A), katselinjan lävistyspiste: panto 18°, B 36 mm, korkeus 22 mm.
    // Vertailuluvut ovat eri kriteerejä eivätkä saa sekoittua ensisijaiseen lukuun.
    expect(decentration!.ocHeight).toBeGreaterThan(decentration!.comparison.vogelOcHeightMm);
    expect(decentration!.ocHeight).toBeGreaterThan(
      decentration!.comparison.opticalAxisOcHeightMm,
    );
  });

  it('tyhjä lomake ei kaadu vaan tuottaa validointivirheet', () => {
    const outcome = solve(buildSolveInput(createDefaultForm()));
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;

    const fields = outcome.issues.map((issue) => issue.field);
    expect(fields).toContain('eyes.OD.rx.sphere');
    expect(fields).toContain('frame.pantoscopicTiltDeg');
  });

  it('desimaalierotin kelpaa pilkkuna ja pisteenä, tyhjä on NaN', () => {
    expect(parseDecimal('-1,25')).toBe(-1.25);
    expect(parseDecimal('-1.25')).toBe(-1.25);
    expect(parseDecimal(' +2,00 ')).toBe(2);
    expect(Number.isNaN(parseDecimal(''))).toBe(true);
    expect(Number.isNaN(parseDecimal('abc'))).toBe(true);
  });
});
