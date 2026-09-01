/**
 * Toleranssiarvio kahdella standardilla (suunnitelma §3.6, §9.1 kohta 1).
 *
 * KAKSI ERI STANDARDIA ERI KOHTEILLE:
 *   - ISO 8980-1  koskee irtolinssiä  -> arvioidaan TILATTAVA voimakkuus.
 *   - ISO 21987   koskee kehystettyjä laseja -> arvioidaan KÄYTÖSSÄ TOTEUTUVA.
 * Taulukot ovat erimuotoiset, joten ne pidetään datassa erillisinä standarditunnisteella.
 *
 * TÄMÄ MODUULI EI SISÄLLÄ YHTÄÄN TOLERANSSILUKUA. Luvut kopioidaan standardeista
 * `data/tolerances.json`:iin, ja tyhjä tai osittainen data on NORMAALI TILA, ei virhe:
 * puuttuvan verdikti on 'notAssessed'.
 *
 * Vyöhykkeen (`upTo`) tulkinta ja se, minkä suureen mukaan vyöhyke valitaan, ovat osa
 * dataskeemaa ja ne on tarkistettava standardia vasten dataa täytettäessä. Oletus tässä:
 *   sphere   -> vyöhyke valitaan tavoitteen vahvimman meridiaanin |voimakkuudella|
 *   cylinder -> vyöhyke valitaan |sylinterillä|
 *   axis     -> vyöhyke valitaan |sylinterillä|
 *   prism    -> vyöhyke valitaan |prisman| määrällä
 */
import { axisDifference } from './units.js';
import type { SpheroCyl } from './matrix.js';

export type Verdict = 'within' | 'borderline' | 'outside' | 'notAssessed';

export type StandardId = 'iso8980-1' | 'iso21987';

export interface ToleranceBand {
  /** Vyöhykkeen yläraja mukaan lukien; `null` = ei ylärajaa. */
  readonly upTo: number | null;
  /** Sallittu poikkeama (D, ° tai pd komponentin mukaan). */
  readonly tolerance: number;
}

export interface ToleranceStandard {
  readonly standard: StandardId;
  /** Mistä luvut on kopioitu. Pakollinen käytännössä, jäljitettävyyden takia. */
  readonly source?: string;
  readonly sphere?: readonly ToleranceBand[];
  readonly cylinder?: readonly ToleranceBand[];
  readonly axis?: readonly ToleranceBand[];
  readonly prism?: readonly ToleranceBand[];
}

export interface ToleranceTable {
  readonly standards?: readonly ToleranceStandard[];
  /**
   * "Rajalla"-verdiktin osuus toleranssista (esim. 0,9 = viimeiset 10 %).
   * TÄMÄ ON OHJELMAN OMA ESITYSHEURISTIIKKA, EI STANDARDIN LUKU.
   */
  readonly borderlineFraction?: number;
}

export type ToleranceComponent = 'sphere' | 'cylinder' | 'axis' | 'prism';

export interface ComponentAssessment {
  readonly component: ToleranceComponent;
  readonly deviation: number;
  readonly tolerance: number | null;
  readonly verdict: Verdict;
}

export interface ToleranceAssessment {
  readonly standard: StandardId;
  readonly verdict: Verdict;
  readonly components: readonly ComponentAssessment[];
  /** Syy, jos verdikti on 'notAssessed'. */
  readonly reason?: string;
}

const DEFAULT_BORDERLINE_FRACTION = 0.9;

function findStandard(
  table: ToleranceTable | undefined,
  standard: StandardId,
): ToleranceStandard | undefined {
  return table?.standards?.find((s) => s.standard === standard);
}

function lookupBand(bands: readonly ToleranceBand[] | undefined, key: number): number | null {
  if (!bands || bands.length === 0) return null;
  for (const band of bands) {
    if (band.upTo === null || key <= band.upTo + 1e-9) return band.tolerance;
  }
  return null;
}

