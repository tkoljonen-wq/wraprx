/**
 * Presettirivi lomakeosion alussa: valinta käyttää presetin heti, tallennus kysyy
 * nimen samalla rivillä (ei modaaleja, suunnitelma §4).
 */
import { useState } from 'preact/hooks';
import { fi } from '../i18n/fi.js';
import { MAX_NAME_LENGTH, normalizeName } from '../state/presets.js';

interface PresetBarProps {
  readonly label: string;
  readonly names: readonly string[];
  readonly placeholder: string;
  readonly hint: string;
  readonly onUse: (name: string) => void;
  readonly onSave: (name: string) => void;
  readonly onDelete: (name: string) => void;
}

export function PresetBar({
  label,
  names,
  placeholder,
  hint,
  onUse,
  onSave,
  onDelete,
}: PresetBarProps) {
  const [selected, setSelected] = useState('');
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const current = names.includes(selected) ? selected : '';

  const commit = () => {
    const clean = normalizeName(name);
    if (clean === '') return;
    onSave(clean);
    setSelected(clean);
    setNaming(false);
    setName('');
  };

  return (
    <div class="preset">
      {names.length > 0 ? (
        <label class="field">
          <span class="field-label">{label}</span>
          <select
            class="field-input"
            value={current}
            onChange={(event) => {
              const value = (event.currentTarget as HTMLSelectElement).value;
              setSelected(value);
              if (value !== '') onUse(value);
            }}
          >
            <option value="">{fi.presets.none}</option>
            {names.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {naming ? (
        <form
          class="preset-row"
          onSubmit={(event) => {
            event.preventDefault();
            commit();
          }}
        >
          <label class="field preset-name">
            <span class="field-label">{fi.presets.nameLabel}</span>
            <input
              class="field-input"
              type="text"
              autocomplete="off"
              maxLength={MAX_NAME_LENGTH}
              value={name}
              placeholder={placeholder}
              onInput={(event) => setName((event.currentTarget as HTMLInputElement).value)}
            />
          </label>
          <button type="submit" class="button button-small" disabled={normalizeName(name) === ''}>
            {fi.presets.saveConfirm}
          </button>
          <button
            type="button"
            class="button button-small button-quiet"
            onClick={() => setNaming(false)}
          >
            {fi.presets.cancel}
          </button>
        </form>
      ) : (
        <div class="preset-row">
          <button
            type="button"
            class="button button-small button-quiet"
            onClick={() => {
              setName(current);
              setNaming(true);
            }}
          >
            {fi.presets.save}
          </button>
          {current !== '' ? (
            <button
              type="button"
              class="button button-small button-quiet"
              onClick={() => {
                onDelete(current);
                setSelected('');
              }}
            >
              {fi.presets.remove}
            </button>
          ) : null}
        </div>
      )}
      <p class="field-hint">{hint}</p>
    </div>
  );
}
