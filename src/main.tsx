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
