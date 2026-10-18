/**
 * Presetit (vaihe P3): mitä tallennetaan, mitä käyttö muuttaa ja miten rikkinäinen
 * localStorage-data käsitellään.
 */
import { describe, expect, it } from 'vitest';

import { createDefaultForm, createExampleForm } from '../src/ui/state/model.js';
import {
  applyFramePreset,
  applyLabPreset,
  EMPTY_PRESETS,
  framePresetFrom,
  labPresetFrom,
  parsePresets,
  removeByName,
  upsert,
} from '../src/ui/state/presets.js';

describe('kehyspreset', () => {
  it('ei tallenna sovituskorkeutta eikä mittausruksia', () => {
    const preset = framePresetFrom(createExampleForm(), '  Testikehys  ');
    expect(preset.name).toBe('Testikehys');
    expect(preset.frame).not.toHaveProperty('fittingHeight');
    expect(preset.frame).not.toHaveProperty('anglesMeasured');
    expect(preset.frame.panto).toBe('18');
  });

  it('käyttö kopioi kehyksen, säilyttää sovituskorkeuden ja poistaa mittausruksin', () => {
    const preset = framePresetFrom(createExampleForm(), 'Kehys');
    const target = {
      ...createDefaultForm(),
      frame: { ...createDefaultForm().frame, fittingHeight: '25', anglesMeasured: true },
    };
    const applied = applyFramePreset(target, preset);
    expect(applied.frame.wrap).toBe('15');
    expect(applied.frame.boxA).toBe('54');
    expect(applied.frame.fittingHeight).toBe('25');
    expect(applied.frame.anglesMeasured).toBe(false);
    expect(applied.eyes).toEqual(target.eyes);
  });
});

describe('linssitalopreset', () => {
  it('käyttö vaihtaa vain linssitalon asetukset', () => {
    const source = {
      ...createDefaultForm(),
      lab: { compensatesInternally: true, axisStep: '5', prismStep: '0,5', cylForm: 'plus' as const },
    };
    const applied = applyLabPreset(createExampleForm(), labPresetFrom(source, 'Talo'));
    expect(applied.lab).toEqual(source.lab);
    expect(applied.frame).toEqual(createExampleForm().frame);
  });
});

describe('lista', () => {
  it('saman niminen korvataan ja järjestys on aakkosellinen', () => {
    const a = framePresetFrom(createExampleForm(), 'Öljy');
    const b = framePresetFrom(createExampleForm(), 'Aalto');
    const b2 = framePresetFrom(createDefaultForm(), 'Aalto');
    const list = upsert(upsert(upsert([], a), b), b2);
    expect(list.map((entry) => entry.name)).toEqual(['Aalto', 'Öljy']);
    expect(list[0]!.frame.panto).toBe('');
    expect(removeByName(list, 'Aalto').map((entry) => entry.name)).toEqual(['Öljy']);
  });
});

describe('tallennetun datan luku', () => {
  it('kierros JSONin kautta säilyttää presetit', () => {
    const store = {
      version: 1 as const,
      frames: [framePresetFrom(createExampleForm(), 'Kehys')],
      labs: [labPresetFrom(createExampleForm(), 'Talo')],
    };
    expect(parsePresets(JSON.stringify(store))).toEqual(store);
  });

  it('rikkinäinen tai vieras data ei kaada vaan ohitetaan', () => {
    expect(parsePresets(null)).toEqual(EMPTY_PRESETS);
    expect(parsePresets('{rikki')).toEqual(EMPTY_PRESETS);
    expect(parsePresets('{"version":2,"frames":[]}')).toEqual(EMPTY_PRESETS);
    const mixed = parsePresets(
      JSON.stringify({
        version: 1,
        frames: [{ name: 'Hyvä', frame: framePresetFrom(createExampleForm(), 'x').frame }, { name: 5 }],
        labs: [{ name: 'Huono', lab: { cylForm: 'sivu' } }],
      }),
    );
    expect(mixed.frames.map((entry) => entry.name)).toEqual(['Hyvä']);
    expect(mixed.labs).toEqual([]);
  });
});
