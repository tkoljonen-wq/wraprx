/**
 * Linssitason geometria (suunnitelma §3.3).
 *
 * Koordinaatisto on sama kuin matrix.ts:ssä: +x tarkastelijan oikea, +y ylös,
 * +z tarkastelijaa kohti. Katselinja suoraan eteen on siis suunta (0, 0, 1)
 * silmästä ulos.
 *
 * Kallistus mallinnetaan kahtena kiertona: ensin wrap pystyakselin ympäri, sitten
 * pantoskooppinen kaltevuus vaaka-akselin ympäri. Kierretyn linssitason ortonormaali
 * kanta on (ê_h, ê_v, n̂):
 *
 *   ê_h = ( cos β,  sin β·sin θ, −sin β·cos θ)   linssitason "vaaka" (datumlinja)
 *   ê_v = ( 0,      cos θ,        sin θ      )   linssitason "pysty"
 *   n̂   = ( sin β, −cos β·sin θ,  cos β·cos θ)   linssitason normaali
 *
 * missä θ = pantoskooppinen kaltevuus ja β = etumerkillinen wrap-kulma:
 * β = −wrap OD:lle ja +wrap OS:lle. Etumerkki seuraa siitä, että kallistus vie
 * linssin temporaalisen reunan taaksepäin, ja OD:n temporaalinen puoli on −x.
 * Tämä etumerkkivalinta on verifioitu §5.3:n referenssitapausta vastaan
 * (ks. test/cases/derivations.md): väärä etumerkki peilaisi akselin kierron.
 *
 * Tästä seuraa suunnitelman §3.3:n muoto:
 *   cos τ = cos(wrap_per_lens)·cos(panto)
 *   μ     = atan2(n̂_y, n̂_x) mod 180°   (tangentiaalimeridiaani)
 */
import { normalizeAxis, toDeg, toRad } from './units.js';

export type Eye = 'OD' | 'OS';

export type Vec3 = readonly [number, number, number];

/** Sivun etumerkki: OD on −x-puolella, OS +x-puolella (tarkastelijan näkymässä). */
export function sideSign(eye: Eye): -1 | 1 {
  return eye === 'OD' ? -1 : 1;
}

export interface FrameAngles {
  /** Wrap per linssi, asteina (ei kokonaisarvo). */
  readonly wrapPerLensDeg: number;
  /** Pantoskooppinen kaltevuus, asteina. */
  readonly pantoDeg: number;
}

/** Kokonais-wrapista per linssi (suunnitelma §2.1: yleisin virhelähde). */
export function wrapPerLens(wrapDeg: number, mode: 'total' | 'perLens'): number {
  return mode === 'total' ? wrapDeg / 2 : wrapDeg;
}

export interface TiltGeometry {
  readonly eye: Eye;
  /** Etumerkillinen wrap-kulma β (asteina). */
  readonly betaDeg: number;
  readonly pantoDeg: number;
  /** Kokonaiskallistus τ = linssin normaalin ja katselinjan välinen kulma. */
  readonly tauDeg: number;
  /** Tangentiaalimeridiaani, 0 < μ <= 180. */
  readonly muDeg: number;
  readonly normal: Vec3;
  readonly eh: Vec3;
  readonly ev: Vec3;
  /** Onko base curve -korjaus mukana (ominaisuuslippu, oletuksena ei). */
  readonly baseCurveApplied: boolean;
  /** Base curve -korjauksen lisäkulmat, vain jos korjaus on mukana. */
  readonly baseCurveExtra?: { readonly betaDeg: number; readonly pantoDeg: number };
}

/**
 * Kierretty linssitaso etumerkillisestä wrapista ja pantosta.
 * `extra` on base curve -korjauksen lisäkulmat; ilman lippua sitä ei anneta,
 * jolloin tulos ei voi riippua base curve -kentästä millään tavalla.
 */
