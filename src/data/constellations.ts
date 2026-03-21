/*
 * Constellation metadata — 88 IAU constellations
 *
 * The 20 most recognizable have full mythology entries.
 * The rest have stub mythology to be filled over time.
 */

export interface ConstellationMeta {
  id: string;           // 3-letter IAU abbreviation
  name: string;         // Latin name
  nameEn: string;       // English name
  mythology: string;    // 2-3 sentences
  brightestStar: string;
  season: string;       // best viewing season
  area: number;         // square degrees
  zodiac: boolean;
}

export const CONSTELLATIONS: ConstellationMeta[] = [
  // ─── 20 most recognizable (full mythology) ─────────────────────────────────
  {
    id: 'Ori', name: 'Orion', nameEn: 'The Hunter',
    mythology: 'A giant huntsman placed among the stars by Zeus. In Greek myth, Orion boasted he could kill every animal on Earth, prompting Gaia to send the scorpion that eventually slew him. He and Scorpius were placed on opposite sides of the sky so they would never meet again.',
    brightestStar: 'Rigel (0.13)', season: 'Winter', area: 594, zodiac: false,
  },
  {
    id: 'UMa', name: 'Ursa Major', nameEn: 'Great Bear',
    mythology: 'Callisto, a nymph transformed into a bear by a jealous Hera. Zeus placed her in the sky to protect her. The seven brightest stars form the Big Dipper, used for millennia to find Polaris and true north.',
    brightestStar: 'Alioth (1.77)', season: 'Spring', area: 1280, zodiac: false,
  },
  {
    id: 'UMi', name: 'Ursa Minor', nameEn: 'Little Bear',
    mythology: 'Often identified as Arcas, the son of Callisto. The tip of its tail is Polaris, the North Star, which has guided travelers for thousands of years. The constellation appears to rotate around this fixed point.',
    brightestStar: 'Polaris (1.98)', season: 'Year-round', area: 256, zodiac: false,
  },
  {
    id: 'Sco', name: 'Scorpius', nameEn: 'The Scorpion',
    mythology: 'The scorpion sent by Gaia to defeat Orion. Its heart is the red supergiant Antares, whose name means "rival of Mars" for its ruddy color. One of the few constellations that genuinely resembles its namesake.',
    brightestStar: 'Antares (1.06)', season: 'Summer', area: 497, zodiac: true,
  },
  {
    id: 'Leo', name: 'Leo', nameEn: 'The Lion',
    mythology: 'The Nemean Lion slain by Heracles as the first of his twelve labors. Its hide was impervious to weapons, so Heracles strangled it. The sickle-shaped asterism of its mane is distinctive in the spring sky.',
    brightestStar: 'Regulus (1.36)', season: 'Spring', area: 947, zodiac: true,
  },
  {
    id: 'Cyg', name: 'Cygnus', nameEn: 'The Swan',
    mythology: 'Zeus disguised as a swan to seduce Leda. The constellation lies along the Milky Way, and its brightest star Deneb forms one vertex of the Summer Triangle. The Northern Cross asterism is a prominent landmark.',
    brightestStar: 'Deneb (1.25)', season: 'Summer', area: 804, zodiac: false,
  },
  {
    id: 'Cas', name: 'Cassiopeia', nameEn: 'The Queen',
    mythology: 'A vain Ethiopian queen who boasted her beauty surpassed the sea nymphs. As punishment, Poseidon chained her to her throne in the sky. Her distinctive W shape is circumpolar from northern latitudes.',
    brightestStar: 'Schedar (2.24)', season: 'Year-round', area: 598, zodiac: false,
  },
  {
    id: 'Sgr', name: 'Sagittarius', nameEn: 'The Archer',
    mythology: 'A centaur archer aiming his bow at Scorpius. The center of our Milky Way galaxy lies in this direction. The Teapot asterism is easier to spot than the full archer figure.',
    brightestStar: 'Kaus Australis (1.79)', season: 'Summer', area: 867, zodiac: true,
  },
  {
    id: 'Gem', name: 'Gemini', nameEn: 'The Twins',
    mythology: 'Castor and Pollux, twin brothers from Greek myth. When mortal Castor died, Pollux begged Zeus to let them share immortality. They alternate between Olympus and the underworld, inseparable even in death.',
    brightestStar: 'Pollux (1.14)', season: 'Winter', area: 514, zodiac: true,
  },
  {
    id: 'Tau', name: 'Taurus', nameEn: 'The Bull',
    mythology: 'Zeus transformed into a white bull to carry Europa across the sea to Crete. Contains the Pleiades cluster and the Hyades. The red eye of the bull is Aldebaran, a giant star 65 light-years away.',
    brightestStar: 'Aldebaran (0.87)', season: 'Winter', area: 797, zodiac: true,
  },
  {
    id: 'Vir', name: 'Virgo', nameEn: 'The Maiden',
    mythology: 'Often associated with Demeter or Persephone, goddesses of harvest and seasons. Spica marks the sheaf of wheat she holds. The Virgo Cluster of galaxies lies within its boundaries.',
    brightestStar: 'Spica (0.98)', season: 'Spring', area: 1294, zodiac: true,
  },
  {
    id: 'Aql', name: 'Aquila', nameEn: 'The Eagle',
    mythology: 'The eagle that carried Zeus\'s thunderbolts and abducted Ganymede. Altair, its brightest star, is one of the closest naked-eye stars at just 17 light-years. Forms the Summer Triangle with Deneb and Vega.',
    brightestStar: 'Altair (0.76)', season: 'Summer', area: 652, zodiac: false,
  },
  {
    id: 'Lyr', name: 'Lyra', nameEn: 'The Lyre',
    mythology: 'The lyre of Orpheus, whose music could charm all living things and even move stones. After his death, Zeus placed the lyre among the stars. Vega, its brightest star, was the northern pole star 12,000 years ago.',
    brightestStar: 'Vega (0.03)', season: 'Summer', area: 286, zodiac: false,
  },
  {
    id: 'And', name: 'Andromeda', nameEn: 'The Chained Princess',
    mythology: 'Daughter of Cassiopeia, chained to a rock as sacrifice to the sea monster Cetus. Perseus rescued her on his way home from slaying Medusa. Contains M31, the Andromeda Galaxy, visible to the naked eye.',
    brightestStar: 'Alpheratz (2.07)', season: 'Autumn', area: 722, zodiac: false,
  },
  {
    id: 'Per', name: 'Perseus', nameEn: 'The Hero',
    mythology: 'The hero who slew Medusa and rescued Andromeda. He holds the severed head of Medusa, marked by the "Demon Star" Algol, which visibly dims every 2.87 days as its companion eclipses it.',
    brightestStar: 'Mirfak (1.79)', season: 'Winter', area: 615, zodiac: false,
  },
  {
    id: 'Ari', name: 'Aries', nameEn: 'The Ram',
    mythology: 'The golden-fleeced ram that rescued Phrixus and Helle, later sacrificed and its fleece hung in Colchis. The quest to recover it became the voyage of the Argonauts. Once held the vernal equinox.',
    brightestStar: 'Hamal (2.01)', season: 'Autumn', area: 441, zodiac: true,
  },
  {
    id: 'CMa', name: 'Canis Major', nameEn: 'Great Dog',
    mythology: 'One of Orion\'s hunting dogs, faithful companion following the hunter across the sky. Contains Sirius, the brightest star in the night sky, whose heliacal rising marked the flooding of the Nile for ancient Egyptians.',
    brightestStar: 'Sirius (-1.46)', season: 'Winter', area: 380, zodiac: false,
  },
  {
    id: 'Aur', name: 'Auriga', nameEn: 'The Charioteer',
    mythology: 'Often associated with Erichthonius, inventor of the four-horse chariot. Capella, the bright "goat star," represents the she-goat Amalthea who nursed the infant Zeus. A prominent winter hexagon member.',
    brightestStar: 'Capella (0.08)', season: 'Winter', area: 657, zodiac: false,
  },
  {
    id: 'Cen', name: 'Centaurus', nameEn: 'The Centaur',
    mythology: 'Chiron, the wise centaur who tutored Achilles, Asclepius, and Jason. Unlike other centaurs, Chiron was gentle and learned. Alpha Centauri, the closest star system to the Sun, lies at his front hoof.',
    brightestStar: 'Alpha Centauri (-0.27)', season: 'Spring', area: 1060, zodiac: false,
  },
  {
    id: 'Crx', name: 'Crux', nameEn: 'Southern Cross',
    mythology: 'The smallest constellation but culturally vital for southern hemisphere navigation. European explorers named it during the Age of Discovery. Its long axis points roughly toward the south celestial pole.',
    brightestStar: 'Acrux (0.77)', season: 'Spring', area: 68, zodiac: false,
  },
  // ─── Remaining 68 constellations (stub mythology) ──────────────────────────
  { id: 'Aqr', name: 'Aquarius', nameEn: 'Water Bearer', mythology: '', brightestStar: 'Sadalsuud (2.87)', season: 'Autumn', area: 980, zodiac: true },
  { id: 'Cnc', name: 'Cancer', nameEn: 'The Crab', mythology: '', brightestStar: 'Tarf (3.53)', season: 'Spring', area: 506, zodiac: true },
  { id: 'Cap', name: 'Capricornus', nameEn: 'Sea Goat', mythology: '', brightestStar: 'Deneb Algedi (2.85)', season: 'Autumn', area: 414, zodiac: true },
  { id: 'Lib', name: 'Libra', nameEn: 'The Scales', mythology: '', brightestStar: 'Zubeneschamali (2.61)', season: 'Spring', area: 538, zodiac: true },
  { id: 'Psc', name: 'Pisces', nameEn: 'The Fish', mythology: '', brightestStar: 'Alpherg (3.62)', season: 'Autumn', area: 889, zodiac: true },
  { id: 'Ant', name: 'Antlia', nameEn: 'Air Pump', mythology: '', brightestStar: 'Alpha Antliae (4.25)', season: 'Spring', area: 239, zodiac: false },
  { id: 'Aps', name: 'Apus', nameEn: 'Bird of Paradise', mythology: '', brightestStar: 'Alpha Apodis (3.83)', season: 'Winter', area: 206, zodiac: false },
  { id: 'Boo', name: 'Bootes', nameEn: 'The Herdsman', mythology: '', brightestStar: 'Arcturus (-0.05)', season: 'Spring', area: 907, zodiac: false },
  { id: 'Cae', name: 'Caelum', nameEn: 'Chisel', mythology: '', brightestStar: 'Alpha Caeli (4.44)', season: 'Winter', area: 125, zodiac: false },
  { id: 'Cam', name: 'Camelopardalis', nameEn: 'Giraffe', mythology: '', brightestStar: 'Beta Camelopardalis (4.03)', season: 'Winter', area: 757, zodiac: false },
  { id: 'CVn', name: 'Canes Venatici', nameEn: 'Hunting Dogs', mythology: '', brightestStar: 'Cor Caroli (2.89)', season: 'Spring', area: 465, zodiac: false },
  { id: 'CMi', name: 'Canis Minor', nameEn: 'Little Dog', mythology: '', brightestStar: 'Procyon (0.34)', season: 'Winter', area: 183, zodiac: false },
  { id: 'Car', name: 'Carina', nameEn: 'The Keel', mythology: '', brightestStar: 'Canopus (-0.72)', season: 'Winter', area: 494, zodiac: false },
  { id: 'Cep', name: 'Cepheus', nameEn: 'The King', mythology: '', brightestStar: 'Alderamin (2.51)', season: 'Autumn', area: 588, zodiac: false },
  { id: 'Cet', name: 'Cetus', nameEn: 'The Whale', mythology: '', brightestStar: 'Diphda (2.04)', season: 'Autumn', area: 1231, zodiac: false },
  { id: 'Cha', name: 'Chamaeleon', nameEn: 'Chameleon', mythology: '', brightestStar: 'Alpha Chamaeleontis (4.07)', season: 'Spring', area: 132, zodiac: false },
  { id: 'Cir', name: 'Circinus', nameEn: 'Compass', mythology: '', brightestStar: 'Alpha Circini (3.19)', season: 'Winter', area: 93, zodiac: false },
  { id: 'Col', name: 'Columba', nameEn: 'The Dove', mythology: '', brightestStar: 'Phact (2.64)', season: 'Winter', area: 270, zodiac: false },
  { id: 'Com', name: 'Coma Berenices', nameEn: "Berenice's Hair", mythology: '', brightestStar: 'Beta Comae Berenices (4.26)', season: 'Spring', area: 386, zodiac: false },
  { id: 'CrA', name: 'Corona Australis', nameEn: 'Southern Crown', mythology: '', brightestStar: 'Meridiana (4.10)', season: 'Summer', area: 128, zodiac: false },
  { id: 'CrB', name: 'Corona Borealis', nameEn: 'Northern Crown', mythology: '', brightestStar: 'Alphecca (2.22)', season: 'Summer', area: 179, zodiac: false },
  { id: 'Crv', name: 'Corvus', nameEn: 'The Crow', mythology: '', brightestStar: 'Gienah (2.59)', season: 'Spring', area: 184, zodiac: false },
  { id: 'Crt', name: 'Crater', nameEn: 'The Cup', mythology: '', brightestStar: 'Labrum (3.56)', season: 'Spring', area: 282, zodiac: false },
  { id: 'Del', name: 'Delphinus', nameEn: 'The Dolphin', mythology: '', brightestStar: 'Rotanev (3.63)', season: 'Summer', area: 189, zodiac: false },
  { id: 'Dor', name: 'Dorado', nameEn: 'The Swordfish', mythology: '', brightestStar: 'Alpha Doradus (3.27)', season: 'Winter', area: 179, zodiac: false },
  { id: 'Dra', name: 'Draco', nameEn: 'The Dragon', mythology: '', brightestStar: 'Eltanin (2.24)', season: 'Summer', area: 1083, zodiac: false },
  { id: 'Equ', name: 'Equuleus', nameEn: 'Little Horse', mythology: '', brightestStar: 'Kitalpha (3.92)', season: 'Autumn', area: 72, zodiac: false },
  { id: 'Eri', name: 'Eridanus', nameEn: 'The River', mythology: '', brightestStar: 'Achernar (0.46)', season: 'Winter', area: 1138, zodiac: false },
  { id: 'For', name: 'Fornax', nameEn: 'The Furnace', mythology: '', brightestStar: 'Alpha Fornacis (3.87)', season: 'Autumn', area: 398, zodiac: false },
  { id: 'Gru', name: 'Grus', nameEn: 'The Crane', mythology: '', brightestStar: 'Alnair (1.73)', season: 'Autumn', area: 366, zodiac: false },
  { id: 'Her', name: 'Hercules', nameEn: 'The Strongman', mythology: '', brightestStar: 'Kornephoros (2.78)', season: 'Summer', area: 1225, zodiac: false },
  { id: 'Hor', name: 'Horologium', nameEn: 'The Clock', mythology: '', brightestStar: 'Alpha Horologii (3.86)', season: 'Winter', area: 249, zodiac: false },
  { id: 'Hya', name: 'Hydra', nameEn: 'Water Snake', mythology: '', brightestStar: 'Alphard (1.98)', season: 'Spring', area: 1303, zodiac: false },
  { id: 'Hyi', name: 'Hydrus', nameEn: 'Little Water Snake', mythology: '', brightestStar: 'Beta Hydri (2.80)', season: 'Autumn', area: 243, zodiac: false },
  { id: 'Ind', name: 'Indus', nameEn: 'The Indian', mythology: '', brightestStar: 'Alpha Indi (3.11)', season: 'Autumn', area: 294, zodiac: false },
  { id: 'Lac', name: 'Lacerta', nameEn: 'The Lizard', mythology: '', brightestStar: 'Alpha Lacertae (3.77)', season: 'Autumn', area: 201, zodiac: false },
  { id: 'Lep', name: 'Lepus', nameEn: 'The Hare', mythology: '', brightestStar: 'Arneb (2.58)', season: 'Winter', area: 290, zodiac: false },
  { id: 'Lup', name: 'Lupus', nameEn: 'The Wolf', mythology: '', brightestStar: 'Alpha Lupi (2.30)', season: 'Summer', area: 334, zodiac: false },
  { id: 'Lyn', name: 'Lynx', nameEn: 'The Lynx', mythology: '', brightestStar: 'Alpha Lyncis (3.14)', season: 'Winter', area: 545, zodiac: false },
  { id: 'Men', name: 'Mensa', nameEn: 'Table Mountain', mythology: '', brightestStar: 'Alpha Mensae (5.09)', season: 'Winter', area: 153, zodiac: false },
  { id: 'Mic', name: 'Microscopium', nameEn: 'The Microscope', mythology: '', brightestStar: 'Gamma Microscopii (4.67)', season: 'Autumn', area: 210, zodiac: false },
  { id: 'Mon', name: 'Monoceros', nameEn: 'The Unicorn', mythology: '', brightestStar: 'Beta Monocerotis (3.76)', season: 'Winter', area: 482, zodiac: false },
  { id: 'Mus', name: 'Musca', nameEn: 'The Fly', mythology: '', brightestStar: 'Alpha Muscae (2.69)', season: 'Spring', area: 138, zodiac: false },
  { id: 'Nor', name: 'Norma', nameEn: 'The Level', mythology: '', brightestStar: 'Gamma2 Normae (4.02)', season: 'Summer', area: 165, zodiac: false },
  { id: 'Oct', name: 'Octans', nameEn: 'The Octant', mythology: '', brightestStar: 'Nu Octantis (3.76)', season: 'Year-round', area: 291, zodiac: false },
  { id: 'Oph', name: 'Ophiuchus', nameEn: 'Serpent Bearer', mythology: '', brightestStar: 'Rasalhague (2.08)', season: 'Summer', area: 948, zodiac: false },
  { id: 'Pav', name: 'Pavo', nameEn: 'The Peacock', mythology: '', brightestStar: 'Peacock (1.94)', season: 'Summer', area: 378, zodiac: false },
  { id: 'Peg', name: 'Pegasus', nameEn: 'The Winged Horse', mythology: '', brightestStar: 'Enif (2.38)', season: 'Autumn', area: 1121, zodiac: false },
  { id: 'Phe', name: 'Phoenix', nameEn: 'The Phoenix', mythology: '', brightestStar: 'Ankaa (2.40)', season: 'Autumn', area: 469, zodiac: false },
  { id: 'Pic', name: 'Pictor', nameEn: 'The Painter', mythology: '', brightestStar: 'Alpha Pictoris (3.24)', season: 'Winter', area: 247, zodiac: false },
  { id: 'PsA', name: 'Piscis Austrinus', nameEn: 'Southern Fish', mythology: '', brightestStar: 'Fomalhaut (1.16)', season: 'Autumn', area: 245, zodiac: false },
  { id: 'Pup', name: 'Puppis', nameEn: 'The Stern', mythology: '', brightestStar: 'Naos (2.21)', season: 'Winter', area: 673, zodiac: false },
  { id: 'Pyx', name: 'Pyxis', nameEn: 'The Compass', mythology: '', brightestStar: 'Alpha Pyxidis (3.68)', season: 'Spring', area: 221, zodiac: false },
  { id: 'Ret', name: 'Reticulum', nameEn: 'The Net', mythology: '', brightestStar: 'Alpha Reticuli (3.33)', season: 'Winter', area: 114, zodiac: false },
  { id: 'Sge', name: 'Sagitta', nameEn: 'The Arrow', mythology: '', brightestStar: 'Gamma Sagittae (3.47)', season: 'Summer', area: 80, zodiac: false },
  { id: 'Sct', name: 'Scutum', nameEn: "Sobieski's Shield", mythology: '', brightestStar: 'Alpha Scuti (3.85)', season: 'Summer', area: 109, zodiac: false },
  { id: 'Ser', name: 'Serpens', nameEn: 'The Serpent', mythology: '', brightestStar: 'Unukalhai (2.63)', season: 'Summer', area: 637, zodiac: false },
  { id: 'Sex', name: 'Sextans', nameEn: 'The Sextant', mythology: '', brightestStar: 'Alpha Sextantis (4.49)', season: 'Spring', area: 314, zodiac: false },
  { id: 'TrA', name: 'Triangulum Australe', nameEn: 'Southern Triangle', mythology: '', brightestStar: 'Atria (1.91)', season: 'Summer', area: 110, zodiac: false },
  { id: 'Tri', name: 'Triangulum', nameEn: 'The Triangle', mythology: '', brightestStar: 'Beta Trianguli (3.00)', season: 'Autumn', area: 132, zodiac: false },
  { id: 'Tuc', name: 'Tucana', nameEn: 'The Toucan', mythology: '', brightestStar: 'Alpha Tucanae (2.87)', season: 'Autumn', area: 295, zodiac: false },
  { id: 'Vel', name: 'Vela', nameEn: 'The Sails', mythology: '', brightestStar: 'Gamma Velorum (1.75)', season: 'Spring', area: 500, zodiac: false },
  { id: 'Vol', name: 'Volans', nameEn: 'Flying Fish', mythology: '', brightestStar: 'Beta Volantis (3.77)', season: 'Winter', area: 141, zodiac: false },
  { id: 'Vul', name: 'Vulpecula', nameEn: 'The Fox', mythology: '', brightestStar: 'Anser (4.44)', season: 'Summer', area: 268, zodiac: false },
  { id: 'Cru', name: 'Crux', nameEn: 'Southern Cross', mythology: '', brightestStar: 'Acrux (0.77)', season: 'Spring', area: 68, zodiac: false },
  { id: 'Scu', name: 'Sculptor', nameEn: 'The Sculptor', mythology: '', brightestStar: 'Alpha Sculptoris (4.31)', season: 'Autumn', area: 475, zodiac: false },
  { id: 'Tel', name: 'Telescopium', nameEn: 'The Telescope', mythology: '', brightestStar: 'Alpha Telescopii (3.49)', season: 'Summer', area: 252, zodiac: false },
];

/** Lookup by IAU abbreviation */
export function findConstellation(id: string): ConstellationMeta | undefined {
  return CONSTELLATIONS.find(c => c.id === id || c.id.toLowerCase() === id.toLowerCase());
}
