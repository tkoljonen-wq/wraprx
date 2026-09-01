/**
 * Esitysmuodot: sylinterimuodot, kanta-notaatiot, tekstiulostulo.
 *
 * ============================================================================
 * KANTASUUNNAN KONVENTIO (suunnitelma §9.1 kohta 3 — ei saa olettaa hiljaisesti)
 * ============================================================================
 * 360°-notaatio: kantasuunta mitataan VASTAPÄIVÄÄN vaakasuorasta, kun katsotaan
 * käyttäjää kasvoista päin (tarkastelijan näkymä). 0° on tarkastelijan OIKEALLA
 * kummallakin linssillä — sama nollasuunta kuin TABO-akselijärjestelmässä.
 *
 * Tästä seuraa:
 *   OD (oikea silmä, tarkastelijan vasemmalla):   0° = kanta SISÄÄN (nasaali)
 *                                               180° = kanta ULOS   (temporaali)
 *   OS (vasen silmä, tarkastelijan oikealla):     0° = kanta ULOS   (temporaali)
 *                                               180° = kanta SISÄÄN (nasaali)
 *   Molemmilla:                                  90° = kanta YLÖS
 *                                               270° = kanta ALAS
 *
 * Väärä etumerkki tässä on hiljainen ja tuhoisa virhe, joten muunnos on yhdessä
 * paikassa ja testattu molempiin suuntiin (test/property.test.ts).
 *
 * HUOM: konventio on tarkistettava linssitalon tilausjärjestelmää vasten ennen
 * käyttöä. Jos talo käyttää toista nollasuuntaa, muutos tehdään VAIN tähän
 * tiedostoon.
 * ============================================================================
 */
import type { SpheroCyl } from './matrix.js';
import type { Eye } from './geometry.js';
import { sideSign } from './geometry.js';
import type { PrismSpec } from './prism.js';
import { prismSpecToVector, prismVectorToSpec } from './prism.js';
import { normalizeAxis } from './units.js';
import type { ValidationIssue, Warning } from './validate.js';
import type { Verdict } from './tolerance.js';

export type HorizontalBase = 'in' | 'out';
export type VerticalBase = 'up' | 'down';

export interface BaseComponents {
  readonly horizontal: { readonly direction: HorizontalBase; readonly magnitude: number };
  readonly vertical: { readonly direction: VerticalBase; readonly magnitude: number };
}

/** 360°-notaatio -> in/out/up/down -komponentit. */
export function baseToComponents(eye: Eye, spec: PrismSpec): BaseComponents {
  const vector = prismSpecToVector(spec);
  const s = sideSign(eye);
  // s·horizontal > 0 tarkoittaa temporaalista suuntaa: OS:llä +x on temporaali,
  // OD:llä −x on temporaali.
  const temporal = s * vector.horizontal;
  return {
    horizontal: {
      direction: temporal >= 0 ? 'out' : 'in',
      magnitude: Math.abs(vector.horizontal),
    },
    vertical: {
      direction: vector.vertical >= 0 ? 'up' : 'down',
      magnitude: Math.abs(vector.vertical),
    },
  };
}

/** in/out/up/down -komponentit -> 360°-notaatio. */
export function componentsToBase(eye: Eye, components: BaseComponents): PrismSpec {
  const s = sideSign(eye);
  const temporal = components.horizontal.direction === 'out' ? 1 : -1;
  return prismVectorToSpec({
    horizontal: s * temporal * Math.abs(components.horizontal.magnitude),
    vertical:
      (components.vertical.direction === 'up' ? 1 : -1) * Math.abs(components.vertical.magnitude),
  });
}

/** Plus-sylinterimuoto miinusmuotoon (ja takaisin — sama operaatio). */
export function transpose(power: SpheroCyl): SpheroCyl {
  return {
    sphere: power.sphere + power.cylinder,
    cylinder: -power.cylinder,
    axis: normalizeAxis(power.axis + 90),
  };
}

export function toPlusForm(power: SpheroCyl): SpheroCyl {
  return power.cylinder < 0 ? transpose(power) : power;
}

export function toMinusForm(power: SpheroCyl): SpheroCyl {
  return power.cylinder > 0 ? transpose(power) : power;
}

export interface NumberFormatOptions {
  readonly decimals?: number;
  /** ',' suomalaiseen esitykseen, '.' kopioitavaan tilausriviin. */
  readonly decimalSeparator?: '.' | ',';
  readonly alwaysSign?: boolean;
}

export function formatNumber(value: number, options: NumberFormatOptions = {}): string {
  const decimals = options.decimals ?? 2;
  const separator = options.decimalSeparator ?? ',';
  const rounded = Math.abs(value) < 0.5 / 10 ** decimals ? 0 : value;
  const text = Math.abs(rounded).toFixed(decimals).replace('.', separator);
  const sign = rounded < 0 ? '-' : options.alwaysSign ? '+' : '';
  return `${sign}${text}`;
}

export interface PowerFormatOptions extends NumberFormatOptions {
  readonly cylForm?: 'plus' | 'minus';
  readonly axisDecimals?: number;
}

/** Esim. "-1,00 +0,50 ax 169". Nollasylinterille "-1,00 sph". */
export function formatPower(power: SpheroCyl, options: PowerFormatOptions = {}): string {
  const shaped = options.cylForm === 'minus' ? toMinusForm(power) : toPlusForm(power);
  const sphere = formatNumber(shaped.sphere, { ...options, alwaysSign: true });
  if (Math.abs(shaped.cylinder) < 0.005) return `${sphere} sph`;
  const cylinder = formatNumber(shaped.cylinder, { ...options, alwaysSign: true });
  const axis = Math.round(normalizeAxis(shaped.axis));
  return `${sphere} ${cylinder} ax ${axis}`;
}

