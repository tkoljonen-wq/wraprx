/**
 * Sovelluksen juuri.
 *
 * P1:ssä näkymiä on yksi. Tilauslomake, presetit ja tietoja-näkymä tulevat P3:ssa,
 * jolloin tähän tulee näkymävalinta — ei aiemmin, koska yhden näkymän reititin on
 * pelkkää rakennetta ilman hyötyä.
 */
import { CalculatorView } from './views/CalculatorView.js';
import { fi } from './i18n/fi.js';

export function App() {
  return (
    <div class="app">
      <header class="app-head">
        <h1>{fi.app.title}</h1>
        <p class="tagline">{fi.app.tagline}</p>
      </header>

      <CalculatorView />

      <footer class="app-foot">
        <p>{fi.scope.body}</p>
        <p>{fi.app.privacy}</p>
        <p class="mono">{fi.app.version(__APP_VERSION__, __GIT_SHA__)}</p>
      </footer>
    </div>
  );
}
