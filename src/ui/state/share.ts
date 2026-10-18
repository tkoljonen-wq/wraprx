/**
 * Lomakkeen serialisointi jakolinkkiin (URL-hash) ja laitteen muistiin.
 *
 * Puhdas moduuli: ei DOM:ia, ei localStoragea. `store.ts` hoitaa lukemisen ja
 * kirjoittamisen, tämä vain kääntää lomakkeen merkkijonoksi ja takaisin.
 *
 * Tietosuoja (suunnitelma §4 ja §7): linkkiin päätyvät VAIN alla olevan taulukon
 * kentät. Taulukko on sallittujen lista, ei kieltolista — jos lomakkeeseen joskus
 * lisätään vapaa viitekenttä, se ei päädy linkkiin, ellei joku lisää sitä tähän
 * tietoisesti. `test/share.test.ts` valvoo, ettei linkissä ole muita avaimia.
 *
 * Hash luetaan hyökkäyspintana: tuntematon avain ohitetaan, kelpaamaton arvo jää
 * oletukseksi, eikä mitään suoriteta. Numerokenttä saa vain numeromerkkejä, koska
 * kelpaamaton numero kuuluu ytimen validointiportille eikä tänne.
 */
import { FLAGS } from '../flags.js';
import { findMaterial } from './materials.js';
import {
  createDefaultForm,
  EYE_KEYS,
  type EyeForm,
  type EyeKey,
  type FormState,
} from './model.js';

/** Linkin muotoversio. Kasvatetaan, jos avaimien merkitys muuttuu. */
export const SHARE_VERSION = '1';

const EYE_FIELDS: Readonly<Record<keyof EyeForm, string>> = {
  sphere: 's',
  cylinder: 'c',
  axis: 'a',
  monoPd: 'pd',
  prismMagnitude: 'pm',
  prismBase: 'pb',
};

/** Numeromerkit, desimaalipilkku/-piste ja etumerkki. Pituusraja estää roskan. */
const NUMBER_TEXT = /^[0-9+\-.,]{0,12}$/;

interface TextField {
  readonly key: string;
  readonly get: (form: FormState) => string;
  readonly set: (form: FormState, value: string) => FormState;
}

interface ChoiceField {
  readonly key: string;
  readonly get: (form: FormState) => string;
  readonly set: (form: FormState, value: string) => FormState | undefined;
}

function eyeTextFields(): TextField[] {
  return EYE_KEYS.flatMap((eye: EyeKey) =>
    (Object.keys(EYE_FIELDS) as (keyof EyeForm)[]).map((field) => ({
      key: `${eye.toLowerCase()}.${EYE_FIELDS[field]}`,
      get: (form: FormState) => form.eyes[eye][field],
      set: (form: FormState, value: string): FormState => ({
        ...form,
        eyes: { ...form.eyes, [eye]: { ...form.eyes[eye], [field]: value } },
      }),
    })),
  );
}

function frameText(key: string, field: 'panto' | 'wrap' | 'boxA' | 'boxB' | 'dbl' | 'fittingHeight'): TextField {
  return {
    key,
    get: (form) => form.frame[field],
    set: (form, value) => ({ ...form, frame: { ...form.frame, [field]: value } }),
  };
}

function rootText(key: string, field: 'vertexRefraction' | 'vertexWorn' | 'cra'): TextField {
  return { key, get: (form) => form[field], set: (form, value) => ({ ...form, [field]: value }) };
}

function labText(key: string, field: 'axisStep' | 'prismStep'): TextField {
  return {
    key,
    get: (form) => form.lab[field],
    set: (form, value) => ({ ...form, lab: { ...form.lab, [field]: value } }),
  };
}

const TEXT_FIELDS: readonly TextField[] = [
  ...eyeTextFields(),
  frameText('panto', 'panto'),
  frameText('wrap', 'wrap'),
  frameText('A', 'boxA'),
  frameText('B', 'boxB'),
  frameText('dbl', 'dbl'),
  frameText('fh', 'fittingHeight'),
  rootText('vr', 'vertexRefraction'),
  rootText('vw', 'vertexWorn'),
  rootText('cra', 'cra'),
  labText('ls', 'axisStep'),
  labText('lp', 'prismStep'),
];

