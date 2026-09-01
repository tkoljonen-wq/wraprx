/**
 * Kiilamalli, exakti Snell ja poikkeutuksen käännös (suunnitelma §3.5, vaihe P2).
 *
 * Odotusarvot tapauksille 8 ja 9 on johdettu käsin skalaarisella prismakaavalla
 * (test/cases/derivations.md). Se on eri muotoilu kuin koodin vektorimuotoinen
 * Snell, joten yhtäpitävyys on todellinen tarkistus eikä saman laskun toisto.
 *
 * Käsinlaskun tarkkuus on noin 1e-6 rad, mikä on ±0,0002 pd. Raja on tässä 0,001 pd
 * eli sama kuin juurenhaun toleranssi. Jos koodi poikkeaa tästä enemmän, vika on
 * mallissa eikä rajassa — rajaa ei löysätä.
 */
import { describe, expect, it } from 'vitest';

import { baseToComponents } from '../src/optics/format.js';
import { tiltGeometry } from '../src/optics/geometry.js';
import { solve, type PrismModel, type SolveInput } from '../src/optics/index.js';
import {
  UNTILTED_FRAME,
  prismSpecToVector,
  prismVectorToSpec,
  solveWedgeForPrism,
  wedgeApexAngleDeg,
  wedgeBaseDeg,
  wedgeDeviation,
  type LensFrame,
  type PrismVector,
  type WedgeVector,
} from '../src/optics/prism.js';
import { D, deg, mm, pd, toRad } from '../src/optics/units.js';

const PC = 1.586;
const HAND_TOLERANCE_PD = 0.001;
const SOLVER_TOLERANCE_PD = 0.001;

/** Kiila kiilakulmasta ja kannan suunnasta linssitasossa. */
function wedge(apexDeg: number, baseDeg: number): WedgeVector {
  const alpha = toRad(apexDeg);
  const angle = toRad(baseDeg);
  return { h: alpha * Math.cos(angle), v: alpha * Math.sin(angle) };
}

function frameFor(eye: 'OD' | 'OS', wrapDeg: number, pantoDeg: number): LensFrame {
  const geometry = tiltGeometry(eye, { wrapPerLensDeg: wrapDeg, pantoDeg });
  return { normal: geometry.normal, eh: geometry.eh, ev: geometry.ev };
}

function deviationOrThrow(w: WedgeVector, frame: LensFrame, index = PC): PrismVector {
  const deviation = wedgeDeviation(w, frame, index);
  if (!deviation) throw new Error('säde ei läpäissyt kiilaa');
  return deviation;
}

const norm = (p: PrismVector): number => Math.hypot(p.horizontal, p.vertical);