/** Esim. "1,50 pd @ 180° (kanta ulos)". Molemmat notaatiot rinnakkain. */
export function formatPrism(eye: Eye, spec: PrismSpec, options: NumberFormatOptions = {}): string {
  if (spec.magnitude < 0.005) return 'ei prismaa';
  const components = baseToComponents(eye, spec);
  const parts: string[] = [];
  if (components.horizontal.magnitude >= 0.005) {
    parts.push(
      `${formatNumber(components.horizontal.magnitude, options)} pd kanta ${
        components.horizontal.direction === 'in' ? 'sisään' : 'ulos'
      }`,
    );
  }
  if (components.vertical.magnitude >= 0.005) {
    parts.push(
      `${formatNumber(components.vertical.magnitude, options)} pd kanta ${
        components.vertical.direction === 'up' ? 'ylös' : 'alas'
      }`,
    );
  }
  const base = `${formatNumber(spec.magnitude, options)} pd @ ${Math.round(spec.base)}°`;
  return parts.length > 0 ? `${base} (${parts.join(', ')})` : base;
}

const VERDICT_TEXT: Record<Verdict, string> = {
  within: 'sisällä',
  borderline: 'rajalla',
  outside: 'ulkona',
  notAssessed: 'ei arvioitu — toleranssidataa ei syötetty',
};

export function describeVerdict(verdict: Verdict): string {
  return VERDICT_TEXT[verdict];
}

const WARNING_TEXT: Record<Warning['code'], string> = {
  labCompensatesInternally:
    'Linssitalo kompensoi itse: ÄLÄ tilaa näitä arvoja, vaan alkuperäinen resepti ja kehysparametrit.',
  prismNotCompensated:
    'Reseptin prismaa ei ole käännetty kallistukselle (vaihe P2); prisma on välitetty sellaisenaan.',
  anglesNotMeasured: 'Kulmat ovat nimellisiä, ei kasvoilta mitattuja — luottamusarvio heikkenee.',
  frameDimensionsMissing:
    'Kehysmitat puuttuvat, joten desentraatiota, OC-korkeutta ja Prentice-prismaa ei laskettu.',
  largeTilt:
    'Suuri kallistus: keskiövoimakkuuden kompensointi on välttämätön mutta ei riittävä. Perifeeristä optimointia tämä ohjelma ei tee.',
  compensationNotWorthwhile:
    'Kompensointi ei tuo hyötyä 0,25 D:n askeleella — tilaa alkuperäinen resepti.',
  verticalImbalance: 'Pystyprismaero silmien välillä ylittää 1,0 pd.',
  highChromaticAberration: 'Poikittainen kromaattinen aberraatio on värireunojen kynnyksellä.',
  noVertexDifference:
    'Refraktion ja käytön pintaväli ovat samat, joten pintavälikorjaus on nolla. Tarkista, onko näin.',
  baseCurveModelActive: 'Base curve -malli on päällä (ei oletusarvo).',
  martinApproximation:
    'Käytössä on Martinin sarjakehitelmä exaktin mallin sijaan — vain vertailua varten.',
  toleranceDataMissing: 'Toleranssidataa ei ole syötetty, joten verdiktiä ei annettu.',
};

/** Varoituksen teksti ilman silmätunnistetta — käyttöliittymä asemoi silmän itse. */
export function warningText(code: Warning['code']): string {
  return WARNING_TEXT[code];
}

export function describeWarning(warning: Warning): string {
  const eye = warning.eye ? `${warning.eye}: ` : '';
  return `${eye}${warningText(warning.code)}`;
}

const ISSUE_TEXT: Record<ValidationIssue['code'], string> = {
  notSingleVision:
    'Vain yksiteholinssit. Monitehossa kompensointi kuuluu valmistajan freeform-pintalaskentaan.',
  cylinderNotPlusForm: 'Sylinteri on annettava plus-muodossa (cylinder >= 0).',
  axisOutOfRange: 'Akselin on oltava välillä 0 < akseli <= 180.',
  powerOutOfRange: 'Voimakkuus on sallitun alueen ulkopuolella.',
  nonFiniteValue: 'Arvo puuttuu tai ei ole luku.',
  wrapOutOfRange: 'Wrap-kulma on sallitun alueen ulkopuolella. Tarkista kokonais/per linssi.',
  pantoOutOfRange: 'Pantoskooppinen kaltevuus on sallitun alueen ulkopuolella.',
  vertexOutOfRange: 'Pintaväli on sallitun alueen ulkopuolella.',
  pdOutOfRange: 'Monokulaarinen PD on sallitun alueen ulkopuolella.',
  craOutOfRange: 'Silmän kiertokeskiön etäisyys on sallitun alueen ulkopuolella.',
  materialOutOfRange: 'Taitekerroin tai Abbe-luku on sallitun alueen ulkopuolella.',
  frameBoxOutOfRange: 'Kehysmitta on sallitun alueen ulkopuolella.',
  labProfileInvalid: 'Linssitalon profiilin askelarvo on virheellinen.',
  prismInvalid: 'Prisman arvo on virheellinen.',
};

/** Validointivirheen teksti ilman kenttäpolkua — käyttöliittymä nimeää kentän itse. */
export function issueText(code: ValidationIssue['code']): string {
  return ISSUE_TEXT[code];
}

export function describeIssue(issue: ValidationIssue): string {
  return `${issue.field}: ${issueText(issue.code)}`;
}
