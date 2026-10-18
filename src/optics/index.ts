/**
 * WrapRx-laskentaydin — ainoa julkinen pinta (suunnitelma §9.2).
 *
 * `solve(input)` kääntää laskennan väärinpäin: se kertoo, mitä pitää TILATA, jotta
 * kallellaan oleva linssi tuottaa halutun korjauksen käyttäjän silmällä. Lisäksi se
 * tarkistaa itsensä: jokainen tulos ajetaan takaisin eteenpäin-mallin läpi ja
 * jäännösvirhe raportoidaan kummallekin tarkkuudelle erikseen (§3.6 kohta 8).
 *
 * Ydin on puhdas: ei importteja tämän hakemiston ulkopuolelta, ei DOM:ia, ei
 * tiedostojen lukemista. Toleranssitaulukot annetaan parametrina.
 */
import {
  dioptricDistance,
  matrixFromSpheroCyl,
  spheroCylFromMatrix,
  type SpheroCyl,
} from './matrix.js';
import {
  baseCurveExtraAngles,
  decentration as computeDecentration,
  sideSign,
  tiltGeometry,
  wrapPerLens,
  type DecentrationResult,
  type Eye,
  type FrameBox,
  type TiltGeometry,
} from './geometry.js';
import {
  forwardTilt,
  inverseTilt,
  ocrCoefficients,
  residual as computeResidual,
  type OcrCoefficients,
  type OcrMethod,
  type Residual,
} from './ocr.js';
import {
  UNTILTED_FRAME,
  prenticePrism,
  prismSpecToVector,
  prismVectorToSpec,
  solveWedgeForPrism,
  transverseChromaticAberration,
  wedgeDeviation,
  type LensFrame,
  type PrismSpec,
  type PrismVector,
} from './prism.js';
import { bestGridRound, roundPrism, type RoundingResult } from './rounding.js';
import {
  assessPower,
  type StandardId,
  type ToleranceAssessment,
  type ToleranceTable,
  type Verdict,
} from './tolerance.js';
import { TraceBuilder, type CalcTrace } from './trace.js';
import { D, deg, mm, pd, type Degree, type Dioptre, type Millimetre, type PrismDioptre } from './units.js';
import { shiftVertex } from './vertex.js';
import {
  tiltWarningThresholdDeg,
  validateInput,
  type ValidationError,
  type Warning,
} from './validate.js';

export type { Eye } from './geometry.js';
export type { OcrMethod } from './ocr.js';
export type { Residual } from './ocr.js';
export type { StandardId, ToleranceTable, ToleranceStandard, ToleranceBand, Verdict } from './tolerance.js';
export type { CalcTrace, TraceStep } from './trace.js';
export type { ValidationError, ValidationIssue, Warning, WarningCode } from './validate.js';
export type { Dioptre, Degree, Millimetre, PrismDioptre } from './units.js';

// --- Syöte -------------------------------------------------------------------

export interface PrismSpecInput {
  readonly magnitude: PrismDioptre;
  /** Kantasuunta 360°-notaatiossa (ks. format.ts). */
  readonly base: Degree;
}

export interface LensPower {
  readonly sphere: Dioptre;
  /** Plus-sylinterimuoto, aina. */
  readonly cylinder: Dioptre;
  /** 0 < axis <= 180. */
  readonly axis: Degree;
  readonly prism?: PrismSpecInput;
}

export interface FrameParams {
  readonly pantoscopicTiltDeg: Degree;
  readonly wrapDeg: Degree;
  readonly wrapMode: 'total' | 'perLens';
  readonly anglesMeasured: boolean;
  readonly boxA?: Millimetre;
  readonly boxB?: Millimetre;
  readonly dbl?: Millimetre;
  readonly ed?: Millimetre;
  readonly fittingHeight?: Millimetre;
}

export interface LabProfile {
  /** Jos tosi, tilausjärjestelmä kompensoi itse -> tämän ohjelman tuloksia ei saa tilata. */
  readonly compensatesInternally: boolean;
  readonly axisStep: Degree;
  readonly prismStep: PrismDioptre;
  readonly cylForm: 'plus' | 'minus';
  /** Valinnainen kolmas pyöristysaskel (esim. 0,12 D lasille). Varattu vaiheeseen P4. */
  readonly extraStep?: Dioptre;
}

