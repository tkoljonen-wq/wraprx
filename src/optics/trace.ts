/**
 * Laskentajälki (suunnitelma §3.7).
 *
 * Yksi lähde, kolme käyttöä: käyttöliittymän välitulospaneeli, tulostettavan
 * tilauslomakkeen liite ja testien snapshotit. MDR-mielessä tämä antaa
 * jäljitettävyyden ilman erillistä lokitusta.
 *
 * Jäljen arvot pyöristetään yhdeksään desimaaliin, jotta snapshotit ovat vakaita
 * eri ympäristöissä mutta mikään merkitsevä ei katoa.
 */
import { spheroCylFromMatrix, type PowerMatrix, type SpheroCyl } from './matrix.js';
import { tidy } from './units.js';
import type { Eye, Vec3 } from './geometry.js';

export const TRACE_SCHEMA_VERSION = 1;

export type TraceUnit = 'D' | 'deg' | 'mm' | 'pd' | 'ratio' | 'count' | 'none';

export type TraceValue =
  | { readonly kind: 'matrix'; readonly matrix: PowerMatrix; readonly power: SpheroCyl }
  | { readonly kind: 'scalar'; readonly value: number; readonly unit: TraceUnit }
  | { readonly kind: 'vector3'; readonly value: Vec3 }
  | { readonly kind: 'flag'; readonly value: boolean }
  | { readonly kind: 'text'; readonly value: string };

export interface TraceStep {
  /** Koneellinen nimi, pysyvä. Snapshotit ja käyttöliittymä viittaavat tähän. */
  readonly name: string;
  /** Ihmisluettava selite (suomeksi). */
  readonly label: string;
  readonly value: TraceValue;
}

export interface CalcTrace {
  readonly schemaVersion: number;
  readonly eye: Eye;
  readonly steps: readonly TraceStep[];
}

const tidyMatrix = (m: PowerMatrix): PowerMatrix => ({
  xx: tidy(m.xx, 9),
  yy: tidy(m.yy, 9),
  xy: tidy(m.xy, 9),
});

const tidyPower = (p: SpheroCyl): SpheroCyl => ({
  sphere: tidy(p.sphere, 9),
  cylinder: tidy(p.cylinder, 9),
  axis: tidy(p.axis, 9),
});

export class TraceBuilder {
  private readonly steps: TraceStep[] = [];

  constructor(private readonly eye: Eye) {}

  matrix(name: string, label: string, matrix: PowerMatrix): this {
    this.steps.push({
      name,
      label,
      value: {
        kind: 'matrix',
        matrix: tidyMatrix(matrix),
        power: tidyPower(spheroCylFromMatrix(matrix)),
      },
    });
    return this;
  }

  scalar(name: string, label: string, value: number, unit: TraceUnit): this {
    this.steps.push({ name, label, value: { kind: 'scalar', value: tidy(value, 9), unit } });
    return this;
  }

  vector3(name: string, label: string, value: Vec3): this {
    this.steps.push({
      name,
      label,
      value: { kind: 'vector3', value: [tidy(value[0], 9), tidy(value[1], 9), tidy(value[2], 9)] },
    });
    return this;
  }

  flag(name: string, label: string, value: boolean): this {
    this.steps.push({ name, label, value: { kind: 'flag', value } });
    return this;
  }

  text(name: string, label: string, value: string): this {
    this.steps.push({ name, label, value: { kind: 'text', value } });
    return this;
  }

  build(): CalcTrace {
    return { schemaVersion: TRACE_SCHEMA_VERSION, eye: this.eye, steps: [...this.steps] };
  }
}

/** Yhden vaiheen haku nimellä — testeille ja käyttöliittymälle. */
export function traceStep(trace: CalcTrace, name: string): TraceStep | undefined {
  return trace.steps.find((step) => step.name === name);
}

/** Skalaarin arvo nimellä, tai NaN jos vaihetta ei ole tai se ei ole skalaari. */
export function traceScalar(trace: CalcTrace, name: string): number {
  const step = traceStep(trace, name);
  return step && step.value.kind === 'scalar' ? step.value.value : Number.NaN;
}

/** Matriisin arvo nimellä. */
export function traceMatrix(trace: CalcTrace, name: string): PowerMatrix | undefined {
  const step = traceStep(trace, name);
  return step && step.value.kind === 'matrix' ? step.value.matrix : undefined;
}
