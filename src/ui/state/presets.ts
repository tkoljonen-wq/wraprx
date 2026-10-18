/**
 * Presetit: tallennetut kehykset ja linssitaloprofiilit (suunnitelma §4).
 *
 * Puhdas moduuli: `store.ts` lukee ja kirjoittaa localStoragen, tämä vain muokkaa
 * ja tarkistaa tietorakennetta. Tallennettu data luetaan kuin ulkopuolinen syöte,
 * koska localStorage on koko originin yhteinen ja voi sisältää mitä tahansa.
 *
 * Mitä presettiin EI tallenneta:
 * - Sovituskorkeus: se on asiakkaan mitta, ei kehyksen ominaisuus.
 * - "Kulmat mitattu asiakkaalta": presetin kulmat ovat kehyksen nimellisarvot.
 *   Presetin käyttö kytkee ruksin pois, jotta ytimen varoitus mittaamattomista
 *   kulmista näkyy, kunnes optikko vahvistaa mittauksen.
 * - Materiaalit: ne tulevat lähteistetystä `data/materials.json`:ista (§9.1 kohta 2),
 *   eikä käyttäjän omaa taitekerrointa ilman lähdettä hyväksytä.
 */
import type { FormState, LabForm } from './model.js';

export interface FramePresetValues {
  readonly panto: string;
  readonly wrap: string;
  readonly wrapMode: 'total' | 'perLens';
  readonly boxA: string;
  readonly boxB: string;
  readonly dbl: string;
}

export interface FramePreset {
  readonly name: string;
  readonly frame: FramePresetValues;
}

export interface LabPreset {
  readonly name: string;
  readonly lab: LabForm;
}

export interface PresetStore {
  readonly version: 1;
  readonly frames: readonly FramePreset[];
  readonly labs: readonly LabPreset[];
}

export const EMPTY_PRESETS: PresetStore = { version: 1, frames: [], labs: [] };

export const MAX_NAME_LENGTH = 40;

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);
}

export function framePresetFrom(form: FormState, name: string): FramePreset {
  const { panto, wrap, wrapMode, boxA, boxB, dbl } = form.frame;
  return { name: normalizeName(name), frame: { panto, wrap, wrapMode, boxA, boxB, dbl } };
}

export function labPresetFrom(form: FormState, name: string): LabPreset {
  return { name: normalizeName(name), lab: { ...form.lab } };
}

export function applyFramePreset(form: FormState, preset: FramePreset): FormState {
  return { ...form, frame: { ...form.frame, ...preset.frame, anglesMeasured: false } };
}

export function applyLabPreset(form: FormState, preset: LabPreset): FormState {
  return { ...form, lab: { ...preset.lab } };
}

/** Lisää tai korvaa saman nimisen; lista pidetään aakkosjärjestyksessä. */
export function upsert<T extends { readonly name: string }>(list: readonly T[], item: T): T[] {
  const others = list.filter((entry) => entry.name !== item.name);
  return [...others, item].sort((a, b) => a.name.localeCompare(b.name, 'fi'));
}

export function removeByName<T extends { readonly name: string }>(
  list: readonly T[],
  name: string,
): T[] {
  return list.filter((entry) => entry.name !== name);
}

const isString = (value: unknown): value is string => typeof value === 'string';
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function readFramePreset(value: unknown): FramePreset | undefined {
  if (!isRecord(value) || !isString(value.name) || !isRecord(value.frame)) return undefined;
  const frame = value.frame;
  const texts = ['panto', 'wrap', 'boxA', 'boxB', 'dbl'] as const;
  if (!texts.every((key) => isString(frame[key]))) return undefined;
  if (frame.wrapMode !== 'total' && frame.wrapMode !== 'perLens') return undefined;
  const name = normalizeName(value.name);
  if (name === '') return undefined;
  return {
    name,
    frame: {
      panto: frame.panto as string,
      wrap: frame.wrap as string,
      wrapMode: frame.wrapMode,
      boxA: frame.boxA as string,
      boxB: frame.boxB as string,
      dbl: frame.dbl as string,
    },
  };
}

function readLabPreset(value: unknown): LabPreset | undefined {
  if (!isRecord(value) || !isString(value.name) || !isRecord(value.lab)) return undefined;
  const lab = value.lab;
  if (typeof lab.compensatesInternally !== 'boolean') return undefined;
  if (!isString(lab.axisStep) || !isString(lab.prismStep)) return undefined;
  if (lab.cylForm !== 'plus' && lab.cylForm !== 'minus') return undefined;
  const name = normalizeName(value.name);
  if (name === '') return undefined;
  return {
    name,
    lab: {
      compensatesInternally: lab.compensatesInternally,
      axisStep: lab.axisStep,
      prismStep: lab.prismStep,
      cylForm: lab.cylForm,
    },
  };
}

/** JSON-merkkijono -> presetit. Rikkinäinen data ei kaada sovellusta: se ohitetaan. */
export function parsePresets(json: string | null): PresetStore {
  if (json === null) return EMPTY_PRESETS;
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return EMPTY_PRESETS;
  }
  if (!isRecord(data) || data.version !== 1) return EMPTY_PRESETS;
  const frames = Array.isArray(data.frames) ? data.frames : [];
  const labs = Array.isArray(data.labs) ? data.labs : [];
  return {
    version: 1,
    frames: frames.map(readFramePreset).filter((entry) => entry !== undefined),
    labs: labs.map(readLabPreset).filter((entry) => entry !== undefined),
  };
}