export interface SolveFlags {
  /** Base curve -malli. Oletuksena EPÄTOSI (§3.3). */
  readonly baseCurveModel: boolean;
  readonly ocrMethod: OcrMethod;
  /**
   * `'wedgeSnell'` = reseptin prisma käännetään kallistetulle linssille kiilamallilla
   * (§3.5, vaihe P2). `'passThrough'` = prisma välitetään sellaisenaan ja siitä
   * varoitetaan; jätetty vertailua varten, ei tilaamista.
   */
  readonly prismModel: PrismModel;
}

export interface EyeInput {
  readonly rx: LensPower;
  readonly monoPd: Millimetre;
  readonly baseCurve?: Dioptre;
}

export interface SolveInput {
  readonly eyes: Record<Eye, EyeInput>;
  readonly frame: FrameParams;
  readonly material: { readonly index: number; readonly abbe: number; readonly name?: string };
  readonly vertexRefraction: Millimetre;
  readonly vertexWorn: Millimetre;
  /** Silmän kiertokeskiön etäisyys sarveiskalvosta, oletus 13,5 mm. */
  readonly cra: Millimetre;
  /** Muut arvot kuin 'singleVision' tuottavat validointivirheen. */
  readonly lensType: 'singleVision';
  readonly labProfile: LabProfile;
  readonly flags: SolveFlags;
  /** Annetaan parametrina, ei lueta tiedostosta. Puuttuva tai osittainen on normaali tila. */
  readonly toleranceData?: ToleranceTable;
}

// --- Tulos -------------------------------------------------------------------

export type PrismModel = 'wedgeSnell' | 'passThrough';

export interface PrismSpecOutput {
  readonly magnitude: PrismDioptre;
  readonly base: Degree;
}

/**
 * Prisman käännös (§3.5).
 *
 * `prescribed` on TAVOITE silmällä. `ordered` on se, mitä linssitalolta tilataan:
 * kiilan poikkeutus kallistamattomana eli focimetrissä mitattava nimellisprisma.
 * `asWorn` on toteutuva silmällä, kun tilattu linssi on kallellaan kehyksessä.
 *
 * `status`:
 *  - `'none'`         reseptissä ei ole prismaa
 *  - `'compensated'`  käännös onnistui
 *  - `'passThrough'`  malli on kytketty pois; prisma välitetään sellaisenaan
 *  - `'failed'`       juurenhaku ei supennut -> lukua EI saa esittää prismana
 */
export interface PrismResult {
  readonly status: 'none' | 'compensated' | 'passThrough' | 'failed';
  readonly prescribed?: PrismSpecOutput;
  readonly ordered?: PrismSpecOutput;
  readonly orderedRounded?: PrismSpecOutput;
  readonly asWorn?: PrismSpecOutput;
  readonly asWornRounded?: PrismSpecOutput;
  /** Mitä silmällä toteutuisi, jos reseptin prisma tilattaisiin sellaisenaan. */
  readonly asWornUncompensated?: PrismSpecOutput;
  /** |toteutuva − resepti|, pd. */
  readonly residualPd?: number;
  readonly residualRoundedPd?: number;
  readonly residualUncompensatedPd?: number;
  readonly apexAngleDeg?: Degree;
  /** Kiilan kannan suunta linssitasossa, asteina. */
  readonly wedgeBaseDeg?: Degree;
  readonly iterations?: number;
  readonly method?: string;
  /** Poikittainen kromaattinen aberraatio P/ν. */
  readonly tca?: PrismDioptre;
}

export interface InducedPrism {
  readonly magnitude: PrismDioptre;
  readonly base: Degree;
  readonly horizontal: PrismDioptre;
  readonly vertical: PrismDioptre;
}

export interface DecentrationOutput {
  /** Vaakadesentraatio kierretyssä linssitasossa; positiivinen = sisäänpäin. */
  readonly horizontal: Millimetre;
  /** OC-korkeus linssiaukon alareunasta, kierretyssä linssitasossa. */
  readonly ocHeight: Millimetre;
  /** Prisma, joka syntyy jos OC jää boxing-keskiöön (kompensoidulla voimakkuudella). */
  readonly inducedPrism: InducedPrism;
  /** Vertailuluvut: boxing-taso, nyrkkisääntö, kompensoitu PD. */
  readonly comparison: DecentrationResult['comparison'];
}

