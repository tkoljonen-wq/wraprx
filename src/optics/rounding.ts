/**
 * Kaksi tulostarkkuutta ja pyöristysruudukon haku (suunnitelma §3.6).
 *
 * 0,25 D:n arvo EI ole naiivi komponenttipyöristys: sfäärin, sylinterin ja akselin
 * pyöristäminen toisistaan riippumatta ei minimoi virhettä. Sallitusta ruudukosta
 * haetaan se kombinaatio, joka minimoi dioptrisen etäisyyden (Frobenius) tavoitteesta.
 * Naiivi tulos lasketaan silti erikseen, jotta ero näkyy käyttäjälle.
 */
import {
  dioptricDistance,
  matrixFromSpheroCyl,
  type PowerMatrix,
  type SpheroCyl,
} from './matrix.js';
import { normalizeAxis, normalizeBaseDirection, roundToStep } from './units.js';

export interface RoundingOptions {
  /** Voimakkuusaskel, tyypillisesti 0,25 D. */
  readonly step: number;
  /** Akseliaskel linssitalon profiilista, tyypillisesti 1°. */
  readonly axisStep: number;
  /** Kuinka kauas akselia haetaan naiivista, asteina (§3.6: 1...5°). */
  readonly axisSpanDeg?: number;
  /** Kuinka monta askelta sfääriä ja sylinteriä haetaan naiivin ympäriltä. */
  readonly powerSpanSteps?: number;
}

export interface RoundingResult {
  /** Ruudukkohaun paras kombinaatio. */
  readonly power: SpheroCyl;
  /** Komponenteittain pyöristetty vertailutulos. */
  readonly naive: SpheroCyl;
  readonly distance: number;
  readonly naiveDistance: number;
  /** Tosi, jos ruudukkohaku löysi naiivista poikkeavan ja paremman tuloksen. */
  readonly improvedOverNaive: boolean;
  readonly candidatesEvaluated: number;
}

/** Nollasylinterille akseli normalisoidaan 180°:een, jotta vertailu on yksikäsitteinen. */
function canonical(power: SpheroCyl): SpheroCyl {
  const cylinder = Math.abs(power.cylinder) < 1e-9 ? 0 : power.cylinder;
  return {
    sphere: power.sphere,
    cylinder,
    axis: cylinder === 0 ? 180 : normalizeAxis(power.axis),
  };
}

/** Komponenttipyöristys: sfääri ja sylinteri askeleelle, akseli akseliaskeleelle. */
export function naiveRound(power: SpheroCyl, options: RoundingOptions): SpheroCyl {
  const cylinder = Math.max(0, roundToStep(power.cylinder, options.step));
  return canonical({
    sphere: roundToStep(power.sphere, options.step),
    cylinder,
    axis: roundToStep(normalizeAxis(power.axis), options.axisStep),
  });
}

/**
 * Ruudukkohaku. `target` on tavoitematriisi (tarkka tilattava voimakkuus) ja
 * `exact` sama sfäärisylinterinä. Ehdokkaita on muutamia kymmeniä.
 */
export function bestGridRound(
  target: PowerMatrix,
  exact: SpheroCyl,
  options: RoundingOptions,
): RoundingResult {
  const naive = naiveRound(exact, options);
  const naiveDistance = dioptricDistance(matrixFromSpheroCyl(naive), target);

  const powerSpan = options.powerSpanSteps ?? 1;
  const axisSpan = options.axisSpanDeg ?? 5;
  const axisStep = options.axisStep > 0 ? options.axisStep : 1;
  const axisStepCount = Math.floor(axisSpan / axisStep);

  let best = naive;
  let bestDistance = naiveDistance;
  let candidatesEvaluated = 0;

  for (let sphereIndex = -powerSpan; sphereIndex <= powerSpan; sphereIndex++) {
    const sphere = naive.sphere + sphereIndex * options.step;
    for (let cylinderIndex = -powerSpan; cylinderIndex <= powerSpan; cylinderIndex++) {
      const cylinder = naive.cylinder + cylinderIndex * options.step;
      if (cylinder < -1e-9) continue;
      for (let axisIndex = -axisStepCount; axisIndex <= axisStepCount; axisIndex++) {
        const candidate = canonical({
          sphere,
          cylinder,
          axis: naive.axis + axisIndex * axisStep,
        });
        candidatesEvaluated++;
        const distance = dioptricDistance(matrixFromSpheroCyl(candidate), target);
        // Tasatilanteessa pidetään aiempi (naiivi tulee ensin) — ei turhaa liikettä.
        if (distance < bestDistance - 1e-12) {
          best = candidate;
          bestDistance = distance;
        }
      }
    }
  }

  return {
    power: best,
    naive,
    distance: bestDistance,
    naiveDistance,
    improvedOverNaive:
      bestDistance < naiveDistance - 1e-12 &&
      (best.sphere !== naive.sphere ||
        best.cylinder !== naive.cylinder ||
        best.axis !== naive.axis),
    candidatesEvaluated,
  };
}

/** Prisman pyöristys linssitalon askeleelle; kantasuunta aina 1°:een. */
export function roundPrism(
  prism: { magnitude: number; base: number },
  prismStep: number,
): { magnitude: number; base: number } {
  return {
    magnitude: Math.max(0, roundToStep(prism.magnitude, prismStep > 0 ? prismStep : 0.25)),
    base: normalizeBaseDirection(Math.round(prism.base)),
  };
}
