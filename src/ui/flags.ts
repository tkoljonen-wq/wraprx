/**
 * Ominaisuusliput (suunnitelma §4).
 *
 * Liput ovat käyttöliittymän tasolla, eivät ytimessä: `src/optics/` saa liput
 * parametrina (`SolveFlags`). Oletukset ovat konservatiiviset — mikään keskeneräinen
 * malli ei ole päällä ilman että käyttäjä kytkee sen itse.
 */

export interface UiFlags {
  /**
   * Base curve -malli. Oletuksena EPÄTOSI (§3.3): korjauksen vertailupiste on
   * epävarma, ks. docs/OPEN-QUESTIONS.md kohta 4.
   */
  readonly baseCurveModel: boolean;
  /** Martinin sarjakehitelmän saa valita vertailua varten (ei tilaukseen). */
  readonly allowMartinApproximation: boolean;
  /** Välitulospaneeli ja laskentajälki näkyvissä. */
  readonly showTrace: boolean;
  /** Desentraatio- ja OC-korkeuspaneeli. Täysi prismalaskenta on P2. */
  readonly showDecentration: boolean;
}

export const FLAGS: UiFlags = {
  baseCurveModel: false,
  allowMartinApproximation: true,
  showTrace: true,
  showDecentration: true,
};