export interface EyeResult {
  readonly eye: Eye;
  readonly exact: LensPower;
  readonly rounded025: LensPower;
  /** Komponenttipyöristys vertailua varten (§3.6). */
  readonly naiveRounded025: LensPower;
  readonly asWorn: {
    readonly exact: LensPower;
    readonly rounded: LensPower;
    readonly uncompensated: LensPower;
  };
  readonly residual: {
    readonly exact: Residual;
    readonly rounded: Residual;
    readonly uncompensated: Residual;
  };
  readonly tolerance: {
    /** ISO 8980-1, tilattava irtolinssi: pyöristyksen ero tarkasta tavoitteesta. */
    readonly ordered: { readonly exact: Verdict; readonly rounded: Verdict };
    /** ISO 21987, kehystetyt lasit: käytössä toteutuvan ero reseptistä. */
    readonly asWorn: { readonly exact: Verdict; readonly rounded: Verdict };
    readonly detail: {
      readonly ordered: { readonly exact: ToleranceAssessment; readonly rounded: ToleranceAssessment };
      readonly asWorn: { readonly exact: ToleranceAssessment; readonly rounded: ToleranceAssessment };
    };
  };
  readonly compensationWorthwhile: boolean;
  /** Prisman käännös (§3.5). `status: 'none'`, jos reseptissä ei ole prismaa. */
  readonly prism: PrismResult;
  /** Null, jos kehysmitat puuttuvat. */
  readonly decentration: DecentrationOutput | null;
  readonly warnings: readonly Warning[];
  readonly trace: CalcTrace;
}

export interface SolveSuccess {
  readonly ok: true;
  readonly od: EyeResult;
  readonly os: EyeResult;
  readonly global: readonly Warning[];
}

export type SolveOutcome = SolveSuccess | ValidationError;

// --- Vakiot ------------------------------------------------------------------

/** 0,25 D:n tuloskortin askel. */
const ROUNDING_STEP = 0.25;
/** Pystyprismaeron varoituskynnys, pd (§3.5). */
const VERTICAL_IMBALANCE_LIMIT = 1.0;
/**
 * TCA:n varoituskynnys, pd. Ohjelman oma esitysheuristiikka: suunnitelman §2.2
 * esimerkki (2 pd polykarbonaatissa -> 0,07 pd) on "jo värireunojen kynnyksellä".
 */
const TCA_WARNING_LIMIT = 0.05;
const WORTHWHILE_EPSILON = 1e-9;

const ORDERED_STANDARD: StandardId = 'iso8980-1';
const AS_WORN_STANDARD: StandardId = 'iso21987';

// --- Apufunktiot -------------------------------------------------------------

function toLensPower(power: SpheroCyl, prism?: { magnitude: number; base: number }): LensPower {
  return {
    sphere: D(power.sphere),
    cylinder: D(power.cylinder),
    axis: deg(power.axis),
    ...(prism ? { prism: { magnitude: pd(prism.magnitude), base: deg(prism.base) } } : {}),
  };
}

function toInducedPrism(vector: PrismVector): InducedPrism {
  const spec = prismVectorToSpec(vector);
  return {
    magnitude: pd(spec.magnitude),
    base: deg(spec.base),
    horizontal: pd(vector.horizontal),
    vertical: pd(vector.vertical),
  };
}

function frameBox(input: SolveInput): FrameBox | null {
  const { boxA, boxB, dbl, fittingHeight } = input.frame;
  if (boxA === undefined || boxB === undefined || dbl === undefined || fittingHeight === undefined) {
    return null;
  }
  return {
    boxA: boxA as number,
    boxB: boxB as number,
    dbl: dbl as number,
    fittingHeight: fittingHeight as number,
  };
}

/**
 * Linssitason geometria ja desentraatio. Base curve -korjaus vaatii tiedon siitä,
 * missä katselinja lävistää linssin, ja lävistyspiste riippuu geometriasta — siksi
 * yksi tarkennuskierros: geometria -> desentraatio -> korjatut kulmat -> desentraatio.
 * Lippu pois päältä: `baseCurve`-kenttää ei lueta lainkaan.
 */
function resolveGeometry(
  input: SolveInput,
  eye: Eye,
  box: FrameBox | null,
): { geometry: TiltGeometry; decentration: DecentrationResult | null } {
  const angles = {
    wrapPerLensDeg: wrapPerLens(input.frame.wrapDeg as number, input.frame.wrapMode),
    pantoDeg: input.frame.pantoscopicTiltDeg as number,
  };
  const vertexWorn = input.vertexWorn as number;
  const cra = input.cra as number;
  const monoPd = input.eyes[eye].monoPd as number;

  const first = tiltGeometry(eye, angles);
  const firstDecentration = box ? computeDecentration(first, box, monoPd, vertexWorn, cra) : null;

  const baseCurve = input.eyes[eye].baseCurve;
  if (!input.flags.baseCurveModel || baseCurve === undefined || !firstDecentration) {
    return { geometry: first, decentration: firstDecentration };
  }

  const extra = baseCurveExtraAngles(baseCurve as number, firstDecentration.visualPoint);
  const refined = tiltGeometry(eye, angles, extra);
  return {
    geometry: refined,
    decentration: computeDecentration(refined, box as FrameBox, monoPd, vertexWorn, cra),
  };
}