function verdictFor(deviation: number, tolerance: number | null, borderlineFraction: number): Verdict {
  if (tolerance === null) return 'notAssessed';
  const magnitude = Math.abs(deviation);
  if (magnitude > tolerance + 1e-9) return 'outside';
  if (magnitude >= tolerance * borderlineFraction - 1e-9) return 'borderline';
  return 'within';
}

/**
 * Verdiktien yhdistäminen: varmaa "ulkona" ei peitetä puuttuvalla datalla, mutta
 * "sisällä" ei myöskään väitetä, jos jokin komponentti jäi arvioimatta.
 */
function combineVerdicts(verdicts: readonly Verdict[]): Verdict {
  if (verdicts.length === 0) return 'notAssessed';
  if (verdicts.includes('outside')) return 'outside';
  if (verdicts.includes('notAssessed')) return 'notAssessed';
  if (verdicts.includes('borderline')) return 'borderline';
  return 'within';
}

/**
 * Arvioi toteutuneen voimakkuuden tavoitetta vasten yhtä standardia käyttäen.
 * Kumpikin voimakkuus annetaan samassa sylinterimuodossa (sisäisesti plus).
 */
export function assessPower(
  table: ToleranceTable | undefined,
  standard: StandardId,
  target: SpheroCyl,
  actual: SpheroCyl,
): ToleranceAssessment {
  const data = findStandard(table, standard);
  if (!data) {
    return {
      standard,
      verdict: 'notAssessed',
      components: [],
      reason: 'toleranssidataa ei syötetty',
    };
  }
  const borderlineFraction = table?.borderlineFraction ?? DEFAULT_BORDERLINE_FRACTION;

  const strongestMeridian = Math.max(
    Math.abs(target.sphere),
    Math.abs(target.sphere + target.cylinder),
  );

  const components: ComponentAssessment[] = [];

  const sphereTolerance = lookupBand(data.sphere, strongestMeridian);
  const sphereDeviation = actual.sphere - target.sphere;
  components.push({
    component: 'sphere',
    deviation: sphereDeviation,
    tolerance: sphereTolerance,
    verdict: verdictFor(sphereDeviation, sphereTolerance, borderlineFraction),
  });

  const cylinderTolerance = lookupBand(data.cylinder, Math.abs(target.cylinder));
  const cylinderDeviation = actual.cylinder - target.cylinder;
  components.push({
    component: 'cylinder',
    deviation: cylinderDeviation,
    tolerance: cylinderTolerance,
    verdict: verdictFor(cylinderDeviation, cylinderTolerance, borderlineFraction),
  });

  // Akselia arvioidaan vain, jos sylinteriä on. Nollasylinterillä akseli on merkityksetön.
  if (Math.abs(target.cylinder) > 1e-9) {
    const axisTolerance = lookupBand(data.axis, Math.abs(target.cylinder));
    const axisDeviation = axisDifference(actual.axis, target.axis);
    components.push({
      component: 'axis',
      deviation: axisDeviation,
      tolerance: axisTolerance,
      verdict: verdictFor(axisDeviation, axisTolerance, borderlineFraction),
    });
  }

  const verdict = combineVerdicts(components.map((c) => c.verdict));
  return {
    standard,
    verdict,
    components,
    ...(verdict === 'notAssessed' ? { reason: 'toleranssidata puuttuu osittain' } : {}),
  };
}

/** Prisman toleranssiarvio samalla logiikalla. */
export function assessPrism(
  table: ToleranceTable | undefined,
  standard: StandardId,
  targetPrism: number,
  actualPrism: number,
): ComponentAssessment {
  const data = findStandard(table, standard);
  const tolerance = lookupBand(data?.prism, Math.abs(targetPrism));
  const deviation = actualPrism - targetPrism;
  return {
    component: 'prism',
    deviation,
    tolerance,
    verdict: verdictFor(deviation, tolerance, table?.borderlineFraction ?? DEFAULT_BORDERLINE_FRACTION),
  };
}

/** Onko standardille dataa lainkaan — käyttöliittymän "ei arvioitu" -viestiin. */
export function hasStandard(table: ToleranceTable | undefined, standard: StandardId): boolean {
  return findStandard(table, standard) !== undefined;
}
