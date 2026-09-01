/**
 * Prisman käännös (suunnitelma §3.5, vaihe P2).
 *
 * Tärkein rivi on tilattava nimellisprisma: se on kiilan poikkeutus KALLISTAMATTOMANA
 * eli se luku, jonka linssitalo mittaa focimetrillä. Reseptin prisma on tavoite
 * silmällä, ja kallistetussa kehyksessä nämä kaksi eivät ole sama luku.
 *
 * Jos juurenhaku ei suppene, tässä ei näytetä lukua lainkaan. Arvattu prisma olisi
 * vaarallisempi kuin puuttuva.
 */
import { formatNumber, formatPrism } from '../../optics/format.js';
import type { Eye, PrismResult, PrismSpecOutput } from '../../optics/index.js';
import { fi } from '../i18n/fi.js';

function PrismRow({
  label,
  eye,
  spec,
  note,
}: {
  readonly label: string;
  readonly eye: Eye;
  readonly spec: PrismSpecOutput | undefined;
  readonly note?: string;
}) {
  if (!spec) return null;
  return (
    <div class="row">
      <dt>{label}</dt>
      <dd>
        {formatPrism(eye, { magnitude: spec.magnitude, base: spec.base })}
        {note ? <span class="row-note">{note}</span> : null}
      </dd>
    </div>
  );
}

export function PrismPanel({ eye, prism }: { readonly eye: Eye; readonly prism: PrismResult }) {
  if (prism.status === 'none') return null;

  if (prism.status === 'failed') {
    return (
      <section class="panel panel-inner">
        <h3>{fi.prism.title}</h3>
        <p class="prism-failed">{fi.prism.failed}</p>
        <dl class="rows">
          <PrismRow label={fi.prism.prescribed} eye={eye} spec={prism.prescribed} />
        </dl>
      </section>
    );
  }

  const passThrough = prism.status === 'passThrough';

  return (
    <section class="panel panel-inner">
      <h3>{fi.prism.title}</h3>

      {passThrough ? <p class="field-hint">{fi.prism.passThrough}</p> : null}

      {prism.orderedRounded ? (
        <div class="headline">
          <span class="headline-label">{fi.prism.ordered}</span>
          <span class="headline-value">
            {formatNumber(prism.orderedRounded.magnitude)} pd @{' '}
            {Math.round(prism.orderedRounded.base)}°
          </span>
        </div>
      ) : null}
      {!passThrough ? <p class="field-hint">{fi.prism.orderedHint}</p> : null}

      <dl class="rows">
        <PrismRow label={fi.prism.prescribed} eye={eye} spec={prism.prescribed} />
        <PrismRow label={fi.prism.orderedExact} eye={eye} spec={prism.ordered} />
        <PrismRow label={fi.prism.orderedRoundedLabel} eye={eye} spec={prism.orderedRounded} />
        {!passThrough ? (
          <>
            <PrismRow label={fi.prism.asWorn} eye={eye} spec={prism.asWornRounded} />
            <PrismRow
              label={fi.prism.asWornUncompensated}
              eye={eye}
              spec={prism.asWornUncompensated}
            />
          </>
        ) : null}
        {prism.residualRoundedPd !== undefined ? (
          <div class="row">
            <dt>{fi.prism.residual}</dt>
            <dd>
              {formatNumber(prism.residualRoundedPd, { decimals: 3 })} pd
              {prism.residualUncompensatedPd !== undefined ? (
                <span class="row-note">
                  {fi.prism.residualUncompensated}{' '}
                  {formatNumber(prism.residualUncompensatedPd, { decimals: 3 })} pd
                </span>
              ) : null}
            </dd>
          </div>
        ) : null}
        {prism.tca !== undefined ? (
          <div class="row">
            <dt>{fi.prism.tca}</dt>
            <dd>{formatNumber(prism.tca, { decimals: 3 })} pd</dd>
          </div>
        ) : null}
        {prism.apexAngleDeg !== undefined ? (
          <div class="row">
            <dt>{fi.prism.apex}</dt>
            <dd>
              {formatNumber(prism.apexAngleDeg, { decimals: 2 })}°
              <span class="row-note">
                {fi.prism.iterations} {prism.iterations ?? 0} · {prism.method ?? ''}
              </span>
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