/**
 * Prisman käännös yhdelle silmälle (§3.5).
 *
 * Ketju on:
 *   resepti (tavoite silmällä)
 *     -> kiila, jonka poikkeutus KALLISTETUSSA kehyksessä on tavoite
 *     -> saman kiilan poikkeutus KALLISTAMATTOMANA = tilattava nimellisprisma
 *     -> pyöristys linssitalon askeleeseen
 *     -> pyöristetystä nimellisarvosta takaisin kiilaksi ja eteenpäin kallistettuun
 *        kehykseen = mitä pyöristetyllä tilauksella oikeasti toteutuu
 *
 * Vertailukohtana lasketaan myös, mitä toteutuisi, jos reseptin prisma tilattaisiin
 * sellaisenaan ilman käännöstä. Se on prisman puolen "kompensoimaton" luku ja kertoo,
 * paljonko käännös on tässä tapauksessa arvoinen.
 */
interface PrismOutcome {
  readonly result: PrismResult;
  readonly orderedExact?: PrismSpec;
  readonly orderedRounded?: PrismSpec;
  readonly asWornExact?: PrismSpec;
  readonly asWornRounded?: PrismSpec;
  readonly asWornUncompensated?: PrismSpec;
}

const toPrismSpecOutput = (spec: PrismSpec): PrismSpecOutput => ({
  magnitude: pd(spec.magnitude),
  base: deg(spec.base),
});

const prismVectorDistance = (a: PrismVector, b: PrismVector): number =>
  Math.hypot(a.horizontal - b.horizontal, a.vertical - b.vertical);

