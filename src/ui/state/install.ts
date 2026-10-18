/**
 * PWA-asennus: Asenna-painike näkyy vain, kun Chrome on tarjonnut asennuskehotteen.
 *
 * `index.html`:n head-skripti ottaa `beforeinstallprompt`-tapahtuman talteen ennen
 * kuin tämä moduuli on ladattu, koska Chrome laukaisee sen vain kerran.
 */
import { signal } from '@preact/signals';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __installPrompt?: InstallPromptEvent | undefined;
  }
}

export const installAvailable = signal(
  typeof window !== 'undefined' && window.__installPrompt !== undefined,
);

if (typeof window !== 'undefined') {
  window.addEventListener('wraprx-installable', () => {
    installAvailable.value = true;
  });
  window.addEventListener('appinstalled', () => {
    window.__installPrompt = undefined;
    installAvailable.value = false;
  });
}

export async function promptInstall(): Promise<void> {
  const event = window.__installPrompt;
  if (!event) return;
  await event.prompt();
  await event.userChoice;
  // Kehotetta voi käyttää vain kerran; Chrome tarjoaa uuden, jos käyttäjä kieltäytyi.
  window.__installPrompt = undefined;
  installAvailable.value = false;
}
