/**
 * Pintavälikorjaus (suunnitelma §3.2).
 *
 * Kaava F' = F / (1 − Δd·F) on epälineaarinen, joten sitä EI saa soveltaa
 * matriisikomponentteihin: se antaisi väärän sylinterin. Korjaus tehdään
 * päämeridiaaneittain ja matriisi kootaan takaisin. Päämeridiaanien suunta ei
 * muutu pintavälin muuttuessa, joten akseli säilyy.
 *
 * Merkkisääntö: Δd = (pintaväli, jolla voimakkuus on nyt) − (pintaväli, jolle
 * halutaan), metreinä. Positiivinen Δd tarkoittaa siis linssin siirtämistä
 * lähemmäs silmää. Tarkistus: −10,00 D 12 mm:llä -> piilolinssiksi (0 mm)
 * Δd = 0,012 ja F' = −10/(1 + 0,12) = −8,93 D.
 */
import { matrixFromSpheroCyl, spheroCylFromMatrix, type PowerMatrix } from './matrix.js';

/** Ylin sallittu |Δd·F|; tätä lähempänä ykköstä kaava räjähtää. */
const SINGULARITY_GUARD = 0.5;

export class VertexRangeError extends Error {
  constructor(public readonly power: number, public readonly deltaMetres: number) {
    super(
      `Pintavälikorjaus ei ole määritelty: voimakkuus ${power} D ja pintavälimuutos ` +
        `${deltaMetres * 1000} mm antavat nimittäjän, joka on liian lähellä nollaa.`,
    );
    this.name = 'VertexRangeError';
  }
}

/** Yhden meridiaanin efektiivinen voimakkuus uudella pintavälillä. */
export function shiftMeridian(power: number, deltaMetres: number): number {
  const product = deltaMetres * power;
  if (Math.abs(product) > SINGULARITY_GUARD) {
    throw new VertexRangeError(power, deltaMetres);
  }
  return power / (1 - product);
}

/**
 * Siirtää voimakkuusmatriisin pintavälistä `fromMm` pintavälille `toMm`.
 * Palauttaa saman matriisin, jos ero on nolla (ei turhaa numeerista kohinaa).
 */
export function shiftVertex(m: PowerMatrix, fromMm: number, toMm: number): PowerMatrix {
  const deltaMetres = (fromMm - toMm) / 1000;
  if (deltaMetres === 0) return m;

  const sc = spheroCylFromMatrix(m);
  const alongAxis = shiftMeridian(sc.sphere, deltaMetres);
  const acrossAxis = shiftMeridian(sc.sphere + sc.cylinder, deltaMetres);

  return matrixFromSpheroCyl({
    sphere: alongAxis,
    cylinder: acrossAxis - alongAxis,
    axis: sc.axis,
  });
}
