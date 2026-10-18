/**
 * Sovelluksen juuri.
 *
 * Näkymiä on yksi. Tulos luetaan näytöltä (tulostettavaa tilauslomaketta ei tehdä,
 * päätös 18.10.2026), ja presetit ovat lomakeosioiden sisällä, joten reititintä ei
 * tarvita.
 */
import { installAvailable, promptInstall } from './state/install.js';
import { openedFromLink } from './state/store.js';
import { CalculatorView } from './views/CalculatorView.js';
import { fi } from './i18n/fi.js';

export function App() {
  return (
    <div class="app">
      <header class="app-head">
        <h1>{fi.app.title}</h1>
        <p class="tagline">{fi.app.tagline}</p>
        {installAvailable.value ? (
          <button
            type="button"
            class="button button-small install"
            onClick={() => void promptInstall()}
          >
            {fi.app.install}
          </button>
        ) : null}
      </header>

      {openedFromLink.value ? (
        <p class="notice" role="status">
          {fi.shared.opened}
        </p>
      ) : null}

      <CalculatorView />

      <footer class="app-foot">
        <p>{fi.scope.body}</p>
        <p>{fi.app.privacy}</p>
        <p class="mono">{fi.app.version(__APP_VERSION__, __GIT_SHA__)}</p>
      </footer>
    </div>
  );
}