const bool = (value: string): boolean | undefined =>
  value === '1' ? true : value === '0' ? false : undefined;

const CHOICE_FIELDS: readonly ChoiceField[] = [
  {
    key: 'wm',
    get: (form) => form.frame.wrapMode,
    set: (form, value) =>
      value === 'total' || value === 'perLens'
        ? { ...form, frame: { ...form.frame, wrapMode: value } }
        : undefined,
  },
  {
    key: 'am',
    get: (form) => (form.frame.anglesMeasured ? '1' : '0'),
    set: (form, value) => {
      const parsed = bool(value);
      return parsed === undefined
        ? undefined
        : { ...form, frame: { ...form.frame, anglesMeasured: parsed } };
    },
  },
  {
    key: 'mat',
    get: (form) => form.materialId,
    set: (form, value) => (findMaterial(value) ? { ...form, materialId: value } : undefined),
  },
  {
    key: 'lc',
    get: (form) => (form.lab.compensatesInternally ? '1' : '0'),
    set: (form, value) => {
      const parsed = bool(value);
      return parsed === undefined
        ? undefined
        : { ...form, lab: { ...form.lab, compensatesInternally: parsed } };
    },
  },
  {
    key: 'lf',
    get: (form) => form.lab.cylForm,
    set: (form, value) =>
      value === 'plus' || value === 'minus'
        ? { ...form, lab: { ...form.lab, cylForm: value } }
        : undefined,
  },
  {
    key: 'ocr',
    get: (form) => form.ocrMethod,
    set: (form, value) =>
      value === 'exact' || (value === 'martin' && FLAGS.allowMartinApproximation)
        ? { ...form, ocrMethod: value }
        : undefined,
  },
  {
    key: 'prm',
    get: (form) => form.prismModel,
    set: (form, value) =>
      value === 'wedgeSnell' || (value === 'passThrough' && FLAGS.allowPrismPassThrough)
        ? { ...form, prismModel: value }
        : undefined,
  },
  {
    key: 'bc',
    get: (form) => (form.baseCurveModel ? '1' : '0'),
    set: (form, value) => {
      const parsed = bool(value);
      return parsed === undefined || (parsed && !FLAGS.baseCurveModel)
        ? undefined
        : { ...form, baseCurveModel: parsed };
    },
  },
];

/** Kaikki avaimet, jotka linkissä voi olla. Testi vertaa linkkiä tähän. */
export const SHARE_KEYS: readonly string[] = [
  'v',
  ...TEXT_FIELDS.map((field) => field.key),
  ...CHOICE_FIELDS.map((field) => field.key),
];

/**
 * Lomake -> hash ilman `#`-merkkiä. Tyhjät tekstikentät jätetään pois, jotta linkki
 * pysyy lyhyenä; puuttuva kenttä luetaan takaisin oletuksena (tyhjänä).
 */
export function serializeForm(form: FormState): string {
  const params = new URLSearchParams();
  params.set('v', SHARE_VERSION);
  for (const field of TEXT_FIELDS) {
    const value = field.get(form).trim();
    if (value !== '') params.set(field.key, value);
  }
  for (const field of CHOICE_FIELDS) {
    params.set(field.key, field.get(form));
  }
  return params.toString();
}

/**
 * Hash -> lomake. Palauttaa `undefined`, jos hash ei ole WrapRx-linkki (puuttuva tai
 * tuntematon versio). Muuten lähtee oletuslomakkeesta ja täyttää kelvolliset kentät.
 */
export function parseSharedForm(hash: string): FormState | undefined {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  if (params.get('v') !== SHARE_VERSION) return undefined;

  let form = createDefaultForm();
  for (const field of TEXT_FIELDS) {
    const value = params.get(field.key);
    if (value !== null && NUMBER_TEXT.test(value)) form = field.set(form, value);
  }
  for (const field of CHOICE_FIELDS) {
    const value = params.get(field.key);
    if (value !== null) form = field.set(form, value) ?? form;
  }
  return form;
}
