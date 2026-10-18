/**
 * Suomenkieliset merkkijonot (suunnitelma §4).
 *
 * Kaikki käyttöliittymän teksti on täällä. Sovellus on vain suomeksi (päätös
 * 18.10.2026); tiedosto pitää tekstit yhdessä paikassa, ei valmistele käännöstä. Optiikan omat selitetekstit (varoitukset, verdiktit, validointivirheet)
 * tulevat `src/optics/format.ts`:stä — niitä ei monisteta tänne, koska ne ovat osa
 * laskennan sopimusta.
 */

export const fi = {
  app: {
    title: 'WrapRx',
    tagline: 'Kompensoitu linssitilaus kallistetulle kehykselle · vain yksiteho',
    version: (version: string, sha: string): string => `versio ${version} (${sha})`,
    privacy:
      'Kaikki laskenta tapahtuu selaimessa, eikä mitään lähetetä mihinkään. Viimeisin laskenta sekä tallennetut kehykset ja linssitalot säilyvät vain tällä laitteella.',
    install: 'Asenna sovellus',
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
    prismHint:
      'Reseptin prisma on tavoite silmällä. Ohjelma laskee, mikä prisma pitää tilata, jotta kallellaan oleva linssi tuottaa sen.',

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
    craHint:
      'Ei vaikuta OC-korkeuteen eikä prisman käännökseen. Tarvitaan vertailulukuun "optinen akseli kiertokeskiöön".',

    labCompensates: 'Linssitalo kompensoi itse',
    axisStep: 'Akseliaskel (°)',
    prismStep: 'Prisma-askel (pd)',
    cylFormOutput: 'Sylinterimuoto tuloksissa',
    cylFormPlus: 'plusmuoto',
    cylFormMinus: 'miinusmuoto',

    prismModel: 'Prismamalli',
    prismWedge: 'kiila + Snell',
    prismPassThrough: 'ei käännöstä',
    prismModelHint:
      'Kiilamalli kääntää reseptin prisman kallistetulle linssille (§3.5). Ilman käännöstä arvo välitetään sellaisenaan.',
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
    share: 'Jaa linkkinä',
    linkCopied: 'Linkki kopioitu leikepöydälle',
    shareFailed: 'Kopioi linkki alla olevasta kentästä:',
    shareTitle: 'WrapRx-laskenta',
  },

  shared: {
    opened:
      'Laskenta avattiin jaetusta linkistä. Tarkista luvut ennen tilausta — linkki sisältää vain numerot, ei asiakastietoja.',
  },

  presets: {
    frameLabel: 'Tallennettu kehys',
    labLabel: 'Tallennettu linssitalo',
    none: '— valitse —',
    save: 'Tallenna nykyinen',
    saveConfirm: 'Tallenna',
    cancel: 'Peru',
    remove: 'Poista',
    nameLabel: 'Nimi',
    framePlaceholder: 'esim. urheilukehys, koko L',
    labPlaceholder: 'esim. Linssitalo Oy',
    frameHint:
      'Tallentaa kulmat, kulmatavan ja kehysmitat. Sovituskorkeus on asiakkaan mitta, eikä sitä tallenneta. Presetin käyttö poistaa ruksin «kulmat mitattu», koska tallennetut kulmat ovat nimellisarvoja.',
    labHint: 'Tallentaa linssitalon asetukset tälle laitteelle.',
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

  prism: {
    title: 'Prisma',
    ordered: 'Tilattava prisma',
    orderedHint:
      'Kiilan poikkeutus kallistamattomana — se luku, jonka linssitalo mittaa focimetrillä. Kallistetussa kehyksessä se ei ole sama kuin reseptin prisma.',
    prescribed: 'Resepti (tavoite silmällä)',
    orderedExact: 'Tilattava, tarkka',
    orderedRoundedLabel: 'Tilattava, pyöristetty',
    asWorn: 'Toteutuu silmällä',
    asWornUncompensated: 'Ilman käännöstä toteutuisi',
    residual: 'Jäännösvirhe',
    residualUncompensated: 'ilman käännöstä',
    tca: 'Kromaattinen aberraatio P/ν',
    apex: 'Kiilakulma',
    iterations: 'iteraatioita',
    passThrough:
      'Prismamalli on kytketty pois: resepti välitetään kääntämättä. Vertailua varten, ei tilaamiseen.',
    failed:
      'Prisman käännös ei supennut, joten prisma-arvoa ei näytetä. Arvattu luku olisi vaarallisempi kuin puuttuva.',
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