function resolvePrism(
  input: SolveInput,
  eye: Eye,
  geometry: TiltGeometry,
  rxPrism: PrismSpec | undefined,
  trace: TraceBuilder,
  warnings: Warning[],
): PrismOutcome {
  if (!rxPrism || !(rxPrism.magnitude > 0)) return { result: { status: 'none' } };

  const prescribed = toPrismSpecOutput(rxPrism);
  const step = input.labProfile.prismStep as number;
  const index = input.material.index;
  const target = prismSpecToVector(rxPrism);

  if (input.flags.prismModel === 'passThrough') {
    const rounded = roundPrism(rxPrism, step);
    trace.text('prismModel', 'Prismamalli', 'passThrough (ei käännöstä)');
    return {
      result: {
        status: 'passThrough',
        prescribed,
        ordered: prescribed,
        orderedRounded: toPrismSpecOutput(rounded),
      },
      orderedExact: rxPrism,
      orderedRounded: rounded,
    };
  }

  const frame: LensFrame = { normal: geometry.normal, eh: geometry.eh, ev: geometry.ev };
  const solution = solveWedgeForPrism(target, frame, index);
  const nominal = solution.ok ? wedgeDeviation(solution.wedge, UNTILTED_FRAME, index) : null;

  if (!solution.ok || !nominal) {
    // Selkeä virhe, ei hiljainen huonoin arvaus (§3.5).
    warnings.push({
      code: 'prismSolveFailed',
      severity: 'critical',
      eye,
      data: { residualPd: solution.residualPd, iterations: solution.iterations },
    });
    trace.text('prismSolve', 'Prisman käännös', 'ei supennut');
    return {
      result: {
        status: 'failed',
        prescribed,
        residualPd: solution.residualPd,
        iterations: solution.iterations,
        method: solution.method,
      },
    };
  }

  const orderedExact = prismVectorToSpec(nominal);
  const orderedRounded = roundPrism(orderedExact, step);

  const asWornExactVector = wedgeDeviation(solution.wedge, frame, index);
  const roundedWedge = solveWedgeForPrism(prismSpecToVector(orderedRounded), UNTILTED_FRAME, index);
  const asWornRoundedVector = roundedWedge.ok
    ? wedgeDeviation(roundedWedge.wedge, frame, index)
    : null;

  const uncompensatedWedge = solveWedgeForPrism(target, UNTILTED_FRAME, index);
  const asWornUncompensatedVector = uncompensatedWedge.ok
    ? wedgeDeviation(uncompensatedWedge.wedge, frame, index)
    : null;

  const asWornExact = asWornExactVector ? prismVectorToSpec(asWornExactVector) : undefined;
  const asWornRounded = asWornRoundedVector ? prismVectorToSpec(asWornRoundedVector) : undefined;
  const asWornUncompensated = asWornUncompensatedVector
    ? prismVectorToSpec(asWornUncompensatedVector)
    : undefined;

  trace.scalar('prismPrescribed', 'Reseptin prisma (tavoite silmällä)', rxPrism.magnitude, 'pd');
  trace.scalar('prismPrescribedBase', 'Reseptin kantasuunta', rxPrism.base, 'deg');
  trace.scalar('wedgeApex', 'Kiilakulma', solution.apexAngleDeg, 'deg');
  trace.scalar('wedgeBase', 'Kiilan kanta linssitasossa', solution.baseDeg, 'deg');
  trace.scalar('prismOrdered', 'Tilattava nimellisprisma', orderedExact.magnitude, 'pd');
  trace.scalar('prismOrderedBase', 'Tilattava kantasuunta', orderedExact.base, 'deg');
  trace.scalar('prismIterations', 'Juurenhaun iteraatiot', solution.iterations, 'count');
  trace.scalar('prismResidual', 'Juurenhaun jäännös', solution.residualPd, 'pd');
  trace.text('prismMethod', 'Juurenhaun menetelmä', solution.method);

  return {
    result: {
      status: 'compensated',
      prescribed,
      ordered: toPrismSpecOutput(orderedExact),
      orderedRounded: toPrismSpecOutput(orderedRounded),
      ...(asWornExact ? { asWorn: toPrismSpecOutput(asWornExact) } : {}),
      ...(asWornRounded ? { asWornRounded: toPrismSpecOutput(asWornRounded) } : {}),
      ...(asWornUncompensated
        ? { asWornUncompensated: toPrismSpecOutput(asWornUncompensated) }
        : {}),
      residualPd: solution.residualPd,
      ...(asWornRoundedVector
        ? { residualRoundedPd: prismVectorDistance(asWornRoundedVector, target) }
        : {}),
      ...(asWornUncompensatedVector
        ? { residualUncompensatedPd: prismVectorDistance(asWornUncompensatedVector, target) }
        : {}),
      apexAngleDeg: deg(solution.apexAngleDeg),
      wedgeBaseDeg: deg(solution.baseDeg),
      iterations: solution.iterations,
      method: solution.method,
      tca: pd(transverseChromaticAberration(rxPrism.magnitude, input.material.abbe)),
    },
    orderedExact,
    orderedRounded,
    ...(asWornExact ? { asWornExact } : {}),
    ...(asWornRounded ? { asWornRounded } : {}),
    ...(asWornUncompensated ? { asWornUncompensated } : {}),
  };
}

