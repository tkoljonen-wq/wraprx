/**
 * Desentraatio ja OC-korkeus.
 *
 * Ensisijainen luku on `ocHeight`: katselinjan lävistyspiste kierretyssä
 * linssitasossa. Kriteeri on päätetty 1.9.2026 (docs/OPEN-QUESTIONS.md kohta 1) ja
 * vaihtoehdot näkyvät vertailulukuina — nyrkkisääntö ja optinen akseli kiertokeskiöön
 * ovat tarkistusta varten, eivät tilattavia arvoja.
 */
import { formatNumber, formatPrism } from '../../optics/format.js';
import type { DecentrationOutput, Eye } from '../../optics/index.js';
import { fi } from '../i18n/fi.js';

const mm2 = (value: number): string => `${formatNumber(value, { decimals: 2 })} mm`;

export function DecentrationPanel({
  eye,
  decentration,
}: {
  readonly eye: Eye;
  readonly decentration: DecentrationOutput;
}) {
  const { comparison } = decentration;
  return (
    <section class="panel panel-inner">
      <h3>{fi.decentration.title}</h3>

      <div class="headline">
        <span class="headline-label">{fi.decentration.ocHeight}</span>
        <span class="headline-value">{mm2(decentration.ocHeight)}</span>
      </div>
      <p class="field-hint">{fi.decentration.ocHeightHint}</p>

      <dl class="rows">
        <div class="row">
          <dt>{fi.decentration.horizontal}</dt>
          <dd>{mm2(decentration.horizontal)}</dd>
        </div>
        <div class="row">
          <dt>{fi.decentration.compensatedPd}</dt>
          <dd>{mm2(comparison.compensatedPdMm)}</dd>
        </div>
        <div class="row">
          <dt>{fi.decentration.inducedPrism}</dt>
          <dd>
            {formatPrism(eye, {
              magnitude: decentration.inducedPrism.magnitude,
              base: decentration.inducedPrism.base,
            })}
          </dd>
        </div>
      </dl>

      <details class="sub">
        <summary>{fi.decentration.comparison}</summary>
        <p class="field-hint">{fi.decentration.comparisonHint}</p>
        <dl class="rows">
          <div class="row">
            <dt>{fi.decentration.boxingOcHeight}</dt>
            <dd>{mm2(comparison.boxingOcHeightMm)}</dd>
          </div>
          <div class="row">
            <dt>{fi.decentration.vogelOcHeight}</dt>
            <dd>{mm2(comparison.vogelOcHeightMm)}</dd>
          </div>
          <div class="row">
            <dt>{fi.decentration.opticalAxisOcHeight}</dt>
            <dd>{mm2(comparison.opticalAxisOcHeightMm)}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
}
