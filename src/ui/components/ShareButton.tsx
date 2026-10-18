/**
 * Jakolinkki: Androidilla järjestelmän jakovalikko, muualla leikepöytä.
 * Linkin sisältö on rajattu `share.ts`:ssä — tämä komponentti vain toimittaa sen.
 */
import { useState } from 'preact/hooks';
import { fi } from '../i18n/fi.js';
import { shareUrl } from '../state/store.js';

export function ShareButton() {
  const [status, setStatus] = useState('');
  const [manualUrl, setManualUrl] = useState('');

  const share = async () => {
    const url = shareUrl();
    setManualUrl('');
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: fi.actions.shareTitle, url });
        setStatus('');
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus(fi.actions.linkCopied);
    } catch (error) {
      // Käyttäjä sulki jakovalikon: ei virhe.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      // Leikepöytä voi olla estetty: näytetään linkki, jonka voi kopioida itse.
      setStatus(fi.actions.shareFailed);
      setManualUrl(url);
    }
  };

  return (
    <>
      <button type="button" class="button button-quiet" onClick={() => void share()}>
        {fi.actions.share}
      </button>
      {status !== '' ? (
        <span class="action-status" role="status">
          {status}
        </span>
      ) : null}
      {manualUrl !== '' ? (
        <input
          class="field-input share-url"
          type="text"
          readOnly
          aria-label={fi.actions.share}
          value={manualUrl}
          onFocus={(event) => (event.currentTarget as HTMLInputElement).select()}
        />
      ) : null}
    </>
  );
}