function solveEye(
  input: SolveInput,
  eye: Eye,
  eyeWarnings: Warning[],
): { result: EyeResult; rxPrismVector: PrismVector } {
  const eyeInput = input.eyes[eye];
  const trace = new TraceBuilder(eye);
  const warnings: Warning[] = [...eyeWarnings];

  const rxPower: SpheroCyl = {
    sphere: eyeInput.rx.sphere as number,
    cylinder: eyeInput.rx.cylinder as number,
    axis: eyeInput.rx.axis as number,
  };
  const rxMatrix = matrixFromSpheroCyl(rxPower);
  trace.matrix('rx', 'Resepti refraktion pintavälillä', rxMatrix);

  // 2. Pintavälikorjaus: resepti käytön pintavälille = laskennan tavoite.
  const targetMatrix = shiftVertex(
    rxMatrix,
    input.vertexRefraction as number,
    input.vertexWorn as number,
  );
  trace.scalar('vertexRefraction', 'Pintaväli, refraktio', input.vertexRefraction as number, 'mm');
  trace.scalar('vertexWorn', 'Pintaväli, käyttö', input.vertexWorn as number, 'mm');
  trace.matrix('target', 'Tavoite käytön pintavälillä', targetMatrix);

  // 3. Linssitason geometria.
  const box = frameBox(input);
  const { geometry, decentration } = resolveGeometry(input, eye, box);
  trace.scalar('wrapPerLens', 'Wrap per linssi', Math.abs(geometry.betaDeg), 'deg');
  trace.scalar('beta', 'Wrap etumerkillisenä (OD negatiivinen)', geometry.betaDeg, 'deg');
  trace.scalar('panto', 'Pantoskooppinen kaltevuus', geometry.pantoDeg, 'deg');
  trace.scalar('tau', 'Kokonaiskallistus τ', geometry.tauDeg, 'deg');
  trace.scalar('mu', 'Tangentiaalimeridiaani μ', geometry.muDeg, 'deg');
  trace.scalar('muLens', 'Tangentiaalimeridiaani linssin kannassa μ_L', geometry.muLensDeg, 'deg');
  trace.vector3('normal', 'Linssitason normaali n̂', geometry.normal);
  trace.flag('baseCurveApplied', 'Base curve -korjaus mukana', geometry.baseCurveApplied);
  if (geometry.baseCurveExtra) {
    trace.scalar('baseCurveExtraBeta', 'Base curve: lisä-β', geometry.baseCurveExtra.betaDeg, 'deg');
    trace.scalar('baseCurveExtraPanto', 'Base curve: lisä-panto', geometry.baseCurveExtra.pantoDeg, 'deg');
  }

  // 4. OCR-kertoimet ja käännös.
  const coefficients: OcrCoefficients = ocrCoefficients(
    geometry.tauDeg,
    input.material.index,
    input.flags.ocrMethod,
  );
  trace.text('ocrMethod', 'OCR-menetelmä', coefficients.method);
  trace.scalar('kSag', 'k_sag', coefficients.kSag, 'ratio');
  trace.scalar('kTan', 'k_tan', coefficients.kTan, 'ratio');
  trace.scalar('kCross', 'k_risti', coefficients.kCross, 'ratio');

  const exactMatrix = inverseTilt(targetMatrix, coefficients, geometry.muDeg, geometry.muLensDeg);
  const exactPower = spheroCylFromMatrix(exactMatrix);
  trace.matrix('orderedExact', 'Tilattava, tarkka', exactMatrix);

  // 5. Pyöristys: ruudukkohaku ja naiivi vertailu.
  const rounding: RoundingResult = bestGridRound(exactMatrix, exactPower, {
    step: ROUNDING_STEP,
    axisStep: input.labProfile.axisStep as number,
  });
  const roundedMatrix = matrixFromSpheroCyl(rounding.power);
  trace.matrix('orderedRounded', 'Tilattava, 0,25 D (ruudukkohaku)', roundedMatrix);
  trace.matrix('orderedNaive', 'Tilattava, 0,25 D (naiivi pyöristys)', matrixFromSpheroCyl(rounding.naive));
  trace.scalar('roundingDistance', 'Ruudukkohaun etäisyys tavoitteesta', rounding.distance, 'D');
  trace.scalar('roundingNaiveDistance', 'Naiivin etäisyys tavoitteesta', rounding.naiveDistance, 'D');
  trace.flag('roundingImproved', 'Ruudukkohaku paransi naiivia', rounding.improvedOverNaive);
  trace.scalar('roundingCandidates', 'Arvioidut ehdokkaat', rounding.candidatesEvaluated, 'count');

  // 6. Takaisinlaskenta: mitä käyttäjä todella saa.
  const { muDeg, muLensDeg } = geometry;
  const asWornExact = forwardTilt(exactMatrix, coefficients, muDeg, muLensDeg);
  const asWornRounded = forwardTilt(roundedMatrix, coefficients, muDeg, muLensDeg);
  const asWornUncompensated = forwardTilt(rxMatrix, coefficients, muDeg, muLensDeg);
  trace.matrix('asWornExact', 'Toteutuva silmällä, tarkka', asWornExact);
  trace.matrix('asWornRounded', 'Toteutuva silmällä, 0,25 D', asWornRounded);
  trace.matrix('asWornUncompensated', 'Toteutuva silmällä, kompensoimaton resepti', asWornUncompensated);

  const residualExact = computeResidual(targetMatrix, asWornExact);
  const residualRounded = computeResidual(targetMatrix, asWornRounded);
  const residualUncompensated = computeResidual(targetMatrix, asWornUncompensated);
  trace.scalar('residualExact', 'Residuaali, tarkka', residualExact.dioptricDistance, 'D');
  trace.scalar('residualRounded', 'Residuaali, 0,25 D', residualRounded.dioptricDistance, 'D');
  trace.scalar(
    'residualUncompensated',
    'Residuaali, kompensoimaton',
    residualUncompensated.dioptricDistance,
    'D',
  );

  // 7. Hyötyarvio (§3.6): jos pyöristetty kompensointi ei voita kompensoimatonta,
  //    turhaa työtä ja väärää varmuuden tunnetta ei saa tuottaa.
  const compensationWorthwhile =
    residualRounded.dioptricDistance < residualUncompensated.dioptricDistance - WORTHWHILE_EPSILON;
  if (!compensationWorthwhile) {
    warnings.push({ code: 'compensationNotWorthwhile', severity: 'warning', eye });
  }

  // 8. Toleranssiverdiktit kahdella standardilla.
  const roundedPowerForAssessment = rounding.power;
  const orderedExactAssessment = assessPower(
    input.toleranceData,
    ORDERED_STANDARD,
    exactPower,
    exactPower,
  );
  const orderedRoundedAssessment = assessPower(
    input.toleranceData,
    ORDERED_STANDARD,
    exactPower,
    roundedPowerForAssessment,
  );
  const targetPower = spheroCylFromMatrix(targetMatrix);
  const asWornExactAssessment = assessPower(
    input.toleranceData,
    AS_WORN_STANDARD,
    targetPower,
    spheroCylFromMatrix(asWornExact),
  );
  const asWornRoundedAssessment = assessPower(
    input.toleranceData,
    AS_WORN_STANDARD,
    targetPower,
    spheroCylFromMatrix(asWornRounded),
  );

  // 9. Kallistusvaroitus.
  if (geometry.tauDeg > tiltWarningThresholdDeg()) {
    warnings.push({
      code: 'largeTilt',
      severity: 'warning',
      eye,
      data: { tauDeg: geometry.tauDeg, limitDeg: tiltWarningThresholdDeg() },
    });
  }

  // 10. Desentraatio, OC-korkeus ja Prentice-prisma kompensoidulla voimakkuudella.
  let decentrationOutput: DecentrationOutput | null = null;
  if (decentration) {
    const induced = prenticePrism(exactMatrix, decentration.visualPoint);
    decentrationOutput = {
      horizontal: mm(decentration.horizontalMm),
      ocHeight: mm(decentration.ocHeightMm),
      inducedPrism: toInducedPrism(induced),
      comparison: decentration.comparison,
    };
    trace.scalar('decentrationHorizontal', 'Desentraatio, kierretty taso', decentration.horizontalMm, 'mm');
    trace.scalar(
      'decentrationBoxing',
      'Desentraatio, boxing-taso (vertailu)',
      decentration.comparison.boxingHorizontalMm,
      'mm',
    );
    trace.scalar('compensatedPd', 'Kompensoitu PD (vertailu)', decentration.comparison.compensatedPdMm, 'mm');
    trace.scalar('ocHeight', 'OC-korkeus, kierretty taso', decentration.ocHeightMm, 'mm');
    trace.scalar(
      'ocHeightBoxing',
      'OC-korkeus, sovituskorkeus sellaisenaan (vertailu)',
      decentration.comparison.boxingOcHeightMm,
      'mm',
    );
    trace.scalar(
      'ocHeightVogel',
      'OC-korkeus, nyrkkisääntö 1 mm / 2° (vertailu)',
      decentration.comparison.vogelOcHeightMm,
      'mm',
    );
    trace.scalar(
      'ocHeightOpticalAxis',
      'OC-korkeus, akseli kiertokeskiöön (vaihtoehtoinen kriteeri)',
      decentration.comparison.opticalAxisOcHeightMm,
      'mm',
    );
    trace.scalar('visualPointH', 'Katselinjan lävistyspiste, h', decentration.visualPoint.h, 'mm');
    trace.scalar('visualPointV', 'Katselinjan lävistyspiste, v', decentration.visualPoint.v, 'mm');
    trace.scalar(
      'inducedPrismMagnitude',
      'Prentice-prisma boxing-keskiössä',
      prismVectorToSpec(induced).magnitude,
      'pd',
    );
  }

  // 11. Prisma (§3.5): reseptin prisma on TAVOITE silmällä. Tilattava on se kiila,
  //     joka kallistetussa kehyksessä tuottaa juuri sen — ja tilausrivillä se
  //     ilmoitetaan kallistamattoman linssin poikkeutuksena, koska juuri sen
  //     linssitalo mittaa focimetrillä.
  const rxPrism = eyeInput.rx.prism
    ? { magnitude: eyeInput.rx.prism.magnitude as number, base: eyeInput.rx.prism.base as number }
    : undefined;

  const prismOutcome = resolvePrism(input, eye, geometry, rxPrism, trace, warnings);
  const orderedPrism = prismOutcome.orderedExact;
  const roundedPrism = prismOutcome.orderedRounded;

  if (rxPrism && rxPrism.magnitude > 0) {
    const tca = transverseChromaticAberration(rxPrism.magnitude, input.material.abbe);
    trace.scalar('tca', 'Poikittainen kromaattinen aberraatio P/ν', tca, 'pd');
    if (tca >= TCA_WARNING_LIMIT) {
      warnings.push({
        code: 'highChromaticAberration',
        severity: 'warning',
        eye,
        data: { tca, abbe: input.material.abbe, prism: rxPrism.magnitude },
      });
    }
  }

  const result: EyeResult = {
    eye,
    exact: toLensPower(exactPower, orderedPrism),
    rounded025: toLensPower(rounding.power, roundedPrism),
    naiveRounded025: toLensPower(rounding.naive, roundedPrism),
    asWorn: {
      exact: toLensPower(spheroCylFromMatrix(asWornExact), prismOutcome.asWornExact),
      rounded: toLensPower(spheroCylFromMatrix(asWornRounded), prismOutcome.asWornRounded),
      uncompensated: toLensPower(
        spheroCylFromMatrix(asWornUncompensated),
        prismOutcome.asWornUncompensated,
      ),
    },
    residual: {
      exact: residualExact,
      rounded: residualRounded,
      uncompensated: residualUncompensated,
    },
    tolerance: {
      ordered: { exact: orderedExactAssessment.verdict, rounded: orderedRoundedAssessment.verdict },
      asWorn: { exact: asWornExactAssessment.verdict, rounded: asWornRoundedAssessment.verdict },
      detail: {
        ordered: { exact: orderedExactAssessment, rounded: orderedRoundedAssessment },
        asWorn: { exact: asWornExactAssessment, rounded: asWornRoundedAssessment },
      },
    },
    compensationWorthwhile,
    prism: prismOutcome.result,
    decentration: decentrationOutput,
    warnings,
    trace: trace.build(),
  };

  return {
    result,
    rxPrismVector: rxPrism ? prismSpecToVector(rxPrism) : { horizontal: 0, vertical: 0 },
  };
}

