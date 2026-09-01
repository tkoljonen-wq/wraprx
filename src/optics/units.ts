/**
 * Brändätyt yksikkötyypit (suunnitelma §4).
 *
 * Yksikkövirheet (D vs. mm vs. °) ovat tässä domainissa todellinen riski, joten
 * yksiköt erotetaan tyyppitasolla. Brändi on olemassa vain käännösaikana; ajossa
 * arvot ovat tavallisia numeroita.
 *
 * Käyttötapa: brändi pidetään rajapinnoilla (SolveInput, LensPower, tulokset) ja
 * moduulien sisäinen laskenta tehdään paljailla `number`-arvoilla. Aritmetiikka
 * brändätyillä arvoilla tuottaa `number`:in, joten takaisin brändiin pääsee vain
 * eksplisiittisellä konstruktorilla — juuri se pakottaa yksikön miettimään.
 */

declare const brandKey: unique symbol;
type Brand<T, B extends string> = T & { readonly [brandKey]: B };

export type Dioptre = Brand<number, 'Dioptre'>;
export type Degree = Brand<number, 'Degree'>;
export type Millimetre = Brand<number, 'Millimetre'>;
export type PrismDioptre = Brand<number, 'PrismDioptre'>;

/** Dioptria. */
export const D = (value: number): Dioptre => value as Dioptre;
/** Aste. */
export const deg = (value: number): Degree => value as Degree;
/** Millimetri. */
export const mm = (value: number): Millimetre => value as Millimetre;
/** Prismadioptria. */
export const pd = (value: number): PrismDioptre => value as PrismDioptre;

/** Brändätty arvo paljaaksi luvuksi. Vain luettavuuden vuoksi — ajossa nollatyötä. */
export const raw = (value: Dioptre | Degree | Millimetre | PrismDioptre): number => value as number;

export const DEG_PER_RAD = 180 / Math.PI;

export const toRad = (degrees: number): number => degrees / DEG_PER_RAD;
export const toDeg = (radians: number): number => radians * DEG_PER_RAD;

/**
 * Sylinteriakseli välille 0 < axis <= 180 (suunnitelma §9.2).
 * 0° ja 360° kuvautuvat 180°:een, koska akseli on suunnaton meridiaani.
 */
export function normalizeAxis(degrees: number): number {
  const wrapped = ((degrees % 180) + 180) % 180;
  return wrapped === 0 ? 180 : wrapped;
}

/** Prisman kantasuunta välille 0 <= base < 360 (360°-notaatio, ks. format.ts). */
export function normalizeBaseDirection(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/**
 * Kahden akselin pienin ero asteina (0...90). Akselit ovat suunnattomia,
 * joten 179° ja 1° ovat 2° päässä toisistaan.
 */
export function axisDifference(a: number, b: number): number {
  const diff = Math.abs(normalizeAxis(a) - normalizeAxis(b)) % 180;
  return diff > 90 ? 180 - diff : diff;
}

/** Pyöristys annetulle askeleelle (esim. 0,25 D tai 1°). */
export function roundToStep(value: number, step: number): number {
  if (!(step > 0)) return value;
  return Math.round(value / step) * step;
}

/** Poistaa −0:n ja pyöristysroskan esitys- ja vertailutarpeisiin. */
export function tidy(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  const result = Math.round(value * factor) / factor;
  return result === 0 ? 0 : result;
}
