/*
 * Asterism definitions — informal star patterns
 *
 * Each asterism is a sequence of [RA°, Dec°] vertices forming connected line segments.
 * Coordinates are J2000 equatorial, matching the HYG star catalog.
 */

export interface Asterism {
  name: string;
  stars: [number, number][]; // sequential vertices as [RA°, Dec°]
  description: string;
}

export const ASTERISMS: Asterism[] = [
  // ─── Ursa Major / Ursa Minor ──────────────────────────────────────────
  {
    name: 'Big Dipper',
    description: 'The most recognized pattern in the northern sky',
    stars: [
      [165.46, 61.75], // Dubhe (α UMa)
      [165.93, 54.93], // Merak (β UMa)
      [178.46, 53.69], // Phecda (γ UMa)
      [183.86, 57.03], // Megrez (δ UMa)
      [193.51, 55.96], // Alioth (ε UMa)
      [200.98, 54.93], // Mizar (ζ UMa)
      [206.89, 49.31], // Alkaid (η UMa)
    ],
  },
  {
    name: 'Little Dipper',
    description: 'Polaris marks the end of its handle',
    stars: [
      [37.95, 89.26],   // Polaris (α UMi)
      [263.05, 86.59],  // δ UMi
      [238.19, 77.79],  // ε UMi
      [230.18, 71.83],  // ζ UMi
      [222.68, 74.16],  // η UMi
      [247.56, 75.76],  // γ UMi
      [222.68, 74.16],  // back to ζ (cup shape)
      [236.01, 75.29],  // β UMi (Kochab)
    ],
  },

  // ─── Seasonal triangles / polygons ────────────────────────────────────
  {
    name: 'Summer Triangle',
    description: 'Vega, Deneb, and Altair dominate summer skies',
    stars: [
      [279.23, 38.78],  // Vega (α Lyr)
      [310.36, 45.28],  // Deneb (α Cyg)
      [297.70, 8.87],   // Altair (α Aql)
      [279.23, 38.78],  // close
    ],
  },
  {
    name: 'Winter Hexagon',
    description: 'Six bright stars forming a huge hexagonal asterism',
    stars: [
      [79.17, 46.00],   // Capella (α Aur)
      [88.79, 7.41],    // Aldebaran (α Tau)
      [78.63, -8.20],   // Rigel (β Ori)
      [101.29, -16.72], // Sirius (α CMa)
      [114.83, 5.22],   // Procyon (α CMi)
      [116.33, 28.03],  // Pollux (β Gem)
      [79.17, 46.00],   // close
    ],
  },
  {
    name: 'Spring Triangle',
    description: 'Arcturus, Spica, and Denebola',
    stars: [
      [213.92, 19.18],  // Arcturus (α Boo)
      [201.30, -11.16], // Spica (α Vir)
      [177.27, 14.57],  // Denebola (β Leo)
      [213.92, 19.18],  // close
    ],
  },
  {
    name: 'Great Diamond',
    description: 'Spring Diamond — Arcturus, Spica, Denebola, Cor Caroli',
    stars: [
      [213.92, 19.18],  // Arcturus
      [201.30, -11.16], // Spica
      [177.27, 14.57],  // Denebola
      [194.01, 38.32],  // Cor Caroli (α CVn)
      [213.92, 19.18],  // close
    ],
  },

  // ─── Constellation sub-patterns ───────────────────────────────────────
  {
    name: "Orion's Belt",
    description: 'Three stars in a row — Alnitak, Alnilam, Mintaka',
    stars: [
      [85.19, -1.94],   // Alnitak (ζ Ori)
      [84.05, -1.20],   // Alnilam (ε Ori)
      [83.00, -0.30],   // Mintaka (δ Ori)
    ],
  },
  {
    name: 'Northern Cross',
    description: 'The body of Cygnus the Swan',
    stars: [
      [310.36, 45.28],  // Deneb (α Cyg — tail)
      [305.56, 40.26],  // γ Cyg (Sadr — center)
      [311.55, 33.97],  // δ Cyg (wing)
      [305.56, 40.26],  // back to center
      [297.37, 27.96],  // β Cyg (Albireo — head)
      [305.56, 40.26],  // back to center
      [299.08, 36.49],  // ε Cyg (wing)
    ],
  },
  {
    name: 'Teapot',
    description: 'The brightest stars of Sagittarius',
    stars: [
      [276.04, -34.38], // Kaus Australis (ε Sgr)
      [275.25, -29.83], // δ Sgr (Kaus Media)
      [271.45, -30.42], // λ Sgr (Kaus Borealis)
      [283.82, -26.30], // φ Sgr (lid)
      [286.17, -21.11], // σ Sgr (Nunki)
      [284.43, -29.88], // ζ Sgr
      [276.04, -34.38], // close bottom
      [284.43, -29.88], // ζ back
      [286.17, -21.11], // σ
      [283.82, -26.30], // φ
      [275.25, -29.83], // δ
    ],
  },
  {
    name: 'Keystone',
    description: 'Trapezoid in Hercules, home of M13',
    stars: [
      [247.55, 21.49],  // π Her
      [252.17, 31.60],  // η Her
      [258.76, 24.84],  // ζ Her
      [255.07, 14.39],  // ε Her
      [247.55, 21.49],  // close
    ],
  },
  {
    name: 'Sickle',
    description: 'The head and mane of Leo',
    stars: [
      [152.09, 11.97],  // Regulus (α Leo)
      [154.17, 23.77],  // η Leo
      [155.58, 26.01],  // γ Leo (Algieba)
      [150.98, 25.94],  // ζ Leo
      [148.19, 26.18],  // μ Leo
      [146.46, 23.77],  // ε Leo
    ],
  },
  {
    name: 'Great Square',
    description: 'Great Square of Pegasus — autumn landmark',
    stars: [
      [2.10, 29.09],    // Alpheratz (α And — shared)
      [346.19, 15.21],  // Markab (α Peg)
      [340.75, 30.22],  // Scheat (β Peg)
      [3.31, 28.08],    // γ Peg (Algenib)
      [2.10, 29.09],    // close
    ],
  },
  {
    name: 'W of Cassiopeia',
    description: 'The distinctive W shape, visible year-round from mid-latitudes',
    stars: [
      [10.13, 56.54],   // β Cas (Caph)
      [14.18, 60.72],   // α Cas (Schedar)
      [9.24, 59.15],    // γ Cas
      [21.45, 60.24],   // δ Cas (Ruchbah)
      [28.60, 63.67],   // ε Cas
    ],
  },
  {
    name: 'False Cross',
    description: 'Often confused with the Southern Cross',
    stars: [
      [131.18, -54.71], // δ Vel
      [138.30, -69.72], // ι Car
      [125.63, -59.51], // ε Car (Avior)
      [120.90, -40.00], // κ Vel
      [131.18, -54.71], // close
    ],
  },
  {
    name: "Job's Coffin",
    description: 'Small diamond in Delphinus',
    stars: [
      [309.39, 15.07],  // α Del (Sualocin)
      [309.91, 14.60],  // β Del (Rotanev)
      [310.86, 11.30],  // γ Del
      [309.17, 10.99],  // δ Del
      [309.39, 15.07],  // close
    ],
  },
  {
    name: 'Kite',
    description: 'The kite shape of Boötes',
    stars: [
      [213.92, 19.18],  // Arcturus (α Boo)
      [218.02, 38.31],  // β Boo (Nekkar)
      [211.10, 27.07],  // ρ Boo
      [203.67, 33.31],  // γ Boo (Seginus)
      [218.02, 38.31],  // Nekkar
      [225.49, 40.39],  // δ Boo
      [213.92, 19.18],  // Arcturus
    ],
  },
  {
    name: 'Circlet',
    description: 'Ring of stars forming the head of Pisces',
    stars: [
      [349.29, 6.86],   // γ Psc
      [351.73, 7.59],   // κ Psc
      [354.99, 6.06],   // λ Psc
      [359.83, 6.86],   // ι Psc
      [1.69, 7.89],     // 19 Psc (θ Psc)
      [349.29, 6.86],   // close
    ],
  },
  {
    name: 'Diamond of Virgo',
    description: 'Central diamond pattern in Virgo',
    stars: [
      [201.30, -11.16], // Spica (α Vir)
      [190.42, -1.45],  // γ Vir (Porrima)
      [186.65, 3.40],   // ε Vir (Vindemiatrix)
      [198.79, -3.69],  // δ Vir
      [201.30, -11.16], // close
    ],
  },
];
