/**
 * Lomakkeen tila ja sen käännös ytimen syötteeksi.
 *
 * Tämä moduuli on tarkoituksella puhdas: ei signaaleja, ei Preactia, ei DOM:ia.
 * Silloin käyttöliittymän syöttöpolku on testattavissa ilman selainta
 * (`test/ui-model.test.ts` ajaa referenssitapauksen tämän kautta).
 *
 * Kentät ovat merkkijonoja, koska käyttäjä kirjoittaa merkkijonoja: "-1,25" on
 * kesken kirjoitettuna "-", "-1", "-1," ... Numeroksi käännetään vasta laskettaessa,
 * ja kelpaamaton arvo menee NaN:ina ytimen validointiportille — sinne, missä
 * virheilmoitukset on jo määritelty. Käyttöliittymä ei tee omaa optiikkavalidointia.
 */
import { toPlusForm } from '../../optics/format.js';
import {
  DEFAULTS,
  type LensPower,
  type OcrMethod,
  type PrismModel,
  type SolveInput,
} from '../../optics/index.js';
import { D, deg, mm, normalizeAxis, pd } from '../../optics/units.js';
import { findMaterial, MATERIALS } from './materials.js';

export type EyeKey = 'OD' | 'OS';
export const EYE_KEYS: readonly EyeKey[] = ['OD', 'OS'];

export interface EyeForm {
  readonly sphere: string;
  readonly cylinder: string;
  readonly axis: string;
  readonly monoPd: string;
  readonly prismMagnitude: string;
  readonly prismBase: string;
}

export interface FrameForm {
  readonly panto: string;
  readonly wrap: string;
  readonly wrapMode: 'total' | 'perLens';
  readonly anglesMeasured: boolean;
  readonly boxA: string;
  readonly boxB: string;
  readonly dbl: string;
  readonly fittingHeight: string;
}

export interface LabForm {
  readonly compensatesInternally: boolean;
  readonly axisStep: string;
  readonly prismStep: string;
  readonly cylForm: 'plus' | 'minus';
}

export interface FormState {
  readonly eyes: Record<EyeKey, EyeForm>;
  readonly frame: FrameForm;
  readonly materialId: string;
  readonly vertexRefraction: string;
  readonly vertexWorn: string;
  readonly cra: string;
  readonly lab: LabForm;
  readonly ocrMethod: OcrMethod;
  readonly prismModel: PrismModel;
  readonly baseCurveModel: boolean;
}

const EMPTY_EYE: EyeForm = {
  sphere: '',
  cylinder: '',
  axis: '',
  monoPd: '',
  prismMagnitude: '',
  prismBase: '',
};

/**
 * Oletukset. Tässä täytetään VAIN ne arvot, jotka ovat ytimen dokumentoituja
 * oletuksia (`DEFAULTS`) tai käyttäjän itsensä valitsemia asetuksia. Reseptiä,
 * kehyskulmia ja kehysmittoja ei arvata — tyhjä kenttä on rehellisempi kuin
 * keksitty luku, joka näyttää mitatulta.
 */
export function createDefaultForm(): FormState {
  return {
    eyes: { OD: EMPTY_EYE, OS: EMPTY_EYE },
    frame: {
      panto: '',
      wrap: '',
      wrapMode: 'perLens',
      anglesMeasured: false,
      boxA: '',
      boxB: '',
      dbl: '',
      fittingHeight: '',
    },
    materialId: MATERIALS[0]?.id ?? '',
    vertexRefraction: formatDefault(DEFAULTS.vertexRefraction),
    vertexWorn: formatDefault(DEFAULTS.vertexWorn),
    cra: formatDefault(DEFAULTS.cra),
    lab: {
      compensatesInternally: DEFAULTS.labProfile.compensatesInternally,
      axisStep: formatDefault(DEFAULTS.labProfile.axisStep),
      prismStep: formatDefault(DEFAULTS.labProfile.prismStep),
      cylForm: DEFAULTS.labProfile.cylForm,
    },
    ocrMethod: DEFAULTS.flags.ocrMethod,
    prismModel: DEFAULTS.flags.prismModel,
    baseCurveModel: DEFAULTS.flags.baseCurveModel,
  };
}

/**
 * Suunnitelman §5.3 referenssitapaus valmiiksi täytettynä. Sama tapaus on
 * `test/cases/internal.json`:issa ja johdettu käsin `derivations.md`:ssä, joten
 * käyttöliittymän luvut voi verrata riippumattomaan johtoon.
 */
export function createExampleForm(): FormState {
  const base = createDefaultForm();
  return {
    ...base,
    eyes: {
      OD: { ...EMPTY_EYE, sphere: '-1,00', cylinder: '+0,50', axis: '175', monoPd: '32' },
      OS: { ...EMPTY_EYE, sphere: '-1,75', cylinder: '+2,00', axis: '170', monoPd: '32' },
    },
    frame: {
      panto: '18',
      wrap: '15',
      wrapMode: 'perLens',
      anglesMeasured: true,
      boxA: '54',
      boxB: '36',
      dbl: '17',
      fittingHeight: '22',
    },
    materialId: findMaterial('polycarbonate') ? 'polycarbonate' : base.materialId,
  };
}

function formatDefault(value: number): string {
  return String(value).replace('.', ',');
}

