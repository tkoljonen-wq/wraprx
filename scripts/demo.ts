/**
 * Pikatarkastus komentoriviltä: `npm run demo`.
 *
 * Tulostaa suunnitelman §5.3 tapauksen tuloksen ja laskentajäljen. Tämä on
 * kehittäjän työkalu, ei osa tuotantopolkua.
 */
import { solve, type SolveInput } from '../src/optics/index.js';
import { formatPower, formatPrism, describeWarning } from '../src/optics/format.js';
import { D, deg, mm, pd } from '../src/optics/units.js';

const input: SolveInput = {
  eyes: {
    OD: { rx: { sphere: D(-1), cylinder: D(0.5), axis: deg(175) }, monoPd: mm(31.5) },
    OS: { rx: { sphere: D(-1.75), cylinder: D(2), axis: deg(170) }, monoPd: mm(32.5) },
  },
  frame: {
    pantoscopicTiltDeg: deg(18),
    wrapDeg: deg(15),
    wrapMode: 'perLens',
    anglesMeasured: true,
    boxA: mm(54),
    boxB: mm(36),
    dbl: mm(17),
    fittingHeight: mm(22),
  },
  material: { index: 1.586, abbe: 30, name: 'Polykarbonaatti' },
  vertexRefraction: mm(12),
  vertexWorn: mm(12),
  cra: mm(13.5),
  lensType: 'singleVision',
  labProfile: {
    compensatesInternally: false,
    axisStep: deg(1),
    prismStep: pd(0.25),
    cylForm: 'minus',
  },
  flags: { baseCurveModel: false, ocrMethod: 'exact' },
};

const outcome = solve(input);
if (!outcome.ok) {
  console.error('Validointivirhe:', outcome.issues);
  process.exit(1);
}

for (const result of [outcome.od, outcome.os]) {
  console.log(`\n=== ${result.eye} ===`);
  console.log(`tilattava tarkka   : ${formatPower(result.exact, { decimals: 4 })}`);
  console.log(`tilattava 0,25 D   : ${formatPower(result.rounded025)}`);
  console.log(`  naiivi vertailu  : ${formatPower(result.naiveRounded025)}`);
  console.log(`  miinusmuodossa   : ${formatPower(result.rounded025, { cylForm: 'minus' })}`);
  console.log(`toteutuva (tarkka) : ${formatPower(result.asWorn.exact, { decimals: 4 })}`);
  console.log(`toteutuva (0,25 D) : ${formatPower(result.asWorn.rounded, { decimals: 4 })}`);
  console.log(`kompensoimaton     : ${formatPower(result.asWorn.uncompensated, { decimals: 4 })}`);
  console.log(
    `residuaali         : tarkka ${result.residual.exact.dioptricDistance.toFixed(4)} | ` +
      `0,25 D ${result.residual.rounded.dioptricDistance.toFixed(4)} | ` +
      `kompensoimaton ${result.residual.uncompensated.dioptricDistance.toFixed(4)}`,
  );
  console.log(`hyötyarvio         : ${result.compensationWorthwhile ? 'kannattaa' : 'EI KANNATA'}`);
  console.log(
    `toleranssi         : tilattava ${result.tolerance.ordered.rounded} | ` +
      `käytössä ${result.tolerance.asWorn.rounded}`,
  );
  if (result.decentration) {
    console.log(
      `desentraatio       : ${(result.decentration.horizontal as number).toFixed(2)} mm ` +
        `(boxing ${result.decentration.comparison.boxingHorizontalMm.toFixed(2)} mm)`,
    );
    console.log(
      `OC-korkeus         : ${(result.decentration.ocHeight as number).toFixed(2)} mm ` +
        `(sovituskorkeus ${result.decentration.comparison.boxingOcHeightMm.toFixed(2)}, ` +
        `nyrkkisääntö ${result.decentration.comparison.vogelOcHeightMm.toFixed(2)})`,
    );
    console.log(
      `Prentice boxing-keskiössä: ${formatPrism(result.eye, {
        magnitude: result.decentration.inducedPrism.magnitude as number,
        base: result.decentration.inducedPrism.base as number,
      })}`,
    );
  }
  for (const warning of result.warnings) console.log(`  ! ${describeWarning(warning)}`);
}

console.log('\n=== yleiset varoitukset ===');
for (const warning of outcome.global) console.log(`  ! ${describeWarning(warning)}`);

console.log('\n=== OD laskentajälki ===');
for (const step of outcome.od.trace.steps) {
  const value =
    step.value.kind === 'matrix'
      ? `${formatPower(step.value.power, { decimals: 4 })}`
      : step.value.kind === 'scalar'
        ? `${step.value.value.toFixed(4)} ${step.value.unit}`
        : step.value.kind === 'vector3'
          ? `(${step.value.value.map((v) => v.toFixed(4)).join(', ')})`
          : String(step.value.value);
  console.log(`  ${step.name.padEnd(24)} ${step.label.padEnd(52)} ${value}`);
}
