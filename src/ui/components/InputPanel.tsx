/**
 * Syöttöpalsta: resepti, kehys, materiaali, linssitalo, laskentatapa.
 *
 * Kentät kirjoittavat suoraan signaaliin, joten tulos päivittyy elävästi. Mikään
 * kenttä ei tee omaa optiikkatarkistusta (ks. `fields.tsx`).
 */
import { FLAGS } from '../flags.js';
import { fi } from '../i18n/fi.js';
import { EYE_KEYS, type EyeKey } from '../state/model.js';
import { MATERIALS, MISSING_MATERIALS, findMaterial } from '../state/materials.js';
import {
  clearForm,
  deleteFramePreset,
  deleteLabPreset,
  form,
  loadExample,
  presets,
  saveFramePreset,
  saveLabPreset,
  setEyeField,
  setField,
  setFrameField,
  setLabField,
  useFramePreset,
  useLabPreset,
} from '../state/store.js';
import { CheckField, NumberField, SegmentedField, SelectField } from './fields.js';
import { PresetBar } from './PresetBar.js';
import { ShareButton } from './ShareButton.js';

function EyeFields({ eye }: { readonly eye: EyeKey }) {
  const values = form.value.eyes[eye];
  return (
    <div class="eye-block">
      <h3 class="eye-title">{fi.eyes[eye]}</h3>
      <div class="grid-2">
        <NumberField
          label={fi.fields.sphere}
          value={values.sphere}
          onValue={(value) => setEyeField(eye, 'sphere', value)}
          placeholder="-1,00"
        />
        <NumberField
          label={fi.fields.cylinder}
          value={values.cylinder}
          onValue={(value) => setEyeField(eye, 'cylinder', value)}
          placeholder="-0,50"
        />
        <NumberField
          label={fi.fields.axis}
          value={values.axis}
          onValue={(value) => setEyeField(eye, 'axis', value)}
          placeholder="180"
        />
        <NumberField
          label={fi.fields.monoPd}
          value={values.monoPd}
          onValue={(value) => setEyeField(eye, 'monoPd', value)}
          placeholder="32"
        />
      </div>
      <details class="sub">
        <summary>{fi.prism.title}</summary>
        <p class="field-hint">{fi.fields.prismHint}</p>
        <div class="grid-2">
          <NumberField
            label={fi.fields.prismMagnitude}
            value={values.prismMagnitude}
            onValue={(value) => setEyeField(eye, 'prismMagnitude', value)}
          />
          <NumberField
            label={fi.fields.prismBase}
            value={values.prismBase}
            onValue={(value) => setEyeField(eye, 'prismBase', value)}
          />
        </div>
      </details>
    </div>
  );
}

