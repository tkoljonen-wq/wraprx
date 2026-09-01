/**
 * Materiaalilista käyttöliittymälle.
 *
 * Data luetaan `data/materials.json`:ista, jossa jokaisella rivillä on lähde
 * (suunnitelma §9.1 kohta 2). Ydin ei lue tätä tiedostoa — se saa taitekertoimen ja
 * Abbe-luvun parametrina. Puuttuvia materiaaleja ei täydennetä täältä muistista.
 */
import materialsData from '../../../data/materials.json';

export interface MaterialOption {
  readonly id: string;
  readonly name: string;
  readonly index: number;
  readonly abbe: number;
  readonly source: string;
}

export const MATERIALS: readonly MaterialOption[] = materialsData.materials.map((entry) => ({
  id: entry.id,
  name: entry.name,
  index: entry.index,
  abbe: entry.abbe,
  source: entry.source,
}));

/** Materiaalit, joita ei ole täytetty: näytetään käyttäjälle, jotta puute ei yllätä. */
export const MISSING_MATERIALS: readonly string[] = materialsData.missing;

export function findMaterial(id: string): MaterialOption | undefined {
  return MATERIALS.find((material) => material.id === id);
}