describe('kiilan poikkeutus, exakti Snell', () => {
  it('tapaus 8: kallistamaton 5°:n kiila antaa 5,1264 pd kannan suuntaan', () => {
    const deviation = deviationOrThrow(wedge(5, 0), UNTILTED_FRAME);

    expect(Math.abs(deviation.horizontal - 5.1264)).toBeLessThan(HAND_TOLERANCE_PD);
    expect(Math.abs(deviation.vertical)).toBeLessThan(1e-9);
  });

  it('tapaus 9: sama kiila wrapissa 15° antaa 5,3851 pd', () => {
    const deviation = deviationOrThrow(wedge(5, 0), frameFor('OS', 15, 0));

    expect(Math.abs(norm(deviation) - 5.3851)).toBeLessThan(HAND_TOLERANCE_PD);
    expect(deviation.horizontal).toBeGreaterThan(0);
  });

  it('kanta 0° poikkeuttaa säteen suuntaan +x, kanta 90° suuntaan +y', () => {
    const horizontal = deviationOrThrow(wedge(3, 0), UNTILTED_FRAME);
    expect(horizontal.horizontal).toBeGreaterThan(0);
    expect(Math.abs(horizontal.vertical)).toBeLessThan(1e-9);

    const vertical = deviationOrThrow(wedge(3, 90), UNTILTED_FRAME);
    expect(vertical.vertical).toBeGreaterThan(0);
    expect(Math.abs(vertical.horizontal)).toBeLessThan(1e-9);
  });

  it('tasopaksu levy ei poikkeuta sädettä millään kallistuksella', () => {
    for (const [wrapDeg, pantoDeg] of [
      [0, 0],
      [15, 18],
      [25, 5],
    ] as const) {
      const deviation = deviationOrThrow({ h: 0, v: 0 }, frameFor('OD', wrapDeg, pantoDeg));
      expect(norm(deviation)).toBeLessThan(1e-12);
    }
  });

  it('poikkeutus kasvaa, kun kallistus on kanta–kärki-tasossa', () => {
    // Kanta ê_h:n suuntaan, kallistus wrapilla eli samassa tasossa: kasvaa.
    const flat = norm(deviationOrThrow(wedge(5, 0), UNTILTED_FRAME));
    const inPlane = norm(deviationOrThrow(wedge(5, 0), frameFor('OS', 15, 0)));
    // Kanta pystyyn, kallistus yhä wrapilla eli kohtisuorassa kanta–kärki-akseliin:
    // vaikutus on eri, ja juuri siksi approksimaatio ei kelpaa (§3.5).
    const crossPlane = norm(deviationOrThrow(wedge(5, 90), frameFor('OS', 15, 0)));

    expect(inPlane).toBeGreaterThan(flat);
    expect(Math.abs(crossPlane - inPlane)).toBeGreaterThan(0.01);
  });

  it('OD ja OS ovat toistensa peilikuvia', () => {
    const od = deviationOrThrow(wedge(5, 0), frameFor('OD', 15, 12));
    const os = deviationOrThrow(wedge(5, 180), frameFor('OS', 15, 12));

    // Peilaus x-akselin suhteen: vaakakomponentti kääntyy, pysty ei.
    expect(Math.abs(od.horizontal + os.horizontal)).toBeLessThan(1e-9);
    expect(Math.abs(od.vertical - os.vertical)).toBeLessThan(1e-9);
  });
});

