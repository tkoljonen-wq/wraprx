/**
 * Laskurinäkymä: vasemmalla syöttö, oikealla tulos (suunnitelma §4).
 *
 * Kapealla näytöllä palstat ovat allekkain, syöttö ensin. Tulos päivittyy elävästi,
 * joten laskentanappia ei ole eikä tarvita.
 */
import { EyeResultPanel } from '../components/EyeResult.js';
import { InputPanel } from '../components/InputPanel.js';
import { IssueList, WarningList } from '../components/Warnings.js';
import { fi } from '../i18n/fi.js';
import { isPristine } from '../state/model.js';
import { form, solveOutcome } from '../state/store.js';

function Intro() {
  return (
    <section class="panel">
      <h2>{fi.intro.title}</h2>
      <p>{fi.intro.body}</p>
      <p class="field-hint">{fi.intro.example}</p>
    </section>
  );
}

export function CalculatorView() {
  const outcome = solveOutcome.value;
  const state = form.value;
  const cylForm = state.lab.cylForm;

  return (
    <div class="layout">
      <div class="column">
        <InputPanel />
      </div>
      <div class="column">
        {outcome.ok ? (
          <>
            <WarningList warnings={outcome.global} showEye />
            <EyeResultPanel result={outcome.od} cylForm={cylForm} />
            <EyeResultPanel result={outcome.os} cylForm={cylForm} />
          </>
        ) : isPristine(state) ? (
          <Intro />
        ) : (
          <IssueList issues={outcome.issues} />
        )}
      </div>
    </div>
  );
}
