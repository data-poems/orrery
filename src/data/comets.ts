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