describe('poikkeutuksen käännös', () => {
  const targets: readonly { magnitude: number; base: number }[] = [
    { magnitude: 0.5, base: 0 },
    { magnitude: 2, base: 90 },
    { magnitude: 2, base: 270 },
    { magnitude: 3.5, base: 45 },
    { magnitude: 6, base: 200 },
    { magnitude: 0.02, base: 135 },
  ];

  it('ratkaisu toistaa tavoitteen 0,001 pd:n tarkkuudella kallistetussa kehyksessä', () => {
    const frame = frameFor('OD', 15, 18);
    for (const target of targets) {
      const targetVector = prismSpecToVector(target);
      const solution = solveWedgeForPrism(targetVector, frame, PC);

      expect(solution.ok).toBe(true);
      expect(solution.residualPd).toBeLessThanOrEqual(SOLVER_TOLERANCE_PD);

      const achieved = deviationOrThrow(solution.wedge, frame);
      expect(norm({
        horizontal: achieved.horizontal - targetVector.horizontal,
        vertical: achieved.vertical - targetVector.vertical,
      })).toBeLessThanOrEqual(SOLVER_TOLERANCE_PD);
    }
  });

  it('kallistamattomassa kehyksessä ratkaistu kiila tuottaa täsmälleen tavoitteen', () => {
    const target = prismSpecToVector({ magnitude: 2.5, base: 60 });
    const solution = solveWedgeForPrism(target, UNTILTED_FRAME, PC);

    expect(solution.ok).toBe(true);
    const spec = prismVectorToSpec(deviationOrThrow(solution.wedge, UNTILTED_FRAME));
    expect(Math.abs(spec.magnitude - 2.5)).toBeLessThan(SOLVER_TOLERANCE_PD);
    expect(Math.abs(spec.base - 60)).toBeLessThan(0.05);
    // Kallistamattomassa kehyksessä kiilan oma kantasuunta on sama kuin prisman.
    expect(Math.abs(wedgeBaseDeg(solution.wedge) - 60)).toBeLessThan(0.05);
  });

  it('nollan lähellä käytetään lineaarista askelta ilman iteraatiota', () => {
    const target = prismSpecToVector({ magnitude: 0.01, base: 30 });
    const solution = solveWedgeForPrism(target, frameFor('OS', 15, 18), PC);

    expect(solution.ok).toBe(true);
    expect(solution.method).toBe('linear');
    expect(solution.residualPd).toBeLessThanOrEqual(SOLVER_TOLERANCE_PD);
  });

  it('nollatavoite antaa nollakiilan ilman laskentaa', () => {
    const solution = solveWedgeForPrism({ horizontal: 0, vertical: 0 }, UNTILTED_FRAME, PC);

    expect(solution.ok).toBe(true);
    expect(solution.method).toBe('zero');
    expect(wedgeApexAngleDeg(solution.wedge)).toBe(0);
  });

  it('epäkelpo materiaali palauttaa selkeän epäonnistumisen, ei huonointa arvausta', () => {
    // Taitekerroin 1,0 ei taita: mikään kiila ei tuota poikkeutusta. Tämä on ainoa
    // aito mahdottomuus tässä mallissa — prisman SUURUUS ei ole rajoite, koska
    // poikkeutus kasvaa rajatta, kun lähtevä säde lähestyy pinnan sivuamista.
    const solution = solveWedgeForPrism(prismSpecToVector({ magnitude: 2, base: 0 }), UNTILTED_FRAME, 1);

    expect(solution.ok).toBe(false);
    expect(solution.method).toBe('failed');
  });

  it('validoinnin ylin sallittu prisma 20 pd ratkeaa järkevällä kiilakulmalla', () => {
    // validate.ts rajaa reseptin prisman 20 pd:hen, joten tämä on mallin käytännön
    // laita. Kiilakulman on pysyttävä linssimäisenä; jos tämä raja rikkoutuu, malli
    // on karannut alueelle, jossa luvut ovat matematiikkaa eivätkä linssejä.
    const solution = solveWedgeForPrism(
      prismSpecToVector({ magnitude: 20, base: 90 }),
      frameFor('OD', 15, 18),
      PC,
    );

    expect(solution.ok).toBe(true);
    expect(solution.apexAngleDeg).toBeLessThan(25);
  });

  it('kallistus muuttaa tilattavaa kiilaa: sama tavoite eri kehyksissä eri kiila', () => {
    const target = prismSpecToVector({ magnitude: 3, base: 0 });
    const flat = solveWedgeForPrism(target, UNTILTED_FRAME, PC);
    const tilted = solveWedgeForPrism(target, frameFor('OD', 15, 18), PC);

    expect(flat.ok && tilted.ok).toBe(true);
    expect(Math.abs(flat.apexAngleDeg - tilted.apexAngleDeg)).toBeGreaterThan(0.001);
  });
});