export function InputPanel() {
  const state = form.value;
  const material = findMaterial(state.materialId);

  return (
    <div class="panel-stack">
      <div class="actions">
        <button type="button" class="button" onClick={loadExample}>
          {fi.actions.loadExample}
        </button>
        <button type="button" class="button button-quiet" onClick={clearForm}>
          {fi.actions.clear}
        </button>
        <ShareButton />
      </div>

      <section class="panel">
        <h2>{fi.sections.prescription}</h2>
        <p class="field-hint">{fi.fields.cylinderHint}</p>
        {EYE_KEYS.map((eye) => (
          <EyeFields key={eye} eye={eye} />
        ))}
      </section>

      <section class="panel">
        <h2>{fi.sections.frame}</h2>
        <PresetBar
          label={fi.presets.frameLabel}
          names={presets.value.frames.map((entry) => entry.name)}
          placeholder={fi.presets.framePlaceholder}
          hint={fi.presets.frameHint}
          onUse={useFramePreset}
          onSave={saveFramePreset}
          onDelete={deleteFramePreset}
        />
        <div class="grid-2">
          <NumberField
            label={fi.fields.panto}
            value={state.frame.panto}
            onValue={(value) => setFrameField('panto', value)}
            placeholder="18"
          />
          <NumberField
            label={fi.fields.wrap}
            value={state.frame.wrap}
            onValue={(value) => setFrameField('wrap', value)}
            placeholder="15"
          />
        </div>
        <SegmentedField
          label={fi.fields.wrapMode}
          value={state.frame.wrapMode}
          options={[
            { value: 'perLens', label: fi.fields.wrapModePerLens },
            { value: 'total', label: fi.fields.wrapModeTotal },
          ]}
          onValue={(value) => setFrameField('wrapMode', value)}
        />
        <CheckField
          label={fi.fields.anglesMeasured}
          checked={state.frame.anglesMeasured}
          onChecked={(checked) => setFrameField('anglesMeasured', checked)}
          hint={fi.fields.anglesMeasuredHint}
        />
        <p class="field-hint">{fi.fields.frameBoxHint}</p>
        <div class="grid-2">
          <NumberField
            label={fi.fields.boxA}
            value={state.frame.boxA}
            onValue={(value) => setFrameField('boxA', value)}
            placeholder="54"
          />
          <NumberField
            label={fi.fields.boxB}
            value={state.frame.boxB}
            onValue={(value) => setFrameField('boxB', value)}
            placeholder="36"
          />
          <NumberField
            label={fi.fields.dbl}
            value={state.frame.dbl}
            onValue={(value) => setFrameField('dbl', value)}
            placeholder="17"
          />
          <NumberField
            label={fi.fields.fittingHeight}
            value={state.frame.fittingHeight}
            onValue={(value) => setFrameField('fittingHeight', value)}
            placeholder="22"
          />
        </div>
      </section>

      <section class="panel">
        <h2>{fi.sections.lens}</h2>
        <SelectField
          label={fi.fields.material}
          value={state.materialId}
          options={MATERIALS.map((entry) => ({ value: entry.id, label: entry.name }))}
          onValue={(value) => setField('materialId', value)}
          hint={material ? `n = ${material.index} · ν = ${material.abbe} · ${material.source}` : ''}
        />
        <details class="sub">
          <summary>Puuttuvat materiaalit</summary>
          <ul class="notes">
            {MISSING_MATERIALS.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </details>
        <div class="grid-2">
          <NumberField
            label={fi.fields.vertexRefraction}
            value={state.vertexRefraction}
            onValue={(value) => setField('vertexRefraction', value)}
          />
          <NumberField
            label={fi.fields.vertexWorn}
            value={state.vertexWorn}
            onValue={(value) => setField('vertexWorn', value)}
          />
        </div>
        <NumberField
          label={fi.fields.cra}
          value={state.cra}
          onValue={(value) => setField('cra', value)}
          hint={fi.fields.craHint}
        />
      </section>

      <section class="panel">
        <h2>{fi.sections.lab}</h2>
        <PresetBar
          label={fi.presets.labLabel}
          names={presets.value.labs.map((entry) => entry.name)}
          placeholder={fi.presets.labPlaceholder}
          hint={fi.presets.labHint}
          onUse={useLabPreset}
          onSave={saveLabPreset}
          onDelete={deleteLabPreset}
        />
        <SegmentedField
          label={fi.fields.cylFormOutput}
          value={state.lab.cylForm}
          options={[
            { value: 'minus', label: fi.fields.cylFormMinus },
            { value: 'plus', label: fi.fields.cylFormPlus },
          ]}
          onValue={(value) => setLabField('cylForm', value)}
        />
        <div class="grid-2">
          <NumberField
            label={fi.fields.axisStep}
            value={state.lab.axisStep}
            onValue={(value) => setLabField('axisStep', value)}
          />
          <NumberField
            label={fi.fields.prismStep}
            value={state.lab.prismStep}
            onValue={(value) => setLabField('prismStep', value)}
          />
        </div>
        <CheckField
          label={fi.fields.labCompensates}
          checked={state.lab.compensatesInternally}
          onChecked={(checked) => setLabField('compensatesInternally', checked)}
        />
      </section>

      {FLAGS.allowMartinApproximation || FLAGS.allowPrismPassThrough || FLAGS.baseCurveModel ? (
        <section class="panel">
          <h2>{fi.sections.method}</h2>
          {FLAGS.allowMartinApproximation ? (
            <SegmentedField
              label={fi.fields.ocrMethod}
              value={state.ocrMethod}
              options={[
                { value: 'exact', label: fi.fields.ocrExact },
                { value: 'martin', label: fi.fields.ocrMartin },
              ]}
              onValue={(value) => setField('ocrMethod', value)}
            />
          ) : null}
          {FLAGS.allowPrismPassThrough ? (
            <SegmentedField
              label={fi.fields.prismModel}
              value={state.prismModel}
              options={[
                { value: 'wedgeSnell', label: fi.fields.prismWedge },
                { value: 'passThrough', label: fi.fields.prismPassThrough },
              ]}
              onValue={(value) => setField('prismModel', value)}
              hint={fi.fields.prismModelHint}
            />
          ) : null}
          {FLAGS.baseCurveModel ? (
            <CheckField
              label={fi.fields.baseCurveModel}
              checked={state.baseCurveModel}
              onChecked={(checked) => setField('baseCurveModel', checked)}
              hint={fi.fields.baseCurveHint}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
