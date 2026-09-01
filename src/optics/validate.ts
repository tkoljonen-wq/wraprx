/**
 * Validointiportti (suunnitelma §1 vaihe 0, §9.2).
 *
 * Portti hylkää sen, mitä ohjelma ei osaa, ja varoittaa siitä, mitä se osaa vain
 * osittain. Tärkein rajaus: VAIN YKSITEHO. Monitehossa kompensointi kuuluu
 * valmistajan freeform-pintalaskentaan, eikä keskiövoimakkuuden korjaaminen ole
 * edes oikea kohta, johon korjaus kuuluisi.
 */
import type { Eye } from './geometry.js';
import type { SolveInput } from './index.js';

export type WarningSeverity = 'info' | 'warning' | 'critical';

export type WarningCode =
  /** Linssitalo kompensoi itse: näitä arvoja EI saa tilata. */
  | 'labCompensatesInternally'
  /** Prismamalli on kytketty pois: prisma välitetään kääntämättä (ks. §3.5). */
  | 'prismNotCompensated'
  /** Prisman käännöksen juurenhaku ei supennut -> tulosta ei saa esittää prismana. */
  | 'prismSolveFailed'
  /** Kulmat ovat nimellisiä (kehysvalmistajan spec), ei kasvoilta mitattuja. */
  | 'anglesNotMeasured'
  /** Kehysmitat puuttuvat -> desentraatiota ja OC-korkeutta ei laskettu. */
  | 'frameDimensionsMissing'
  /** Suuri kallistus: keskiövoimakkuuden kompensointi on välttämätön mutta ei riittävä. */
  | 'largeTilt'
  /** Kompensointi ei tuo hyötyä 0,25 D:n askeleella. */
  | 'compensationNotWorthwhile'
  /** Pystyprismaero silmien välillä ylittää kynnyksen. */
  | 'verticalImbalance'
  /** Poikittainen kromaattinen aberraatio on värireunojen kynnyksellä. */
  | 'highChromaticAberration'
  /** Pintavälit ovat samat: kompensointi ei sisällä pintavälikorjausta. */
  | 'noVertexDifference'
  /** Base curve -malli on päällä (ei oletusarvo). */
  | 'baseCurveModelActive'
  /** Martinin sarjakehitelmä on käytössä exaktin mallin sijaan. */
  | 'martinApproximation'
  /** Toleranssidataa ei ole syötetty, joten verdiktiä ei annettu. */
  | 'toleranceDataMissing';

export interface Warning {
  readonly code: WarningCode;
  readonly severity: WarningSeverity;
  readonly eye?: Eye;
  readonly data?: Readonly<Record<string, number | string | boolean>>;
}

export type IssueCode =
  | 'notSingleVision'
  | 'cylinderNotPlusForm'
  | 'axisOutOfRange'
  | 'powerOutOfRange'
  | 'nonFiniteValue'
  | 'wrapOutOfRange'
  | 'pantoOutOfRange'
  | 'vertexOutOfRange'
  | 'pdOutOfRange'
  | 'craOutOfRange'
  | 'materialOutOfRange'
  | 'frameBoxOutOfRange'
  | 'labProfileInvalid'
  | 'prismInvalid';

export interface ValidationIssue {
  readonly code: IssueCode;
  /** Polku syötteeseen, esim. "eyes.OD.rx.axis". */
  readonly field: string;
  readonly value?: number | string;
  readonly data?: Readonly<Record<string, number | string | boolean>>;
}

export interface ValidationError {
  readonly ok: false;
  readonly kind: 'validationError';
  readonly issues: readonly ValidationIssue[];
}

export interface ValidationOutcome {
  readonly issues: readonly ValidationIssue[];
  readonly warnings: readonly Warning[];
}

const EYES: readonly Eye[] = ['OD', 'OS'];

/** Sallitut rajat. Nämä eivät ole optiikkaa vaan järkevyystarkistuksia. */
const LIMITS = {
  sphere: 30,
  cylinder: 12,
  prism: 20,
  wrapPerLensWarn: 30,
  wrapPerLensMax: 60,
  pantoMin: -20,
  pantoMax: 40,
  pantoWarn: 25,
  vertexMax: 40,
  pdMin: 15,
  pdMax: 45,
  craMin: 8,
  craMax: 20,
  indexMin: 1.4,
  indexMax: 2.2,
  abbeMin: 15,
  abbeMax: 80,
  tauWarn: 25,
} as const;

