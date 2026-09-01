/**
 * Suomenkieliset merkkijonot (suunnitelma §4).
 *
 * Kaikki käyttöliittymän teksti on täällä, jotta P3:n `en.ts` on pelkkä käännös eikä
 * arkeologiaa. Optiikan omat selitetekstit (varoitukset, verdiktit, validointivirheet)
 * tulevat `src/optics/format.ts`:stä — niitä ei monisteta tänne, koska ne ovat osa
 * laskennan sopimusta.
 */

export const fi = {
  app: {
    title: 'WrapRx',
    tagline: 'Kompensoitu linssitilaus kallistetulle kehykselle · vain yksiteho',
    version: (version: string, sha: string): string => `versio ${version} (${sha})`,
    privacy:
      'Kaikki laskenta tapahtuu selaimessa. Mitään ei lähetetä mihinkään eikä mitään tallenneta.',
  },

  sections: {
    prescription: 'Resepti',
    frame: 'Kehys ja sovitus',
    lens: 'Materiaali ja pintavälit',
    lab: 'Linssitalo',
    method: 'Laskentatapa',
    results: 'Tulos',
    intermediate: 'Välitulokset ja laskentajälki',
  },

  eyes: {
    OD: 'OD · oikea',
    OS: 'OS · vasen',
  },

  fields: {
    sphere: 'Sfääri (D)',
    cylinder: 'Sylinteri (D)',
    cylinderHint: 'Miinus- tai plusmuoto — ohjelma normalisoi sisäisesti plusmuotoon.',
    axis: 'Akseli (°)',
    monoPd: 'Monokulaarinen PD (mm)',
    prismMagnitude: 'Prisma (pd)',
    prismBase: 'Kantasuunta (°, 360°-notaatio)',
    prismHint: 'Reseptin prismaa ei vielä käännetä kallistukselle (vaihe P2).',

    panto: 'Pantoskooppinen kaltevuus (°)',
    wrap: 'Wrap-kulma (°)',
    wrapMode: 'Wrap ilmoitettu',
    wrapModeTotal: 'kokonaisarvona',
    wrapModePerLens: 'per linssi',
    anglesMeasured: 'Kulmat mitattu kasvoilta',
    anglesMeasuredHint: 'Pois päältä = kehysvalmistajan nimellisarvot.',
    boxA: 'Boxing A (mm)',
    boxB: 'Boxing B (mm)',
    dbl: 'Siltaväli DBL (mm)',
    fittingHeight: 'Sovituskorkeus (mm)',
    frameBoxHint:
      'Kehysmitat ovat vapaaehtoisia. Ilman niitä desentraatiota ja OC-korkeutta ei lasketa.',

    material: 'Materiaali',
    vertexRefraction: 'Pintaväli refraktiossa (mm)',
    vertexWorn: 'Pintaväli käytössä (mm)',
    cra: 'Kiertokeskiön etäisyys CRA (mm)',
    craHint: 'Ei vaikuta OC-korkeuteen, tarvitaan vertailulukuun ja vaiheeseen P2.',

    labCompensates: 'Linssitalo kompensoi itse',
    axisStep: 'Akseliaskel (°)',
    prismStep: 'Prisma-askel (pd)',
    cylFormOutput: 'Sylinterimuoto tuloksissa',
    cylFormPlus: 'plusmuoto',
    cylFormMinus: 'miinusmuoto',

    ocrMethod: 'Kallistusmalli',
    ocrExact: 'exakti',
    ocrMartin: 'Martin (vain vertailu)',
    baseCurveModel: 'Base curve -malli',
    baseCurveHint: 'Kokeellinen, oletuksena pois (§3.3).',
  },

  actions: {
    loadExample: 'Täytä esimerkkitapaus',
    clear: 'Tyhjennä',
    copy: 'Kopioi tilausrivi',
    copied: 'Kopioitu',
    copyFailed: 'Kopiointi ei onnistunut',
  },

  results: {
    exact: 'Tarkka',
    exactHint: 'Laskennan tulos ilman pyöristystä.',
    rounded: 'Tilattava · 0,25 D',
    roundedHint: 'Ruudukkohaku: lähin tilattava yhdistelmä, ei komponenttipyöristys.',
    otherForm: 'Toinen muoto',
    prism: 'Prisma',
    asWorn: 'Toteutuu silmällä',
    residual: 'Jäännösvirhe',
    uncompensated: 'Ilman kompensointia toteutuisi',
    naiveComparison: 'Komponenttipyöristys antaisi',
    toleranceOrdered: 'ISO 8980-1 (tilattava)',
    toleranceAsWorn: 'ISO 21987 (käytössä)',
    worthwhile: 'Kompensointi kannattaa',
    notWorthwhile: 'Kompensointi ei tuo hyötyä — tilaa alkuperäinen resepti',
    orderLine: 'Tilausrivi',
  },

  decentration: {
    title: 'Desentraatio ja OC-korkeus',
    ocHeight: 'OC-korkeus (mm)',
    ocHeightHint:
      'Kriteeri: katselinjan lävistyspiste kierretyssä linssitasossa (päätös 1.9.2026).',
    horizontal: 'Vaakadesentraatio sisäänpäin (mm)',
    compensatedPd: 'Kompensoitu PD linssitasossa (mm)',
    inducedPrism: 'Prisma, jos OC jää boxing-keskiöön',
    comparison: 'Vertailuluvut',
    boxingOcHeight: 'Sovituskorkeus sellaisenaan (mm)',
    vogelOcHeight: 'Nyrkkisääntö 1 mm / 2° (mm)',
    opticalAxisOcHeight: 'Optinen akseli kiertokeskiöön (mm)',
    comparisonHint: 'Vertailuluvut eivät ole tilattavia arvoja, vaan tarkistusta varten.',
  },

  trace: {
    title: 'Laskentajälki',
    step: 'Vaihe',
    value: 'Arvo',
    matrix: 'matriisi',
    open: 'Näytä laskentajälki',
  },

  issues: {
    title: 'Syöte ei ole vielä valmis',
    lead: 'Laskentaa ei tehdä ennen kuin nämä ovat kunnossa:',
  },

  intro: {
    title: 'Aloita tästä',
    body: 'Syötä resepti ja kehyksen kulmat. Tulos ilmestyy tähän ja päivittyy jokaisesta muutoksesta — erillistä laskentanappia ei ole.',
    example:
      'Nopein tapa kokeilla on «Täytä esimerkkitapaus»: se on suunnitelman §5.3 tapaus, jonka odotusarvot on johdettu käsin (test/cases/derivations.md).',
  },

  warnings: {
    title: 'Huomiot',
    severity: {
      info: 'tieto',
      warning: 'varoitus',
      critical: 'kriittinen',
    },
  },

  scope: {
    title: 'Rajaus',
    body:
      'Vain yksitehoiset linssit. Monitehossa kompensointi kuuluu valmistajan freeform-pintalaskentaan, eikä tämä ohjelma yritä korvata sitä.',
  },
} as const;

