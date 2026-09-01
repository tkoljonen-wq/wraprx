/**
 * Varoitukset ja validointivirheet.
 *
 * Tekstit tulevat `format.ts`:stä, koska ne ovat osa laskennan sopimusta eivätkä
 * käyttöliittymän mielipide. Käyttöliittymä päättää vain järjestyksen, silmätunnisteen
 * ja kenttäpolun suomennoksen.
 */
import { issueText, warningText } from '../../optics/format.js';
import type { ValidationIssue, Warning } from '../../optics/index.js';
import { fi, fieldLabel } from '../i18n/fi.js';

const SEVERITY_ORDER: Record<Warning['severity'], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function WarningList({
  warnings,
  showEye = false,
}: {
  readonly warnings: readonly Warning[];
  readonly showEye?: boolean;
}) {
  if (warnings.length === 0) return null;
  const sorted = [...warnings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  return (
    <ul class="warnings">
      {sorted.map((warning) => (
        <li key={`${warning.code}-${warning.eye ?? ''}`} class={`warning warning-${warning.severity}`}>
          <span class="warning-tag">{fi.warnings.severity[warning.severity]}</span>
          <span>
            {showEye && warning.eye ? <strong>{warning.eye} · </strong> : null}
            {warningText(warning.code)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Yksi rivi per kenttä. Tyhjä kenttä on NaN, joka kaatuu jokaiseen tarkistukseen
 * erikseen ("puuttuu", "ei plus-muodossa", "alueen ulkopuolella") — kolme viestiä
 * samasta puutteesta on melua, ja kaksi niistä on vielä harhaanjohtavia. Puuttuva
 * arvo voittaa, koska se on syy ja muut ovat seurauksia.
 */
function oneIssuePerField(issues: readonly ValidationIssue[]): ValidationIssue[] {
  const byField = new Map<string, ValidationIssue>();
  for (const issue of issues) {
    const existing = byField.get(issue.field);
    if (!existing || issue.code === 'nonFiniteValue') byField.set(issue.field, issue);
  }
  return [...byField.values()];
}

export function IssueList({ issues }: { readonly issues: readonly ValidationIssue[] }) {
  return (
    <section class="panel">
      <h2>{fi.issues.title}</h2>
      <p class="field-hint">{fi.issues.lead}</p>
      <ul class="issues">
        {oneIssuePerField(issues).map((issue) => (
          <li key={`${issue.field}-${issue.code}`}>
            <strong>{fieldLabel(issue.field)}</strong>
            <span>{issueText(issue.code)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