export function tiltGeometry(
  eye: Eye,
  angles: FrameAngles,
  extra?: { betaDeg: number; pantoDeg: number },
): TiltGeometry {
  const betaDeg = sideSign(eye) * angles.wrapPerLensDeg + (extra?.betaDeg ?? 0);
  const pantoDeg = angles.pantoDeg + (extra?.pantoDeg ?? 0);

  const b = toRad(betaDeg);
  const t = toRad(pantoDeg);
  const sinB = Math.sin(b);
  const cosB = Math.cos(b);
  const sinT = Math.sin(t);
  const cosT = Math.cos(t);

  const normal: Vec3 = [sinB, -cosB * sinT, cosB * cosT];
  const eh: Vec3 = [cosB, sinB * sinT, -sinB * cosT];
  const ev: Vec3 = [0, cosT, sinT];

  // cos τ = n̂·ẑ = cos β·cos θ
  const cosTau = Math.min(1, Math.max(-1, normal[2]));
  const tauDeg = toDeg(Math.acos(cosTau));
  const muDeg = normalizeAxis(toDeg(Math.atan2(normal[1], normal[0])));

  return {
    eye,
    betaDeg,
    pantoDeg,
    tauDeg,
    muDeg,
    normal,
    eh,
    ev,
    baseCurveApplied: extra !== undefined,
    ...(extra ? { baseCurveExtra: { betaDeg: extra.betaDeg, pantoDeg: extra.pantoDeg } } : {}),
  };
}

export interface FrameBox {
  /** Boxing-mitta A (linssiaukon leveys), mm. */
  readonly boxA: number;
  /** Boxing-mitta B (linssiaukon korkeus), mm. */
  readonly boxB: number;
  /** Siltamitta DBL, mm. */
  readonly dbl: number;
  /** Sovituskorkeus: pupillin keskikorkeus linssiaukon alareunasta, mm. */
  readonly fittingHeight: number;
}

export interface DecentrationResult {
  /** Vaakadesentraatio kierretyssä linssitasossa. Positiivinen = sisäänpäin. */
  readonly horizontalMm: number;
  /** OC-korkeus linssiaukon alareunasta, mitattuna kierretyssä linssitasossa. */
  readonly ocHeightMm: number;
  /**
   * Katselinjan lävistyspiste linssitason omissa koordinaateissa, boxing-keskiöstä:
   * h kasvaa ê_h:n suuntaan (tarkastelijan oikealle), v kasvaa ê_v:n suuntaan (ylös).
   */
  readonly visualPoint: { readonly h: number; readonly v: number };
  /** Vertailuluvut välitulospaneeliin (§9.1 kohta 4: nyrkkisäännöt vain vertailuna). */
  readonly comparison: {
    /** Boxing-kaava (A + DBL − PD)/2 — pätee vain suoralle kehykselle. */
    readonly boxingHorizontalMm: number;
    /** Boxing-tason OC-korkeus = sovituskorkeus sellaisenaan. */
    readonly boxingOcHeightMm: number;
    /** Nyrkkisääntö "1 mm per 2°" pantoskooppiselle kaltevuudelle. */
    readonly vogelOcHeightMm: number;
    /** Kompensoitu PD = PD / cos(wrap): sama etäisyys mitattuna linssitasossa. */
    readonly compensatedPdMm: number;
    /**
     * Vaihtoehtoinen kriteeri: OC siinä pisteessä, jossa linssin optinen akseli
     * osuu silmän kiertokeskiöön (tästä nyrkkisääntö "1 mm per 2°" on johdettu).
     * Wrap-kehyksessä tämä vaatii usein mahdottoman suuren vaakasiirron, minkä
     * takia ohjelma ei käytä sitä ensisijaisena — mutta luku näytetään.
     */
     readonly opticalAxisOcHeightMm: number;
    readonly opticalAxisHorizontalOffsetMm: number;
  };
}

/**
 * Desentraatio ja OC-korkeus KIERRETYSSÄ LINSSITASOSSA (suunnitelma §3.3).
 *
 * Malli:
 *  - Katselinja lähtee silmän kiertokeskiöstä suoraan eteen (0, 0, 1) ja lävistää
 *    linssitason pisteessä P. Pintaväli on määritelty tälle linjalle, joten P on
 *    rakenteellisesti etäisyydellä (pintaväli + CRA) kiertokeskiöstä.
 *  - Kehyksen etuosa on "nivelletty" sillan keskeltä: linssitaso on kierretty
 *    pystyakselin ympäri sillan keskikohdan kautta. Boxing-mitat A ja DBL mitataan
 *    kehyksen pinnalla, siis linssitasossa.
 *  - Sovituskorkeus tulkitaan pupillin korkeudeksi frontaalitasossa mitattuna
 *    (pupillometri/heijastus), ei valmiiseen linssiin merkittynä pisteenä. Jos
 *    korkeus on merkitty käytössä olevaan demolinssiin, merkki ON jo lävistyspiste
 *    eikä pystykorjausta tarvita — tämä on dokumentoitu oletus, ei fysiikkaa.
 *
 * Vaakasuunta: sillan keskikohtaan pääsee linssitasossa matkalla PD/cos β, joten
 * kompensoitu PD on aina >= mitattu PD. Invariantti: β = 0 -> boxing-kaava.
 *
 * `craMm` (silmän kiertokeskiön etäisyys sarveiskalvosta) ei vaikuta lävistyspisteeseen
 * suoraan eteen katsottaessa — vaakasuora katselinja lävistää tason samassa pisteessä
 * riippumatta siitä, kuinka kaukaa se tulee. CRA:ta tarvitaan vertailulukuun
 * `opticalAxis*`, jossa kriteeri on toinen. Tämä on tarkoituksellinen ero
 * suunnitelman §2.2 kohdan 3 sanamuotoon; ks. docs/OPEN-QUESTIONS.md.
 */