/**
 * Onko lomake vielä koskematon? Tyhjä kenttä on ytimelle NaN ja tuottaa
 * validointivirheen, mutta avausnäkymässä virhelista olisi vain melua — käyttäjä ei
 * ole vielä yrittänyt mitään. Tämä on esitystä, ei validointia.
 */
export function isPristine(state: FormState): boolean {
  const eyeFields = Object.keys(EMPTY_EYE) as (keyof EyeForm)[];
  const eyesEmpty = EYE_KEYS.every((eye) =>
    eyeFields.every((field) => state.eyes[eye][field].trim() === ''),
  );
  return eyesEmpty && state.frame.panto.trim() === '' && state.frame.wrap.trim() === '';
}

/**
 * "-1,25" -> -1.25. Pilkku ja piste kelpaavat molemmat, koska suomalainen kirjoittaa
 * pilkun ja tilausjärjestelmästä kopioitu arvo tulee pisteellä. Tyhjä tai kelpaamaton
 * arvo on NaN, ei nolla: nolla olisi laillinen voimakkuus ja piilottaisi puuttuvan
 * syötteen.
 */
export function parseDecimal(text: string): number {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '') return Number.NaN;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : Number.NaN;
}

/** Vapaaehtoinen kenttä: tyhjä -> undefined (ei mitattu), kelpaamaton -> NaN (virhe). */
function parseOptional(text: string): number | undefined {
  return text.trim() === '' ? undefined : parseDecimal(text);
}

/**
 * Reseptin voimakkuus lomakkeelta ytimen muotoon.
 *
 * Sylinteri normalisoidaan plusmuotoon `format.ts`:n `toPlusForm`-funktiolla, koska
 * ydin edellyttää plusmuotoa (`cylinderNotPlusForm`). Käyttäjä saa kirjoittaa kummassa
 * muodossa tahansa: transpositio on yksi dokumentoitu operaatio, ei tässä keksitty.
 *
 * Akseli 0 tarkoittaa samaa meridiaania kuin 180 (`units.ts`, `normalizeAxis`), joten
 * se normalisoidaan. Muita alueen ylityksiä ei siivota — ne kuuluvat validointiportille.
 */
function toLensPower(form: EyeForm): LensPower {
  const rawAxis = parseDecimal(form.axis);
  const plus = toPlusForm({
    sphere: parseDecimal(form.sphere),
    cylinder: parseDecimal(form.cylinder),
    axis: rawAxis === 0 ? normalizeAxis(rawAxis) : rawAxis,
  });

  const magnitude = parseOptional(form.prismMagnitude);
  const hasPrism = magnitude !== undefined && !(magnitude === 0);

  return {
    sphere: D(plus.sphere),
    cylinder: D(plus.cylinder),
    axis: deg(plus.axis),
    ...(hasPrism
      ? { prism: { magnitude: pd(magnitude), base: deg(parseOptional(form.prismBase) ?? 0) } }
      : {}),
  };
}

/**
 * Lomake -> `SolveInput`. Palauttaa aina syötteen, myös keskeneräisen: ytimen
 * `validateInput` kertoo mikä puuttuu, eikä käyttöliittymä toista sitä logiikkaa.
 */
export function buildSolveInput(form: FormState): SolveInput {
  const material = findMaterial(form.materialId);
  const box = {
    boxA: parseOptional(form.frame.boxA),
    boxB: parseOptional(form.frame.boxB),
    dbl: parseOptional(form.frame.dbl),
    fittingHeight: parseOptional(form.frame.fittingHeight),
  };

  return {
    eyes: {
      OD: { rx: toLensPower(form.eyes.OD), monoPd: mm(parseDecimal(form.eyes.OD.monoPd)) },
      OS: { rx: toLensPower(form.eyes.OS), monoPd: mm(parseDecimal(form.eyes.OS.monoPd)) },
    },
    frame: {
      pantoscopicTiltDeg: deg(parseDecimal(form.frame.panto)),
      wrapDeg: deg(parseDecimal(form.frame.wrap)),
      wrapMode: form.frame.wrapMode,
      anglesMeasured: form.frame.anglesMeasured,
      ...(box.boxA !== undefined ? { boxA: mm(box.boxA) } : {}),
      ...(box.boxB !== undefined ? { boxB: mm(box.boxB) } : {}),
      ...(box.dbl !== undefined ? { dbl: mm(box.dbl) } : {}),
      ...(box.fittingHeight !== undefined ? { fittingHeight: mm(box.fittingHeight) } : {}),
    },
    material: {
      index: material?.index ?? Number.NaN,
      abbe: material?.abbe ?? Number.NaN,
      ...(material ? { name: material.name } : {}),
    },
    vertexRefraction: mm(parseDecimal(form.vertexRefraction)),
    vertexWorn: mm(parseDecimal(form.vertexWorn)),
    cra: mm(parseDecimal(form.cra)),
    lensType: 'singleVision',
    labProfile: {
      compensatesInternally: form.lab.compensatesInternally,
      axisStep: deg(parseDecimal(form.lab.axisStep)),
      prismStep: pd(parseDecimal(form.lab.prismStep)),
      cylForm: form.lab.cylForm,
    },
    flags: {
      baseCurveModel: form.baseCurveModel,
      ocrMethod: form.ocrMethod,
      prismModel: form.prismModel,
    },
  };
}
