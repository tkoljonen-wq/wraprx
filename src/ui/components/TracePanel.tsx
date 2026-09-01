/**
 * Laskentajälki (suunnitelma §3.7, tulostaso 3).
 *
 * Tämä on se osa, jolla tarkistat ettei ohjelma valehtele: jokainen välivaihe
 * nimellä, selitteellä ja arvolla samassa järjestyksessä kuin laskenta etenee.
 * Kokoontaitettu, koska sitä ei tarvita joka tilauksella.
 */
import { formatNumber, formatPower } from '../../optics/format.js';
import type { CalcTrace, TraceStep } from '../../optics/index.js';
import { fi } from '../i18n/fi.js';

function unitText(unit: string): string {
  switch (unit) {
    case 'D':
      return ' D';
    case 'deg':
      return '°';
    case 'mm':
      return ' mm';
    case 'pd':
      return ' pd';
    default:
      return '';
  }
}

function renderValue(step: TraceStep) {
  const value = step.value;
  switch (value.kind) {
    case 'matrix':
      return (
        <>
          <span class="mono">{formatPower(value.power)}</span>
          <span class="row-note mono">
            xx {formatNumber(value.matrix.xx, { decimals: 4 })} · yy{' '}
            {formatNumber(value.matrix.yy, { decimals: 4 })} · xy{' '}
            {formatNumber(value.matrix.xy, { decimals: 4 })}
          </span>
        </>
      );
    case 'scalar':
      return (
        <span class="mono">
          {formatNumber(value.value, { decimals: 4 })}
          {unitText(value.unit)}
        </span>
      );
    case 'vector3':
      return (
        <span class="mono">
          [{value.value.map((component) => formatNumber(component, { decimals: 4 })).join(' · ')}]
        </span>
      );
    case 'flag':
      return <span class="mono">{value.value ? 'kyllä' : 'ei'}</span>;
    case 'text':
      return <span class="mono">{value.value}</span>;
    default:
      return null;
  }
}

export function TracePanel({ trace }: { readonly trace: CalcTrace }) {
  return (
    <details class="sub">
      <summary>{fi.trace.open}</summary>
      <table class="trace">
        <thead>
          <tr>
            <th>{fi.trace.step}</th>
            <th>{fi.trace.value}</th>
          </tr>
        </thead>
        <tbody>
          {trace.steps.map((step) => (
            <tr key={step.name}>
              <td>
                <span class="trace-label">{step.label}</span>
                <span class="row-note mono">{step.name}</span>
              </td>
              <td>{renderValue(step)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
