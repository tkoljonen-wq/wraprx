/**
 * Käynnistys. Kaikki muu on `src/ui/`:ssä ja laskenta `src/optics/`:ssä.
 */
import { render } from 'preact';
import { App } from './ui/App.js';
import './ui/styles.css';

const target = document.querySelector('#app');
if (target) {
  render(<App />, target);
}

// Service worker vain tuotantobuildissa: devissä välimuisti sotkisi HMR:n.
// Suhteellinen polku ja updateViaCache: 'none' (GitHub Pages antaa max-age=600).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {
      // Ilman SW:tä sovellus toimii verkossa normaalisti, vain offline puuttuu.
    });
  });
}