function finite(value: number): boolean {
  return Number.isFinite(value);
}

export function validateInput(input: SolveInput): ValidationOutcome {
  const issues: ValidationIssue[] = [];
  const warnings: Warning[] = [];

  const check = (ok: boolean, issue: ValidationIssue): void => {
    if (!ok) issues.push(issue);
  };

  // --- Rajaus: vain yksiteho ---------------------------------------------------
  if (input.lensType !== 'singleVision') {
    issues.push({
      code: 'notSingleVision',
      field: 'lensType',
      value: String(input.lensType),
    });
  }

  // --- Silmäkohtaiset arvot ---------------------------------------------------
  for (const eye of EYES) {
    const eyeInput = input.eyes[eye];
    const path = `eyes.${eye}`;
    if (!eyeInput) {
      issues.push({ code: 'nonFiniteValue', field: path });
      continue;
    }
    const { rx } = eyeInput;

    for (const [name, value] of [
      ['sphere', rx.sphere as number],
      ['cylinder', rx.cylinder as number],
      ['axis', rx.axis as number],
    ] as const) {
      check(finite(value), { code: 'nonFiniteValue', field: `${path}.rx.${name}`, value });
    }

    check((rx.cylinder as number) >= 0, {
      code: 'cylinderNotPlusForm',
      field: `${path}.rx.cylinder`,
      value: rx.cylinder as number,
    });
    check((rx.axis as number) > 0 && (rx.axis as number) <= 180, {
      code: 'axisOutOfRange',
      field: `${path}.rx.axis`,
      value: rx.axis as number,
    });
    check(Math.abs(rx.sphere as number) <= LIMITS.sphere, {
      code: 'powerOutOfRange',
      field: `${path}.rx.sphere`,
      value: rx.sphere as number,
      data: { max: LIMITS.sphere },
    });
    check((rx.cylinder as number) <= LIMITS.cylinder, {
      code: 'powerOutOfRange',
      field: `${path}.rx.cylinder`,
      value: rx.cylinder as number,
      data: { max: LIMITS.cylinder },
    });

    if (rx.prism) {
      const magnitude = rx.prism.magnitude as number;
      const base = rx.prism.base as number;
      check(finite(magnitude) && magnitude >= 0 && magnitude <= LIMITS.prism, {
        code: 'prismInvalid',
        field: `${path}.rx.prism.magnitude`,
        value: magnitude,
      });
      check(finite(base), { code: 'prismInvalid', field: `${path}.rx.prism.base`, value: base });
      // Varoitus koskee vain tilannetta, jossa käännös on kytketty pois. P2:n
      // kiilamalli kääntää prisman, eikä silloin ole mistä varoittaa.
      if (magnitude > 0 && input.flags.prismModel === 'passThrough') {
        warnings.push({ code: 'prismNotCompensated', severity: 'warning', eye });
      }
    }

    const monoPd = eyeInput.monoPd as number;
    check(finite(monoPd) && monoPd >= LIMITS.pdMin && monoPd <= LIMITS.pdMax, {
      code: 'pdOutOfRange',
      field: `${path}.monoPd`,
      value: monoPd,
      data: { min: LIMITS.pdMin, max: LIMITS.pdMax },
    });
  }

  // --- Kehyksen kulmat --------------------------------------------------------
  const wrap = input.frame.wrapDeg as number;
  const wrapPerLensValue = input.frame.wrapMode === 'total' ? wrap / 2 : wrap;
  check(finite(wrap) && wrapPerLensValue >= 0 && wrapPerLensValue <= LIMITS.wrapPerLensMax, {
    code: 'wrapOutOfRange',
    field: 'frame.wrapDeg',
    value: wrap,
    data: { perLens: wrapPerLensValue, max: LIMITS.wrapPerLensMax },
  });

  const panto = input.frame.pantoscopicTiltDeg as number;
  check(finite(panto) && panto >= LIMITS.pantoMin && panto <= LIMITS.pantoMax, {
    code: 'pantoOutOfRange',
    field: 'frame.pantoscopicTiltDeg',
    value: panto,
    data: { min: LIMITS.pantoMin, max: LIMITS.pantoMax },
  });

  if (!input.frame.anglesMeasured) {
    warnings.push({ code: 'anglesNotMeasured', severity: 'info' });
  }

  // --- Kehysmitat (valinnaisia; ilman niitä ei desentraatiota) -----------------
  const box = input.frame;
  const hasBox =
    box.boxA !== undefined &&
    box.boxB !== undefined &&
    box.dbl !== undefined &&
    box.fittingHeight !== undefined;
  if (!hasBox) {
    warnings.push({ code: 'frameDimensionsMissing', severity: 'info' });
  } else {
    const boxA = box.boxA as number;
    const boxB = box.boxB as number;
    const dbl = box.dbl as number;
    const fittingHeight = box.fittingHeight as number;
    check(boxA >= 30 && boxA <= 80, {
      code: 'frameBoxOutOfRange',
      field: 'frame.boxA',
      value: boxA,
    });
    check(boxB >= 15 && boxB <= 70, {
      code: 'frameBoxOutOfRange',
      field: 'frame.boxB',
      value: boxB,
    });
    check(dbl >= 8 && dbl <= 30, { code: 'frameBoxOutOfRange', field: 'frame.dbl', value: dbl });
    check(fittingHeight > 0 && fittingHeight <= boxB, {
      code: 'frameBoxOutOfRange',
      field: 'frame.fittingHeight',
      value: fittingHeight,
      data: { boxB },
    });
  }

  // --- Pintavälit, CRA, materiaali --------------------------------------------
  const vertexRefraction = input.vertexRefraction as number;
  const vertexWorn = input.vertexWorn as number;
  check(finite(vertexRefraction) && vertexRefraction >= 0 && vertexRefraction <= LIMITS.vertexMax, {
    code: 'vertexOutOfRange',
    field: 'vertexRefraction',
    value: vertexRefraction,
  });
  check(finite(vertexWorn) && vertexWorn >= 0 && vertexWorn <= LIMITS.vertexMax, {
    code: 'vertexOutOfRange',
    field: 'vertexWorn',
    value: vertexWorn,
  });
  if (vertexRefraction === vertexWorn) {
    warnings.push({ code: 'noVertexDifference', severity: 'info' });
  }

  const cra = input.cra as number;
  check(finite(cra) && cra >= LIMITS.craMin && cra <= LIMITS.craMax, {
    code: 'craOutOfRange',
    field: 'cra',
    value: cra,
  });

  check(
    finite(input.material.index) &&
      input.material.index >= LIMITS.indexMin &&
      input.material.index <= LIMITS.indexMax,
    { code: 'materialOutOfRange', field: 'material.index', value: input.material.index },
  );
  check(
    finite(input.material.abbe) &&
      input.material.abbe >= LIMITS.abbeMin &&
      input.material.abbe <= LIMITS.abbeMax,
    { code: 'materialOutOfRange', field: 'material.abbe', value: input.material.abbe },
  );

  // --- Linssitalon profiili ---------------------------------------------------
  check((input.labProfile.axisStep as number) > 0, {
    code: 'labProfileInvalid',
    field: 'labProfile.axisStep',
    value: input.labProfile.axisStep as number,
  });
  check((input.labProfile.prismStep as number) > 0, {
    code: 'labProfileInvalid',
    field: 'labProfile.prismStep',
    value: input.labProfile.prismStep as number,
  });

  if (input.labProfile.compensatesInternally) {
    // Kriittinen: tilausjärjestelmä ottaa vastaan wrap- ja panto-arvot ja tekee
    // kompensoinnin itse -> tämän ohjelman tuloksia EI saa tilata.
    warnings.push({ code: 'labCompensatesInternally', severity: 'critical' });
  }

  // --- Liput -----------------------------------------------------------------
  if (input.flags.baseCurveModel) {
    warnings.push({ code: 'baseCurveModelActive', severity: 'info' });
  }
  if (input.flags.ocrMethod === 'martin') {
    warnings.push({ code: 'martinApproximation', severity: 'info' });
  }

  return { issues, warnings };
}

/** Ylittääkö kallistus rajan, jolla pelkkä keskiövoimakkuuden korjaus ei enää riitä. */
export function tiltWarningThresholdDeg(): number {
  return LIMITS.tauWarn;
}

export function pantoWarningThresholdDeg(): number {
  return LIMITS.pantoWarn;
}

export function wrapPerLensWarningThresholdDeg(): number {
  return LIMITS.wrapPerLensWarn;
}
