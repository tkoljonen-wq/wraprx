/**
 * Käyttöliittymän tila (Preact signals, suunnitelma §4).
 *
 * Yksi signaali koko lomakkeelle ja yksi johdettu arvo laskennalle: tulos päivittyy
 * jokaisesta näppäinpainalluksesta, "Laske"-nappia ei ole. `solve` on puhdas funktio,
 * joten johdettu arvo saa laskea sen uudestaan — mitään välimuistia ei tarvita.
 *
 * Tallennus (P3): viimeisin lomake ja presetit säilyvät localStoragessa vain tällä
 * laitteella. Avaimilla on etuliite `wraprx-`, koska kaikki GitHub Pages -sovellukset
 * jakavat saman originin ja siten saman localStoragen. Muiden sovellusten avaimiin
 * ei kosketa. Jakolinkki (#-osa) ohittaa tallennetun lomakkeen ja poistetaan
 * osoiteriviltä heti luennan jälkeen, jotta jatkomuokkaus ei näytä jaetulta.
 */
import { computed, effect, signal } from '@preact/signals';
import { solve, type SolveOutcome } from '../../optics/index.js';
import {
  buildSolveInput,
  createDefaultForm,
  createExampleForm,
  type EyeForm,
  type EyeKey,
  type FormState,
  type FrameForm,
  type LabForm,
} from './model.js';

import {
  applyFramePreset,
  applyLabPreset,
  framePresetFrom,
  labPresetFrom,
  normalizeName,
  parsePresets,
  removeByName,
  upsert,
  type PresetStore,
} from './presets.js';
import { parseSharedForm, serializeForm } from './share.js';

const STORAGE_FORM = 'wraprx-form';
const STORAGE_PRESETS = 'wraprx-presets';

/** localStorage voi puuttua tai heittää (yksityinen tila, estetty data): ei kaadeta. */
function readStorage(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Tallennus on mukavuus, ei edellytys: laskenta toimii ilmankin.
  }
}

/** Avattiinko sovellus jakolinkistä? Näytetään käyttäjälle, mistä luvut tulivat. */
export const openedFromLink = signal(false);

function initialForm(): FormState {
  if (typeof location !== 'undefined' && location.hash.length > 1) {
    const shared = parseSharedForm(location.hash);
    history.replaceState(null, '', location.pathname + location.search);
    if (shared) {
      openedFromLink.value = true;
      return shared;
    }
  }
  const stored = readStorage(STORAGE_FORM);
  return (stored !== null ? parseSharedForm(stored) : undefined) ?? createDefaultForm();
}

export const form = signal<FormState>(initialForm());

effect(() => {
  writeStorage(STORAGE_FORM, serializeForm(form.value));
});

export const presets = signal<PresetStore>(parsePresets(readStorage(STORAGE_PRESETS)));

function setPresets(next: PresetStore): void {
  presets.value = next;
  writeStorage(STORAGE_PRESETS, JSON.stringify(next));
}

export function saveFramePreset(name: string): void {
  if (normalizeName(name) === '') return;
  const current = presets.value;
  setPresets({ ...current, frames: upsert(current.frames, framePresetFrom(form.value, name)) });
}

export function saveLabPreset(name: string): void {
  if (normalizeName(name) === '') return;
  const current = presets.value;
  setPresets({ ...current, labs: upsert(current.labs, labPresetFrom(form.value, name)) });
}

export function useFramePreset(name: string): void {
  const preset = presets.value.frames.find((entry) => entry.name === name);
  if (preset) form.value = applyFramePreset(form.value, preset);
}

export function useLabPreset(name: string): void {
  const preset = presets.value.labs.find((entry) => entry.name === name);
  if (preset) form.value = applyLabPreset(form.value, preset);
}

export function deleteFramePreset(name: string): void {
  const current = presets.value;
  setPresets({ ...current, frames: removeByName(current.frames, name) });
}

export function deleteLabPreset(name: string): void {
  const current = presets.value;
  setPresets({ ...current, labs: removeByName(current.labs, name) });
}

/** Jakolinkki nykyiseen laskentaan. Data on #-osassa, joka ei lähde palvelimelle. */
export function shareUrl(): string {
  return `${location.origin}${location.pathname}#${serializeForm(form.value)}`;
}

export const solveOutcome = computed<SolveOutcome>(() => solve(buildSolveInput(form.value)));

export function setEyeField(eye: EyeKey, field: keyof EyeForm, value: string): void {
  const current = form.value;
  form.value = {
    ...current,
    eyes: { ...current.eyes, [eye]: { ...current.eyes[eye], [field]: value } },
  };
}

export function setFrameField<K extends keyof FrameForm>(field: K, value: FrameForm[K]): void {
  form.value = { ...form.value, frame: { ...form.value.frame, [field]: value } };
}

export function setLabField<K extends keyof LabForm>(field: K, value: LabForm[K]): void {
  form.value = { ...form.value, lab: { ...form.value.lab, [field]: value } };
}

export function setField<K extends keyof FormState>(field: K, value: FormState[K]): void {
  form.value = { ...form.value, [field]: value };
}

export function loadExample(): void {
  form.value = createExampleForm();
}

export function clearForm(): void {
  form.value = createDefaultForm();
  openedFromLink.value = false;
}
