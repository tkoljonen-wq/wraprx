/**
 * Käyttöliittymän tila (Preact signals, suunnitelma §4).
 *
 * Yksi signaali koko lomakkeelle ja yksi johdettu arvo laskennalle: tulos päivittyy
 * jokaisesta näppäinpainalluksesta, "Laske"-nappia ei ole. `solve` on puhdas funktio,
 * joten johdettu arvo saa laskea sen uudestaan — mitään välimuistia ei tarvita.
 *
 * P3 tuo tähän URL-hash-serialisoinnin ja localStoragen (presetit). Kumpaakaan ei
 * tehdä nyt, koska jakolinkin tietosuojasääntö (§4: viitekenttä ei serialisoidu)
 * on syytä toteuttaa kerralla oikein.
 */
import { computed, signal } from '@preact/signals';
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

export const form = signal<FormState>(createDefaultForm());

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
}
