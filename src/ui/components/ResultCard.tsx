/**
 * Yksi tuloskortti: *Tarkka* tai *0,25 D* (suunnitelma §4, tulostaso 1 ja 2).
 *
 * Kortti näyttää tilattavan arvon isolla, toisen sylinterimuodon pienellä ja sen
 * alla tarkistustiedot: mitä silmällä toteutuu, paljonko jää jäljelle ja mitä
 * toleranssi sanoo. Kopioitava tilausrivi käyttää pistettä desimaalierottimena
 * (`format.ts`: pilkku esitykseen, piste kopioitavaan riviin).
 */
import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import {
  describeVerdict,
  formatNumber,
  formatPower,
  formatPrism,
} from '../../optics/format.js';
import type { Eye, LensPower, Residual, Verdict } from '../../optics/index.js';
import { fi } from '../i18n/fi.js';

interface ResultCardProps {
  readonly eye: Eye;
  readonly title: string;
  readonly hint: string;
  readonly power: LensPower;
  readonly cylForm: 'plus' | 'minus';
  readonly asWorn: LensPower;
  readonly residual: Residual;
  readonly toleranceOrdered: Verdict;
  readonly toleranceAsWorn: Verdict;
  readonly children?: ComponentChildren;
}

function verdictClass(verdict: Verdict): string {
  return `verdict verdict-${verdict}`;
}

function orderLine(eye: Eye, power: LensPower, cylForm: 'plus' | 'minus'): string {
  const text = formatPower(power, { cylForm, decimalSeparator: '.' });
  if (!power.prism) return `${eye} ${text}`;
  const prism = formatPrism(eye, power.prism, { decimalSeparator: '.' });
  return `${eye} ${text} · ${prism}`;
}

export function ResultCard(props: ResultCardProps) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const otherForm = props.cylForm === 'minus' ? 'plus' : 'minus';

  const copy = (): void => {
    const text = orderLine(props.eye, props.power, props.cylForm);
    void navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied('ok');
        window.setTimeout(() => setCopied('idle'), 2000);
      })
      .catch(() => setCopied('fail'));
  };

  return (
    <article class="card">
      <header class="card-head">
        <h4>{props.title}</h4>
        <button type="button" class="button button-quiet button-small" onClick={copy}>
          {copied === 'ok'
            ? fi.actions.copied
            : copied === 'fail'
              ? fi.actions.copyFailed
              : fi.actions.copy}
        </button>
      </header>

      <p class="power">{formatPower(props.power, { cylForm: props.cylForm })}</p>
      <p class="power-alt">
        {fi.results.otherForm}: {formatPower(props.power, { cylForm: otherForm })}
      </p>
      {props.power.prism ? (
        <p class="row">
          <span class="row-label">{fi.results.prism}</span>
          <span class="row-value">{formatPrism(props.eye, props.power.prism)}</span>
        </p>
      ) : null}
      <p class="card-hint">{props.hint}</p>

      <dl class="rows">
        <div class="row">
          <dt>{fi.results.asWorn}</dt>
          <dd>{formatPower(props.asWorn, { cylForm: props.cylForm })}</dd>
        </div>
        <div class="row">
          <dt>{fi.results.residual}</dt>
          <dd>
            {formatNumber(props.residual.dioptricDistance, { decimals: 3 })} D
            <span class="row-note">
              {formatPower(props.residual, { cylForm: 'plus', decimals: 3 })}
            </span>
          </dd>
        </div>
        <div class="row">
          <dt>{fi.results.toleranceOrdered}</dt>
          <dd class={verdictClass(props.toleranceOrdered)}>
            {describeVerdict(props.toleranceOrdered)}
          </dd>
        </div>
        <div class="row">
          <dt>{fi.results.toleranceAsWorn}</dt>
          <dd class={verdictClass(props.toleranceAsWorn)}>
            {describeVerdict(props.toleranceAsWorn)}
          </dd>
        </div>
      </dl>

      {props.children}
    </article>
  );
}
