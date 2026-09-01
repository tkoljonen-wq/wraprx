/**
 * Syöttökentät.
 *
 * Kosketuskäyttö on suunnittelun lähtökohta (suunnitelma §4: liikkeessä, tabletilla,
 * asiakas vieressä): isot kohteet, `inputmode="decimal"` numeronäppäimistöä varten ja
 * `type="text"`, jotta pilkku kelpaa desimaalierottimena myös Androidilla.
 *
 * Kenttä ei validoi optiikkaa. Se välittää merkkijonon eteenpäin ja ytimen
 * validointiportti kertoo, mikä on pielessä — yksi totuuden lähde, ei kaksi.
 */

interface NumberFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onValue: (value: string) => void;
  readonly hint?: string;
  readonly placeholder?: string;
}

export function NumberField({ label, value, onValue, hint, placeholder }: NumberFieldProps) {
  return (
    <label class="field">
      <span class="field-label">{label}</span>
      <input
        class="field-input"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        spellcheck={false}
        value={value}
        placeholder={placeholder ?? ''}
        onInput={(event) => onValue((event.currentTarget as HTMLInputElement).value)}
      />
      {hint ? <span class="field-hint">{hint}</span> : null}
    </label>
  );
}

interface CheckFieldProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChecked: (checked: boolean) => void;
  readonly hint?: string;
}

export function CheckField({ label, checked, onChecked, hint }: CheckFieldProps) {
  return (
    <label class="check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChecked((event.currentTarget as HTMLInputElement).checked)}
      />
      <span>
        <span class="check-label">{label}</span>
        {hint ? <span class="field-hint">{hint}</span> : null}
      </span>
    </label>
  );
}

export interface SelectOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

interface SelectFieldProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly options: readonly SelectOption<T>[];
  readonly onValue: (value: T) => void;
  readonly hint?: string;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onValue,
  hint,
}: SelectFieldProps<T>) {
  return (
    <label class="field">
      <span class="field-label">{label}</span>
      <select
        class="field-input"
        value={value}
        onChange={(event) => onValue((event.currentTarget as HTMLSelectElement).value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <span class="field-hint">{hint}</span> : null}
    </label>
  );
}

interface SegmentedFieldProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly options: readonly SelectOption<T>[];
  readonly onValue: (value: T) => void;
  readonly hint?: string;
}

/** Kahden tai kolmen vaihtoehdon valinta ilman avattavaa listaa — nopeampi sormella. */
export function SegmentedField<T extends string>({
  label,
  value,
  options,
  onValue,
  hint,
}: SegmentedFieldProps<T>) {
  return (
    <div class="field">
      <span class="field-label">{label}</span>
      <div class="segmented" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            class={option.value === value ? 'segment segment-active' : 'segment'}
            aria-pressed={option.value === value}
            onClick={() => onValue(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {hint ? <span class="field-hint">{hint}</span> : null}
    </div>
  );
}