export function decentration(
  geometry: TiltGeometry,
  box: FrameBox,
  monoPdMm: number,
  vertexWornMm: number,
  craMm: number,
): DecentrationResult {
  const s = sideSign(geometry.eye);
  const b = toRad(geometry.betaDeg);
  const t = toRad(geometry.pantoDeg);
  const cosB = Math.cos(b);
  const sinB = Math.sin(b);
  const cosT = Math.cos(t);
  const sinT = Math.sin(t);

  const compensatedPd = monoPdMm / cosB;
  const boxingCentreFromBridge = (box.boxA + box.dbl) / 2;

  // Lävistyspisteen in-plane-vaakakoordinaatti boxing-keskiöstä (etumerkki: s·ê_h).
  const h = s * (compensatedPd - boxingCentreFromBridge);
  // Positiivinen = desentroi sisäänpäin, samaan suuntaan kuin boxing-kaava.
  const horizontalMm = boxingCentreFromBridge - compensatedPd;

  // Pupillin korkeus datumlinjasta frontaaliprojektiossa.
  const yFrontal = box.fittingHeight - box.boxB / 2;
  // (P − BC)_y = h·ê_h,y + v·ê_v,y  ->  ratkaistaan v.
  const v = (yFrontal - h * sinB * sinT) / cosT;
  const ocHeightMm = box.boxB / 2 + v;

  // Vaihtoehtoinen kriteeri: piste, jossa pinnan normaali osuu kiertokeskiöön.
  // Q − P = d·(cos τ·n̂ − ẑ), d = pintaväli + CRA.
  const d = vertexWornMm + craMm;
  const opticalAxisHorizontalOffsetMm = d * sinB * cosT;
  const opticalAxisOcHeightMm = ocHeightMm - d * sinT;

  return {
    horizontalMm,
    ocHeightMm,
    visualPoint: { h, v },
    comparison: {
      boxingHorizontalMm: boxingCentreFromBridge - monoPdMm,
      boxingOcHeightMm: box.fittingHeight,
      vogelOcHeightMm: box.fittingHeight - geometry.pantoDeg / 2,
      compensatedPdMm: compensatedPd,
      opticalAxisOcHeightMm,
      opticalAxisHorizontalOffsetMm,
    },
  };
}

/**
 * Base curve -korjauksen lisäkulmat (suunnitelma §3.3, OMINAISUUSLIPPU).
 *
 * Etupinnan säde r = (1,53 − 1)/BC. Poikkeama h optiselta akselilta kääntää
 * pinnan normaalia kulman asin(h/r) verran, sama pystysuunnassa. Esimerkki
 * suunnitelmasta: BC 8 ds ja 4 mm poikkeama -> noin 3,5°.
 *
 * Vertailupisteeksi on valittu linssiaukon geometrinen keskiö (boxing-keskiö),
 * koska puolivalmisteen etupinnan huippu on siinä. Juuri tämä valinta on se
 * mallin epävarmuus, jonka takia korjaus on lipun takana ja oletuksena pois.
 */
export function baseCurveExtraAngles(
  baseCurveDioptres: number,
  visualPoint: { h: number; v: number },
): { betaDeg: number; pantoDeg: number } {
  if (!(baseCurveDioptres > 0)) return { betaDeg: 0, pantoDeg: 0 };
  const radiusMm = ((1.53 - 1) / baseCurveDioptres) * 1000;
  const clamp = (x: number): number => Math.min(1, Math.max(-1, x / radiusMm));
  return {
    // Piste +x-suunnassa kääntää normaalia +x:ään -> β kasvaa.
    betaDeg: toDeg(Math.asin(clamp(visualPoint.h))),
    // Piste ylöspäin kääntää normaalia ylös -> panto pienenee.
    pantoDeg: -toDeg(Math.asin(clamp(visualPoint.v))),
  };
}