describe('prisman käännös koko laskennassa', () => {
  const buildInput = (options: {
    prism?: { magnitude: number; base: number };
    wrapDeg?: number;
    pantoDeg?: number;
    prismModel?: PrismModel;
  }): SolveInput => ({
    eyes: {
      OD: {
        rx: {
          sphere: D(-2),
          cylinder: D(0),
          axis: deg(180),
          ...(options.prism
            ? { prism: { magnitude: pd(options.prism.magnitude), base: deg(options.prism.base) } }
            : {}),
        },
        monoPd: mm(32),
      },
      OS: { rx: { sphere: D(-2), cylinder: D(0), axis: deg(180) }, monoPd: mm(32) },
    },
    frame: {
      pantoscopicTiltDeg: deg(options.pantoDeg ?? 18),
      wrapDeg: deg(options.wrapDeg ?? 15),
      wrapMode: 'perLens',
      anglesMeasured: true,
    },
    material: { index: 1.586, abbe: 30 },
    vertexRefraction: mm(12),
    vertexWorn: mm(12),
    cra: mm(13.5),
    lensType: 'singleVision',
    labProfile: {
      compensatesInternally: false,
      axisStep: deg(1),
      prismStep: pd(0.25),
      cylForm: 'minus',
    },
    flags: {
      baseCurveModel: false,
      ocrMethod: 'exact',
      prismModel: options.prismModel ?? 'wedgeSnell',
    },
  });

  it('tilattava prisma eroaa reseptistä, mutta silmällä toteutuu resepti', () => {
    const outcome = solve(buildInput({ prism: { magnitude: 3, base: 90 } }));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const prism = outcome.od.prism;
    expect(prism.status).toBe('compensated');

    // Toteutuva = resepti: juuri tämä on käännöksen tarkoitus.
    expect(Math.abs((prism.asWorn?.magnitude ?? 0) - 3)).toBeLessThan(0.001);
    expect(Math.abs((prism.asWorn?.base ?? 0) - 90)).toBeLessThan(0.05);

    // Tilattava eroaa reseptistä: jos ei eroaisi, käännös ei tekisi mitään.
    expect(Math.abs((prism.ordered?.magnitude ?? 0) - 3)).toBeGreaterThan(0.005);
  });

  it('ilman kallistusta tilattava on sama kuin resepti', () => {
    const outcome = solve(
      buildInput({ prism: { magnitude: 2, base: 270 }, wrapDeg: 0, pantoDeg: 0 }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const prism = outcome.od.prism;
    expect(Math.abs((prism.ordered?.magnitude ?? 0) - 2)).toBeLessThan(0.001);
    expect(Math.abs((prism.ordered?.base ?? 0) - 270)).toBeLessThan(0.05);
  });

  it('kääntämätön tilaus jättäisi jäännöksen, käännetty ei', () => {
    const outcome = solve(buildInput({ prism: { magnitude: 4, base: 0 } }));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const prism = outcome.od.prism;
    expect(prism.residualPd ?? 1).toBeLessThanOrEqual(0.001);
    expect(prism.residualUncompensatedPd ?? 0).toBeGreaterThan(0.01);
  });

  it('reseptin prisma ilman käännöstä varoittaa ja välittää arvon sellaisenaan', () => {
    const outcome = solve(
      buildInput({ prism: { magnitude: 3, base: 90 }, prismModel: 'passThrough' }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.od.prism.status).toBe('passThrough');
    expect(Math.abs((outcome.od.prism.ordered?.magnitude ?? 0) - 3)).toBeLessThan(1e-9);
    expect(outcome.od.warnings.map((warning) => warning.code)).toContain('prismNotCompensated');
  });

  it('kiilamallilla ei anneta prismNotCompensated-varoitusta', () => {
    const outcome = solve(buildInput({ prism: { magnitude: 3, base: 90 } }));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.od.warnings.map((warning) => warning.code)).not.toContain(
      'prismNotCompensated',
    );
  });

  it('ilman reseptin prismaa tilausriville ei ilmesty prismaa', () => {
    const outcome = solve(buildInput({}));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.od.prism.status).toBe('none');
    expect(outcome.od.exact.prism).toBeUndefined();
    expect(outcome.od.rounded025.prism).toBeUndefined();
  });

  it('kantasuunta säilyy silmäkohtaisessa notaatiossa: kanta ylös pysyy ylhäällä', () => {
    const outcome = solve(buildInput({ prism: { magnitude: 2, base: 90 } }));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const ordered = outcome.od.prism.ordered;
    expect(ordered).toBeDefined();
    if (!ordered) return;
    const components = baseToComponents('OD', {
      magnitude: ordered.magnitude as number,
      base: ordered.base as number,
    });
    expect(components.vertical.direction).toBe('up');
  });
});
