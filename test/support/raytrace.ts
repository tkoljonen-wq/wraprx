/**
 * Riippumaton 3D-säteenjuoksu kallistetun ohuen linssin läpi — VAIN TESTEIHIN.
 *
 * Tämä ei käytä OCR-kertoimia, tangentiaalimeridiaania eikä mitään `ocr.ts`:n
 * kaavaa. Se mallintaa linssin fysikaalisena kappaleena ja laskee, mitä silmä näkee:
 *
 * - etupinta: toorinen, kaarevuusmatriisi P_L/(n − 1) linssin OMASSA kannassa
 *   (ê_h, ê_v), huippu linssin normaalin n̂ suunnassa
 * - takapinta: taso, normaali n̂
 * - keskipaksuus häviävän pieni (ohuen linssin raja), joten muoto ei vaikuta OC:n
 *   kautta kulkevaan säteeseen: kummankin pinnan normaali on siinä n̂
 * - valo tulee kaukaa suuntaan −ẑ, pinnoilla vektorimuotoinen Snellin laki
 * - vergenssi frontaalitasossa keskusdifferensseillä säteen kaltevuudesta
 *
 * Ainoa yhteinen osa tuotantokoodin kanssa on kehysgeometria (ê_h, ê_v, n̂ geometry.ts:stä)
 * ja matriisin ↔ sfäärisylinterin muunnos. Säteenjuoksu tarkistaa siis optiikan ja
 * kannan käsittelyn, ei kiertojärjestystä kasvoilla (docs/OPEN-QUESTIONS.md kohta 5).
 * Johto: test/cases/derivations.md, tapaus 10.
 */
import type { PowerMatrix } from '../../src/optics/matrix.js';

export type Vec3 = readonly [number, number, number];

export interface LensFrame {
  readonly eh: Vec3;
  readonly ev: Vec3;
  readonly normal: Vec3;
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const unit = (a: Vec3): Vec3 => scale(a, 1 / Math.sqrt(dot(a, a)));

/** Vektorimuotoinen Snell: suunta d, pinnan normaali, taitekertoimet n1 → n2. */
function refract(d: Vec3, surfaceNormal: Vec3, n1: number, n2: number): Vec3 {
  const normal = dot(surfaceNormal, d) > 0 ? scale(surfaceNormal, -1) : surfaceNormal;
  const eta = n1 / n2;
  const cosIn = -dot(normal, d);
  const cosOut = Math.sqrt(1 - eta * eta * (1 - cosIn * cosIn));
  return unit(add(scale(d, eta), scale(normal, eta * cosIn - cosOut)));
}

/**
 * Silmällä vaikuttava voimakkuus frontaalitasossa (dioptrioina), kun linssi, jonka
 * nimellisvoimakkuus on `lensPower` linssin omassa kannassa, on kallistettu kehykseen
 * `frame`. Pituudet millimetreinä.
 */
export function tracedPower(lensPower: PowerMatrix, frame: LensFrame, index: number): PowerMatrix {
  const { eh, ev, normal } = frame;
  const k = 1 / ((index - 1) * 1000); // D -> 1/mm, jaettuna (n − 1)
  const cuu = lensPower.xx * k;
  const cvv = lensPower.yy * k;
  const cuv = lensPower.xy * k;
  const thickness = 1e-4;
  const apex = scale(normal, thickness);

  // Etupinta G(p) = (p − apex)·n̂ + ½·qᵀCq = 0, q = linssin kannan koordinaatit.
  const gradient = (p: Vec3): Vec3 => {
    const r = add(p, scale(apex, -1));
    const u = dot(r, eh);
    const v = dot(r, ev);
    return add(add(normal, scale(eh, cuu * u + cuv * v)), scale(ev, cuv * u + cvv * v));
  };
  const surface = (p: Vec3): number => {
    const r = add(p, scale(apex, -1));
    const u = dot(r, eh);
    const v = dot(r, ev);
    return dot(r, normal) + 0.5 * (cuu * u * u + 2 * cuv * u * v + cvv * v * v);
  };

  const slope = (x: number, y: number): [number, number] => {
    const start: Vec3 = [x, y, 50];
    const d: Vec3 = [0, 0, -1];
    let s = 0;
    for (let i = 0; i < 60; i++) {
      const p = add(start, scale(d, s));
      const step = surface(p) / dot(gradient(p), d);
      s -= step;
      if (Math.abs(step) < 1e-15) break;
    }
    const hit = add(start, scale(d, s));
    const inside = refract(d, unit(gradient(hit)), 1, index);
    const out = refract(inside, normal, index, 1);
    return [out[0] / -out[2], out[1] / -out[2]];
  };

  const h = 1e-4;
  const px = slope(h, 0);
  const mx = slope(-h, 0);
  const py = slope(0, h);
  const my = slope(0, -h);
  const derivative = (a: number, b: number) => (-(a - b) / (2 * h)) * 1000;
  return {
    xx: derivative(px[0], mx[0]),
    yy: derivative(py[1], my[1]),
    xy: (derivative(px[1], mx[1]) + derivative(py[0], my[0])) / 2,
  };
}
