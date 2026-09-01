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
  /** Prisman käännöksen saa kytkeä pois vertailua varten (ei tilaukseen). */
  readonly allowPrismPassThrough: boolean;
  /** Välitulospaneeli ja laskentajälki näkyvissä. */
  readonly showTrace: boolean;
  /** Desentraatio- ja OC-korkeuspaneeli. */
  readonly showDecentration: boolean;
}

export const FLAGS: UiFlags = {
  baseCurveModel: false,
  allowMartinApproximation: true,
  allowPrismPassThrough: true,
  showTrace: true,
  showDecentration: true,
};
