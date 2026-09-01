/**
 * Yhden silmän tulos: kaksi korttia, hyötyarvio, varoitukset, desentraatio ja jälki.
 */
import { formatNumber, formatPower } from '../../optics/format.js';
import type { EyeResult as EyeResultData } from '../../optics/index.js';
import { FLAGS } from '../flags.js';
import { fi } from '../i18n/fi.js';
import { DecentrationPanel } from './Decentration.js';
import { PrismPanel } from './PrismPanel.js';
import { ResultCard } from './ResultCard.js';
import { TracePanel } from './TracePanel.js';
import { WarningList } from './Warnings.js';

export function EyeResultPanel({
  result,
  cylForm,
}: {
  readonly result: EyeResultData;
  readonly cylForm: 'plus' | 'minus';
}) {
  const rounded = formatPower(result.rounded025, { cylForm });
  const naive = formatPower(result.naiveRounded025, { cylForm });

  return (
    <section class="panel">
      <div class="panel-head">
        <h2>{fi.eyes[result.eye]}</h2>
        <span class={result.compensationWorthwhile ? 'badge badge-ok' : 'badge badge-warn'}>
          {result.compensationWorthwhile ? fi.results.worthwhile : fi.results.notWorthwhile}
        </span>
      </div>

      <div class="cards">
        <ResultCard
          eye={result.eye}
          title={fi.results.exact}
          hint={fi.results.exactHint}
          power={result.exact}
          cylForm={cylForm}
          asWorn={result.asWorn.exact}
          residual={result.residual.exact}
          toleranceOrdered={result.tolerance.ordered.exact}
          toleranceAsWorn={result.tolerance.asWorn.exact}
        />
        <ResultCard
          eye={result.eye}
          title={fi.results.rounded}
          hint={fi.results.roundedHint}
          power={result.rounded025}
          cylForm={cylForm}
          asWorn={result.asWorn.rounded}
          residual={result.residual.rounded}
          toleranceOrdered={result.tolerance.ordered.rounded}
          toleranceAsWorn={result.tolerance.asWorn.rounded}
        >
          {naive !== rounded ? (
            <p class="row-note">
              {fi.results.naiveComparison}: {naive}
            </p>
          ) : null}
        </ResultCard>
      </div>

      <dl class="rows">
        <div class="row">
          <dt>{fi.results.uncompensated}</dt>
          <dd>
            {formatPower(result.asWorn.uncompensated, { cylForm })}
            <span class="row-note">
              {fi.results.residual}{' '}
              {formatNumber(result.residual.uncompensated.dioptricDistance, { decimals: 3 })} D
            </span>
          </dd>
        </div>
      </dl>

      <WarningList warnings={result.warnings} />

      <PrismPanel eye={result.eye} prism={result.prism} />

      {FLAGS.showDecentration && result.decentration ? (
        <DecentrationPanel eye={result.eye} decentration={result.decentration} />
      ) : null}

      {FLAGS.showTrace ? <TracePanel trace={result.trace} /> : null}
    </section>
  );
}
