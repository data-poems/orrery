/**
 * Comet data types and notable comet metadata.
 */

export interface CometDef {
  name: string;
  designation: string;
  q: number;       // perihelion distance (AU)
  e: number;       // eccentricity
  i: number;       // inclination (deg)
  om: number;      // longitude of ascending node (deg)
  w: number;       // argument of perihelion (deg)
  tp_jd: number;   // perihelion time (JD)
  epoch_jd: number;
  H: number;       // absolute magnitude
  type: string;    // C=long-period, P=periodic
  notable: boolean;
}

/** Curated descriptions for notable comets */
export const COMET_INFO: Record<string, string> = {
  'Halley': 'Most famous periodic comet. Returns every 75-79 years. Next perihelion ~2061.',
  'Hale-Bopp': 'Great Comet of 1997. Visible to the naked eye for 18 months.',
  'Encke': 'Shortest known orbital period (3.3 years). Parent of the Taurid meteor shower.',
  'Swift-Tuttle': 'Parent body of the Perseid meteor shower. 133-year period.',
  'NEOWISE': 'Brightest comet visible from the Northern Hemisphere since Hale-Bopp.',
  'Tsuchinshan-ATLAS': 'Great Comet of 2024. Spectacular naked-eye display.',
  'Churyumov-Gerasimenko': 'Target of ESA Rosetta mission. First comet landing (Philae, 2014).',
  'Pons-Brooks': 'Halley-type comet with 71-year period. Last perihelion April 2024.',
  'Hyakutake': 'Great Comet of 1996. Passed within 0.1 AU of Earth.',
  'West': 'Great Comet of 1976. Broke into four fragments after perihelion.',
  'Kohoutek': 'Long-period comet observed from Skylab in 1973-74.',
  'Wirtanen': '46P. One of closest cometary approaches to Earth in 2018.',
  'Wild 2': 'Target of NASA Stardust mission. Samples returned to Earth in 2006.',
};

/** Get description for a comet, matching against known names */
export function getCometInfo(name: string): string | undefined {
  for (const [key, desc] of Object.entries(COMET_INFO)) {
    if (name.includes(key)) return desc;
  }
  return undefined;
}
