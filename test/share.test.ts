/**
 * Jakolinkki ja tallennus (vaihe P3).
 *
 * Kolme asiaa: (1) linkki toistaa laskennan täsmälleen, (2) linkkiin ei päädy muita
 * kuin sallitut avaimet — tietosuojalupaus §4/§7, ja (3) vihamielinen tai rikkinäinen
 * hash ei vie lomakkeeseen roskaa.
 */
import { describe, expect, it } from 'vitest';

import { solve } from '../src/optics/index.js';
import { buildSolveInput, createDefaultForm, createExampleForm } from '../src/ui/state/model.js';
import { parseSharedForm, serializeForm, SHARE_KEYS } from '../src/ui/state/share.js';

describe('jakolinkki', () => {
  it('esimerkkitapaus kulkee linkin läpi muuttumattomana', () => {
    const form = createExampleForm();
    expect(parseSharedForm(serializeForm(form))).toEqual(form);
  });

  it('linkistä avattu laskenta antaa saman tuloksen', () => {
    const form = createExampleForm();
    const restored = parseSharedForm(`#${serializeForm(form)}`);
    expect(restored).toBeDefined();
    expect(solve(buildSolveInput(restored!))).toEqual(solve(buildSolveInput(form)));
  });

  it('kaikki lomakkeen kentät kulkevat, myös prisma ja linssitalo', () => {
    const base = createExampleForm();
    const form = {
      ...base,
      eyes: { ...base.eyes, OS: { ...base.eyes.OS, prismMagnitude: '1,5', prismBase: '90' } },
      lab: { compensatesInternally: true, axisStep: '5', prismStep: '0,5', cylForm: 'plus' as const },
      frame: { ...base.frame, wrapMode: 'total' as const, anglesMeasured: false },
      ocrMethod: 'martin' as const,
      prismModel: 'passThrough' as const,
    };
    expect(parseSharedForm(serializeForm(form))).toEqual(form);
  });

  it('linkissä on vain sallitut avaimet', () => {
    const params = new URLSearchParams(serializeForm(createExampleForm()));
    for (const key of params.keys()) {
      expect(SHARE_KEYS).toContain(key);
    }
  });

  it('sallittujen lista ei sisällä viite- tai nimikenttää', () => {
    // Suunnitelma §4: vapaa viitekenttä ei koskaan serialisoidu linkkiin.
    for (const key of SHARE_KEYS) {
      expect(key).not.toMatch(/ref|viite|name|nimi|note/i);
    }
  });

  it('tyhjä lomake tuottaa lyhyen linkin ilman tyhjiä tekstikenttiä', () => {
    const params = new URLSearchParams(serializeForm(createDefaultForm()));
    expect(params.has('od.s')).toBe(false);
    expect(parseSharedForm(serializeForm(createDefaultForm()))).toEqual(createDefaultForm());
  });

  it('muu kuin WrapRx-linkki ohitetaan', () => {
    expect(parseSharedForm('')).toBeUndefined();
    expect(parseSharedForm('#osio-2')).toBeUndefined();
    expect(parseSharedForm('#v=99&od.s=-1')).toBeUndefined();
  });

  it('kelpaamaton arvo jää oletukseksi eikä päädy lomakkeeseen', () => {
    const form = parseSharedForm(
      '#v=1&od.s=<script>&od.c=1e9999999999999&mat=keksitty&wm=sivuttain&am=kyllä&panto=18&ref=Matti',
    );
    const defaults = createDefaultForm();
    expect(form).toBeDefined();
    expect(form!.eyes.OD.sphere).toBe('');
    expect(form!.eyes.OD.cylinder).toBe('');
    expect(form!.materialId).toBe(defaults.materialId);
    expect(form!.frame.wrapMode).toBe(defaults.frame.wrapMode);
    expect(form!.frame.anglesMeasured).toBe(defaults.frame.anglesMeasured);
    expect(form!.frame.panto).toBe('18');
    expect(JSON.stringify(form)).not.toContain('Matti');
  });

  it('pois kytketty base curve -malli ei käynnisty linkistä', () => {
    expect(parseSharedForm('#v=1&bc=1')!.baseCurveModel).toBe(false);
  });
});
