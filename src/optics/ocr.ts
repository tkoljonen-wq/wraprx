/**
 * Obliikin keskiövoimakkuuden (OCR) kertoimet ja käännös (suunnitelma §3.4).
 *
 * Exakti muoto Coddingtonin yhtälöistä ohuelle linssille:
 *   sin τ' = sin τ / n
 *   k_sag  = (n·cos τ' − cos τ)/(n − 1)
 *   k_tan  = k_sag / cos²τ
 *   k_risti = k_sag / cos τ
 *
 * Kertoimet ovat MULTIPLIKATIIVISIA eteenpäin-suunnassa: kallistetun linssin
 * nimellisvoimakkuus M_linssi tuottaa silmällä voimakkuuden
 *
 *   M_silmä = R(μ) · [[k_tan·M_tt, k_risti·M_ts], [k_risti·M_ts, k_sag·M_ss]] · R(μ)ᵀ
 *
 * missä (t, s) on tangentiaali–sagittaalikanta ja μ tangentiaalimeridiaani.
 * Käännös on sama jako toisin päin: analyyttinen, ei iteraatiota.
 *
 * Ristitermin kerroin k_risti = k_sag/cos τ on geometrisesti sama asia kuin muut
 * kaksi: projektio kutistaa tangentiaalisuunnan tekijällä cos τ, joten voimakkuus
 * skaalautuu tangentiaalisuunnassa 1/cos²τ, ristitermissä 1/cos τ ja
 * sagittaalisuunnassa 1 — kaikki kerrottuna yhteisellä taittotekijällä k_sag.
 *
 * MALLIN RAJAUS: linssitason oma kanta (ê_h, ê_v) samastetaan frontaalitason
 * kantaan (x, y). Näiden välinen kierto on toisen kertaluvun ilmiö kulmissa
 * (≈ β·θ) mutta ei häviävän pieni suurilla kulmilla. Suunnitelman §3.4 määrittelee
 * μ:n frontaalitasossa (atan2(n̂_y, n̂_x)) ja sitä käytetään symmetrisesti
 * molempiin suuntiin; §5.3:n referenssitapaus toistuu tällä valinnalla.
 */
import {
  rotateFromBasis,
  rotateToBasis,
  spheroCylFromMatrix,
  subtractMatrix,
  type PowerMatrix,
  type SpheroCyl,
} from './matrix.js';
import { dioptricDistance } from './matrix.js';
import { toRad } from './units.js';

export type OcrMethod = 'exact' | 'martin';

export interface OcrCoefficients {
  readonly method: OcrMethod;
  readonly tauDeg: number;
  readonly index: number;
  readonly kSag: number;
  readonly kTan: number;
  readonly kCross: number;
}

export class OcrRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OcrRangeError';
  }
}

/**
 * OCR-kertoimet kallistukselle τ ja taitekertoimelle n.
 *
 * `martin` on vertailufunktio (suunnitelma §3.4), jolla tuloksia voi verrata
 * sarjakehitelmää käyttäviin työkaluihin:
 *   k_sag = 1 + sin²τ/(2n),  k_tan = k_sag + tan²τ
 * Ristitermille sarjakehitelmä ei anna arvoa, joten käytetään geometrista
 * keskiarvoa √(k_tan·k_sag), joka yhtyy exaktiin muotoon toiseen kertalukuun asti.
 */
export function ocrCoefficients(tauDeg: number, index: number, method: OcrMethod): OcrCoefficients {
  if (!(index > 1)) {
    throw new OcrRangeError(`Taitekerroin ${index} ei ole kelvollinen (n > 1 vaaditaan).`);
  }
  const tau = toRad(Math.abs(tauDeg));
  if (Math.abs(tauDeg) >= 90) {
    throw new OcrRangeError(`Kallistus ${tauDeg}° on mallin ulkopuolella (|τ| < 90° vaaditaan).`);
  }
  const sinTau = Math.sin(tau);
  const cosTau = Math.cos(tau);

  if (method === 'martin') {
    const kSag = 1 + (sinTau * sinTau) / (2 * index);
    const tanTau = Math.tan(tau);
    const kTan = kSag + tanTau * tanTau;
    return {
      method,
      tauDeg,
      index,
      kSag,
      kTan,
      kCross: Math.sqrt(kSag * kTan),
    };
  }

  const sinTauPrime = sinTau / index;
  const cosTauPrime = Math.sqrt(1 - sinTauPrime * sinTauPrime);
  const kSag = (index * cosTauPrime - cosTau) / (index - 1);
  return {
    method,
    tauDeg,
    index,
    kSag,
    kTan: kSag / (cosTau * cosTau),
    kCross: kSag / cosTau,
  };
}

/**
 * Eteenpäin-malli: mitä kallellaan oleva nimellisvoimakkuus tuottaa silmällä.
 * Tämä on ainoa "totuus", jota vasten kaikki käännökset tarkistetaan (§3.6 kohta 8).
 */
export function forwardTilt(
  lensPower: PowerMatrix,
  coefficients: OcrCoefficients,
  muDeg: number,
): PowerMatrix {
  const r = rotateToBasis(lensPower, muDeg);
  return rotateFromBasis(
    {
      tt: r.tt * coefficients.kTan,
      ss: r.ss * coefficients.kSag,
      ts: r.ts * coefficients.kCross,
    },
    muDeg,
  );
}

/**
 * Käännös: mikä nimellisvoimakkuus pitää tilata, jotta silmällä toteutuu `target`.
 * Analyyttinen käänteisoperaatio forwardTilt:lle.
 */
export function inverseTilt(
  target: PowerMatrix,
  coefficients: OcrCoefficients,
  muDeg: number,
): PowerMatrix {
  const { kTan, kSag, kCross } = coefficients;
  if (!(kTan > 0) || !(kSag > 0) || !(kCross > 0)) {
    throw new OcrRangeError('OCR-kertoimet eivät ole positiivisia; käännös ei ole määritelty.');
  }
  const r = rotateToBasis(target, muDeg);
  return rotateFromBasis(
    {
      tt: r.tt / kTan,
      ss: r.ss / kSag,
      ts: r.ts / kCross,
    },
    muDeg,
  );
}

export interface Residual {
  readonly sphere: number;
  readonly cylinder: number;
  readonly axis: number;
  readonly dioptricDistance: number;
}

/**
 * Residuaali = toteutuva − tavoite, sekä sfäärisylinterinä että yhtenä lukuna.
 * Yksi luku on matriisierotuksen Frobenius-normi (§3.6).
 */
export function residual(target: PowerMatrix, achieved: PowerMatrix): Residual {
  const difference = subtractMatrix(achieved, target);
  const sc: SpheroCyl = spheroCylFromMatrix(difference);
  return {
    sphere: sc.sphere,
    cylinder: sc.cylinder,
    axis: sc.axis,
    dioptricDistance: dioptricDistance(achieved, target),
  };
}