/** Ei-silmäkohtaiset validointipolut ihmisluettavaksi. */
const FIELD_LABELS: Record<string, string> = {
  lensType: 'Linssityyppi',
  'frame.wrapDeg': fi.fields.wrap,
  'frame.pantoscopicTiltDeg': fi.fields.panto,
  'frame.boxA': fi.fields.boxA,
  'frame.boxB': fi.fields.boxB,
  'frame.dbl': fi.fields.dbl,
  'frame.fittingHeight': fi.fields.fittingHeight,
  vertexRefraction: fi.fields.vertexRefraction,
  vertexWorn: fi.fields.vertexWorn,
  cra: fi.fields.cra,
  'material.index': 'Taitekerroin',
  'material.abbe': 'Abbe-luku',
  'labProfile.axisStep': fi.fields.axisStep,
  'labProfile.prismStep': fi.fields.prismStep,
};

const EYE_FIELD_LABELS: Record<string, string> = {
  'rx.sphere': fi.fields.sphere,
  'rx.cylinder': fi.fields.cylinder,
  'rx.axis': fi.fields.axis,
  'rx.prism.magnitude': fi.fields.prismMagnitude,
  'rx.prism.base': fi.fields.prismBase,
  monoPd: fi.fields.monoPd,
};

/** Validointivirheen kenttäpolku käyttäjän kielelle. Tuntematon polku palautuu sellaisenaan. */
export function fieldLabel(path: string): string {
  const eyeMatch = /^eyes\.(OD|OS)\.(.+)$/.exec(path);
  if (eyeMatch) {
    const [, eye, rest] = eyeMatch;
    return `${eye} · ${EYE_FIELD_LABELS[rest] ?? rest}`;
  }
  return FIELD_LABELS[path] ?? path;
}