/**
 * Laskee kompensoidut tilausarvot molemmille silmille.
 * Palauttaa validointivirheen, jos syöte ei kelpaa (esim. moniteho).
 */
export function solve(input: SolveInput): SolveOutcome {
  const validation = validateInput(input);
  if (validation.issues.length > 0) {
    return { ok: false, kind: 'validationError', issues: validation.issues };
  }

  const globalWarnings: Warning[] = validation.warnings.filter((w) => w.eye === undefined);
  const eyeWarnings = (eye: Eye): Warning[] => validation.warnings.filter((w) => w.eye === eye);

  const od = solveEye(input, 'OD', eyeWarnings('OD'));
  const os = solveEye(input, 'OS', eyeWarnings('OS'));

  // Silmien välinen pystyprismaero (§3.5).
  const verticalDifference = Math.abs(od.rxPrismVector.vertical - os.rxPrismVector.vertical);
  if (verticalDifference > VERTICAL_IMBALANCE_LIMIT) {
    globalWarnings.push({
      code: 'verticalImbalance',
      severity: 'warning',
      data: { differencePd: verticalDifference, limitPd: VERTICAL_IMBALANCE_LIMIT },
    });
  }

  const anyNotAssessed = [od.result, os.result].some(
    (r) =>
      r.tolerance.ordered.exact === 'notAssessed' ||
      r.tolerance.ordered.rounded === 'notAssessed' ||
      r.tolerance.asWorn.exact === 'notAssessed' ||
      r.tolerance.asWorn.rounded === 'notAssessed',
  );
  if (anyNotAssessed) {
    globalWarnings.push({ code: 'toleranceDataMissing', severity: 'info' });
  }

  return { ok: true, od: od.result, os: os.result, global: globalWarnings };
}

/** Oletusarvot, jotka eivät ole optiikkaa vaan käyttömukavuutta. */
export const DEFAULTS = {
  cra: mm(13.5),
  vertexRefraction: mm(12),
  vertexWorn: mm(12),
  labProfile: {
    compensatesInternally: false,
    axisStep: deg(1),
    prismStep: pd(0.25),
    cylForm: 'minus' as const,
  },
  flags: {
    baseCurveModel: false,
    ocrMethod: 'exact' as const,
    prismModel: 'wedgeSnell' as const,
  },
} as const;

/** Dioptrinen etäisyys kahden voimakkuuden välillä — käyttöliittymän apuri. */
export function powerDistance(a: SpheroCyl, b: SpheroCyl): number {
  return dioptricDistance(matrixFromSpheroCyl(a), matrixFromSpheroCyl(b));
}

export { sideSign };
