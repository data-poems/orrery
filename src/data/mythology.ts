/*
 * Constellation mythology — compact lookup by IAU abbreviation
 * Covers all 88 IAU constellations with origin, mythology, best season, and notable objects.
 */

export interface ConstellationInfo {
  origin: string;       // cultural origin
  myth: string;         // 1-2 sentence mythology
  season: string;       // best viewing season
  objects: string[];    // notable deep sky objects
}

// IAU 3-letter abbreviation → Latin name. Sourced from public/data/constellations.json.
export const CONSTELLATION_NAMES: Record<string, string> = {
  And: 'Andromeda', Ant: 'Antlia', Aps: 'Apus', Aql: 'Aquila', Aqr: 'Aquarius',
  Ara: 'Ara', Ari: 'Aries', Aur: 'Auriga', Boo: 'Boötes', CMa: 'Canis Major',
  CMi: 'Canis Minor', CVn: 'Canes Venatici', Cae: 'Caelum', Cam: 'Camelopardalis',
  Cap: 'Capricornus', Car: 'Carina', Cas: 'Cassiopeia', Cen: 'Centaurus',
  Cep: 'Cepheus', Cet: 'Cetus', Cha: 'Chamaeleon', Cir: 'Circinus', Cnc: 'Cancer',
  Col: 'Columba', Com: 'Coma Berenices', CrA: 'Corona Austrina', CrB: 'Corona Borealis',
  Crt: 'Crater', Cru: 'Crux', Crv: 'Corvus', Cyg: 'Cygnus', Del: 'Delphinus',
  Dor: 'Dorado', Dra: 'Draco', Equ: 'Equuleus', Eri: 'Eridanus', For: 'Fornax',
  Gem: 'Gemini', Gru: 'Grus', Her: 'Hercules', Hor: 'Horologium', Hya: 'Hydra',
  Hyi: 'Hydrus', Ind: 'Indus', LMi: 'Leo Minor', Lac: 'Lacerta', Leo: 'Leo',
  Lep: 'Lepus', Lib: 'Libra', Lup: 'Lupus', Lyn: 'Lynx', Lyr: 'Lyra',
  Men: 'Mensa', Mic: 'Microscopium', Mon: 'Monoceros', Mus: 'Musca', Nor: 'Norma',
  Oct: 'Octans', Oph: 'Ophiuchus', Ori: 'Orion', Pav: 'Pavo', Peg: 'Pegasus',
  Per: 'Perseus', Phe: 'Phoenix', Pic: 'Pictor', PsA: 'Piscis Austrinus', Psc: 'Pisces',
  Pup: 'Puppis', Pyx: 'Pyxis', Ret: 'Reticulum', Scl: 'Sculptor', Sco: 'Scorpius',
  Sct: 'Scutum', Ser: 'Serpens Caput', Sex: 'Sextans', Sge: 'Sagitta', Sgr: 'Sagittarius',
  Tau: 'Taurus', Tel: 'Telescopium', TrA: 'Triangulum Australe', Tri: 'Triangulum',
  Tuc: 'Tucana', UMa: 'Ursa Major', UMi: 'Ursa Minor', Vel: 'Vela', Vir: 'Virgo',
  Vol: 'Volans', Vul: 'Vulpecula',
};

export type SeasonName = 'Spring' | 'Summer' | 'Autumn' | 'Winter';

/**
 * Northern-hemisphere season for a given month (0-11).
 * Spring: Mar–May, Summer: Jun–Aug, Autumn: Sep–Nov, Winter: Dec–Feb.
 */
export function seasonForMonth(month: number): SeasonName {
  if (month >= 2 && month <= 4) return 'Spring';
  if (month >= 5 && month <= 7) return 'Summer';
  if (month >= 8 && month <= 10) return 'Autumn';
  return 'Winter';
}

export const MYTHOLOGY: Record<string, ConstellationInfo> = {
  And: { origin: 'Greek', myth: 'Princess Andromeda, chained to a rock as sacrifice to Cetus, rescued by Perseus.', season: 'Autumn', objects: ['M31 Andromeda Galaxy'] },
  Ant: { origin: 'Lacaille 1756', myth: 'The Air Pump, honoring Robert Boyle\'s vacuum pump.', season: 'Spring', objects: [] },
  Aps: { origin: 'Keyser & de Houtman 1598', myth: 'The Bird of Paradise, from Dutch navigators\' southern sky charts.', season: 'Winter (S)', objects: [] },
  Aqr: { origin: 'Babylonian', myth: 'The Water Bearer, associated with Ganymede who served nectar to the gods.', season: 'Autumn', objects: ['M2', 'M72', 'Helix Nebula'] },
  Aql: { origin: 'Greek', myth: 'The Eagle of Zeus that carried Ganymede to Olympus. Altair marks its eye.', season: 'Summer', objects: [] },
  Ara: { origin: 'Greek', myth: 'The Altar where the Olympian gods swore allegiance before battling the Titans.', season: 'Summer (S)', objects: [] },
  Ari: { origin: 'Babylonian', myth: 'The Ram with the Golden Fleece sought by Jason and the Argonauts.', season: 'Winter', objects: [] },
  Aur: { origin: 'Greek', myth: 'The Charioteer, often identified with Erichtonius, inventor of the four-horse chariot.', season: 'Winter', objects: ['M36', 'M37', 'M38'] },
  Boo: { origin: 'Greek', myth: 'The Herdsman, sometimes Arcas, son of Zeus and Callisto. Arcturus is the 4th brightest star.', season: 'Spring', objects: [] },
  Cae: { origin: 'Lacaille 1756', myth: 'The Chisel, representing an engraving tool.', season: 'Winter (S)', objects: [] },
  Cam: { origin: 'Plancius 1613', myth: 'The Giraffe, placed in a barren area of sky between Polaris and Auriga.', season: 'Winter', objects: [] },
  Cnc: { origin: 'Greek', myth: 'The Crab sent by Hera to distract Heracles during his battle with the Hydra.', season: 'Spring', objects: ['M44 Beehive', 'M67'] },
  CVn: { origin: 'Hevelius 1687', myth: 'The Hunting Dogs, Asterion and Chara, held by Boötes the Herdsman.', season: 'Spring', objects: ['M3', 'M51 Whirlpool', 'M94'] },
  CMa: { origin: 'Greek', myth: 'The Greater Dog following Orion. Sirius, the Dog Star, is the brightest star in the sky.', season: 'Winter', objects: ['M41'] },
  CMi: { origin: 'Greek', myth: 'The Lesser Dog, companion to Orion. Procyon is the 8th brightest star.', season: 'Winter', objects: [] },
  Cap: { origin: 'Babylonian', myth: 'The Sea-Goat, associated with Pan who leaped into the Nile to escape Typhon.', season: 'Autumn', objects: ['M30'] },
  Car: { origin: 'Greek (from Argo Navis)', myth: 'The Keel of the ship Argo, which carried Jason and the Argonauts. Contains Canopus, 2nd brightest star.', season: 'Winter (S)', objects: ['Eta Carinae Nebula'] },
  Cas: { origin: 'Greek', myth: 'Queen Cassiopeia, vain mother of Andromeda, chained to her throne circling the pole.', season: 'All year (N)', objects: ['M52', 'M103'] },
  Cen: { origin: 'Greek', myth: 'The wise centaur Chiron, teacher of heroes. Alpha Centauri is the nearest star system.', season: 'Spring (S)', objects: ['Omega Centauri'] },
  Cep: { origin: 'Greek', myth: 'King Cepheus of Ethiopia, husband of Cassiopeia, father of Andromeda.', season: 'All year (N)', objects: ['Garnet Star'] },
  Cet: { origin: 'Greek', myth: 'The Sea Monster sent by Poseidon to devour Andromeda. Mira is a famous variable star.', season: 'Autumn', objects: ['M77'] },
  Cha: { origin: 'Keyser & de Houtman 1598', myth: 'The Chameleon, a southern constellation from Dutch navigators.', season: 'Spring (S)', objects: [] },
  Cir: { origin: 'Lacaille 1756', myth: 'The Compass (drafting tool), one of Lacaille\'s scientific instruments.', season: 'Summer (S)', objects: [] },
  Col: { origin: 'Plancius 1592', myth: 'The Dove, sometimes Noah\'s dove from the Ark, or the dove sent by the Argonauts.', season: 'Winter', objects: [] },
  Com: { origin: 'Greek', myth: 'Berenice\'s Hair, honoring Queen Berenice II who sacrificed her locks for her husband\'s safe return.', season: 'Spring', objects: ['M53', 'M64 Black Eye', 'M85', 'M88', 'M91', 'M98', 'M99', 'M100'] },
  CrA: { origin: 'Greek', myth: 'The Southern Crown, a wreath at the feet of Sagittarius.', season: 'Summer (S)', objects: [] },
  CrB: { origin: 'Greek', myth: 'The Northern Crown of Ariadne, given by Dionysus and placed among the stars.', season: 'Summer', objects: [] },
  Crv: { origin: 'Greek', myth: 'The Crow, Apollo\'s sacred bird sent to fetch water but delayed by a fig tree.', season: 'Spring', objects: [] },
  Crt: { origin: 'Greek', myth: 'The Cup of Apollo, associated with the myth of the Crow.', season: 'Spring', objects: [] },
  Cru: { origin: 'Royer 1679', myth: 'The Southern Cross, smallest constellation but iconic navigation aid of the southern sky.', season: 'Spring (S)', objects: ['Jewel Box Cluster', 'Coalsack Nebula'] },
  Cyg: { origin: 'Greek', myth: 'The Swan, Zeus in disguise visiting Leda. Also identified with Orpheus transformed. The Northern Cross asterism.', season: 'Summer', objects: ['M29', 'M39', 'Veil Nebula'] },
  Del: { origin: 'Greek', myth: 'The Dolphin that persuaded Amphitrite to marry Poseidon. Contains Job\'s Coffin asterism.', season: 'Summer', objects: [] },
  Dor: { origin: 'Keyser & de Houtman 1598', myth: 'The Swordfish (or Goldfish), a southern sky creation.', season: 'Winter (S)', objects: ['Large Magellanic Cloud', 'Tarantula Nebula'] },
  Dra: { origin: 'Greek', myth: 'The Dragon Ladon guarding the golden apples of the Hesperides, slain by Heracles.', season: 'Summer', objects: ['Cat\'s Eye Nebula'] },
  Equ: { origin: 'Greek', myth: 'The Little Horse, possibly the foal of Pegasus or the horse given to Castor.', season: 'Autumn', objects: [] },
  Eri: { origin: 'Greek', myth: 'The River Eridanus, identified with the Nile, Po, or the path of Phaëthon\'s chariot.', season: 'Winter', objects: [] },
  For: { origin: 'Lacaille 1756', myth: 'The Furnace, originally the chemical furnace, one of Lacaille\'s scientific instruments.', season: 'Autumn', objects: ['Fornax Cluster'] },
  Gem: { origin: 'Babylonian', myth: 'The Twins Castor and Pollux, inseparable brothers and Argonauts. Pollux is the brighter star.', season: 'Winter', objects: ['M35'] },
  Gru: { origin: 'Keyser & de Houtman 1598', myth: 'The Crane, a southern bird constellation from Dutch navigators.', season: 'Autumn (S)', objects: [] },
  Her: { origin: 'Greek', myth: 'Heracles (Hercules), greatest of Greek heroes, performing his twelve labors. Contains the Keystone asterism.', season: 'Summer', objects: ['M13 Great Cluster', 'M92'] },
  Hor: { origin: 'Lacaille 1756', myth: 'The Pendulum Clock, one of Lacaille\'s scientific instruments.', season: 'Winter (S)', objects: [] },
  Hya: { origin: 'Greek', myth: 'The Water Snake, the largest constellation. The Hydra slain by Heracles as his second labor.', season: 'Spring', objects: ['M48', 'M68', 'M83 Southern Pinwheel'] },
  Hyi: { origin: 'Keyser & de Houtman 1598', myth: 'The Water Snake (male), distinct from Hydra. A southern creation.', season: 'Autumn (S)', objects: [] },
  Ind: { origin: 'Keyser & de Houtman 1598', myth: 'The Indian, representing indigenous peoples encountered by Dutch explorers.', season: 'Autumn (S)', objects: [] },
  Lac: { origin: 'Hevelius 1687', myth: 'The Lizard, filling a gap between Cygnus and Andromeda.', season: 'Autumn', objects: [] },
  Leo: { origin: 'Babylonian', myth: 'The Nemean Lion with impenetrable hide, slain by Heracles as his first labor. The Sickle asterism forms its head.', season: 'Spring', objects: ['M65', 'M66', 'M95', 'M96', 'M105'] },
  LMi: { origin: 'Hevelius 1687', myth: 'The Little Lion, placed between Leo and Ursa Major.', season: 'Spring', objects: [] },
  Lep: { origin: 'Greek', myth: 'The Hare, crouching at the feet of Orion the Hunter.', season: 'Winter', objects: ['M79'] },
  Lib: { origin: 'Roman', myth: 'The Scales of Justice, held by Astraea (Virgo). Originally the claws of Scorpius.', season: 'Summer', objects: [] },
  Lup: { origin: 'Greek', myth: 'The Wolf, an animal being offered as sacrifice on the altar (Ara).', season: 'Summer (S)', objects: [] },
  Lyn: { origin: 'Hevelius 1687', myth: 'The Lynx, named because you need lynx-like eyes to see its faint stars.', season: 'Spring', objects: [] },
  Lyr: { origin: 'Greek', myth: 'The Lyre of Orpheus, whose music could charm all living things. Vega is the 5th brightest star.', season: 'Summer', objects: ['M56', 'M57 Ring Nebula'] },
  Men: { origin: 'Lacaille 1756', myth: 'Table Mountain, representing the flat-topped mountain near Cape Town, South Africa.', season: 'Winter (S)', objects: ['Part of LMC'] },
  Mic: { origin: 'Lacaille 1756', myth: 'The Microscope, one of Lacaille\'s scientific instruments.', season: 'Autumn (S)', objects: [] },
  Mon: { origin: 'Plancius 1613', myth: 'The Unicorn, placed in a dark region between Orion and Hydra. Rich Milky Way field.', season: 'Winter', objects: ['M50', 'Rosette Nebula'] },
  Mus: { origin: 'Keyser & de Houtman 1598', myth: 'The Fly, a small southern constellation near the Southern Cross.', season: 'Spring (S)', objects: [] },
  Nor: { origin: 'Lacaille 1756', myth: 'The Carpenter\'s Square, originally the Level and Square.', season: 'Summer (S)', objects: [] },
  Oct: { origin: 'Lacaille 1756', myth: 'The Octant, the navigation instrument. Contains the south celestial pole.', season: 'All year (S)', objects: [] },
  Oph: { origin: 'Greek', myth: 'Ophiuchus the Serpent-Bearer, identified with Asclepius the healer who could resurrect the dead.', season: 'Summer', objects: ['M9', 'M10', 'M12', 'M14', 'M19', 'M62', 'M107'] },
  Ori: { origin: 'Greek/Babylonian', myth: 'The great Hunter, son of Poseidon. Orion\'s Belt is one of the most recognized patterns. Slain by Scorpius.', season: 'Winter', objects: ['M42 Orion Nebula', 'M43', 'M78', 'Horsehead Nebula'] },
  Pav: { origin: 'Keyser & de Houtman 1598', myth: 'The Peacock, associated with the bird of Hera/Juno with Argus\'s hundred eyes in its tail.', season: 'Autumn (S)', objects: [] },
  Peg: { origin: 'Greek', myth: 'The Winged Horse born from the blood of Medusa, ridden by Bellerophon. The Great Square marks its body.', season: 'Autumn', objects: ['M15'] },
  Per: { origin: 'Greek', myth: 'Perseus the Hero who slew Medusa and rescued Andromeda. Algol (the Demon Star) is a famous eclipsing binary.', season: 'Winter', objects: ['M34', 'Double Cluster', 'California Nebula'] },
  Phe: { origin: 'Keyser & de Houtman 1598', myth: 'The Phoenix, the mythical bird reborn from its own ashes.', season: 'Autumn (S)', objects: [] },
  Pic: { origin: 'Lacaille 1756', myth: 'The Painter\'s Easel, one of Lacaille\'s art instruments.', season: 'Winter (S)', objects: [] },
  Psc: { origin: 'Babylonian', myth: 'The Fishes, Aphrodite and Eros transformed to escape Typhon, tied by a ribbon. Contains the Circlet asterism.', season: 'Autumn', objects: ['M74'] },
  PsA: { origin: 'Greek', myth: 'The Southern Fish, drinking the water poured by Aquarius. Fomalhaut is its bright star with a visible exoplanet.', season: 'Autumn', objects: [] },
  Pup: { origin: 'Greek (from Argo Navis)', myth: 'The Stern (Poop Deck) of the ship Argo that carried the Argonauts.', season: 'Winter', objects: ['M46', 'M47', 'M93'] },
  Pyx: { origin: 'Lacaille 1756', myth: 'The Compass (mariner\'s), originally part of the mast of Argo Navis.', season: 'Spring', objects: [] },
  Ret: { origin: 'Lacaille 1756', myth: 'The Reticle, the crosshair eyepiece used in telescopes.', season: 'Winter (S)', objects: [] },
  Sge: { origin: 'Greek', myth: 'The Arrow, perhaps shot by Heracles or Apollo. One of the smallest constellations.', season: 'Summer', objects: ['M71'] },
  Sgr: { origin: 'Babylonian', myth: 'The Archer centaur, aiming at the heart of Scorpius. The Milky Way center lies here. Contains the Teapot asterism.', season: 'Summer', objects: ['M8 Lagoon', 'M17 Omega', 'M20 Trifid', 'M22', 'M24', 'M25', 'M28', 'M54', 'M55', 'M69', 'M70', 'M75'] },
  Sco: { origin: 'Babylonian', myth: 'The Scorpion that killed Orion, placed opposite him in the sky. Antares (rival of Mars) marks its heart.', season: 'Summer', objects: ['M4', 'M6 Butterfly', 'M7 Ptolemy\'s Cluster', 'M80'] },
  Scl: { origin: 'Lacaille 1756', myth: 'The Sculptor, originally the Sculptor\'s Studio.', season: 'Autumn', objects: ['Sculptor Galaxy NGC 253'] },
  Sct: { origin: 'Hevelius 1684', myth: 'The Shield of Sobieski, honoring Polish King Jan III Sobieski\'s victory at Vienna.', season: 'Summer', objects: ['M11 Wild Duck', 'M26'] },
  Ser: { origin: 'Greek', myth: 'The Serpent held by Ophiuchus, the only constellation split into two parts (Caput and Cauda).', season: 'Summer', objects: ['M5', 'M16 Eagle Nebula'] },
  Sex: { origin: 'Hevelius 1687', myth: 'The Sextant, commemorating Hevelius\'s instrument destroyed in a fire.', season: 'Spring', objects: [] },
  Tau: { origin: 'Babylonian', myth: 'The Bull, Zeus in disguise carrying Europa across the sea. Aldebaran is its fierce eye. Home of the Pleiades.', season: 'Winter', objects: ['M1 Crab Nebula', 'M45 Pleiades', 'Hyades'] },
  Tel: { origin: 'Lacaille 1756', myth: 'The Telescope, one of Lacaille\'s scientific instruments.', season: 'Summer (S)', objects: [] },
  Tri: { origin: 'Greek', myth: 'The Triangle, representing the Nile Delta or the island of Sicily.', season: 'Autumn', objects: ['M33 Triangulum Galaxy'] },
  TrA: { origin: 'Keyser & de Houtman 1598', myth: 'The Southern Triangle, prominent in the southern Milky Way.', season: 'Summer (S)', objects: [] },
  Tuc: { origin: 'Keyser & de Houtman 1598', myth: 'The Toucan, a tropical bird from Dutch navigators\' charts.', season: 'Autumn (S)', objects: ['47 Tucanae', 'Small Magellanic Cloud'] },
  UMa: { origin: 'Greek', myth: 'The Great Bear, Callisto transformed by Hera\'s jealousy. Contains the Big Dipper asterism and Mizar-Alcor double.', season: 'Spring', objects: ['M81 Bode\'s Galaxy', 'M82 Cigar', 'M97 Owl Nebula', 'M101 Pinwheel', 'M108', 'M109'] },
  UMi: { origin: 'Greek', myth: 'The Little Bear, Arcas son of Callisto. Polaris at its tail marks the north celestial pole.', season: 'All year (N)', objects: [] },
  Vel: { origin: 'Greek (from Argo Navis)', myth: 'The Sails of the ship Argo that carried the Argonauts.', season: 'Spring (S)', objects: [] },
  Vir: { origin: 'Babylonian', myth: 'The Maiden, identified with Demeter, Persephone, or Astraea goddess of justice. Spica marks an ear of wheat.', season: 'Spring', objects: ['M49', 'M58', 'M59', 'M60', 'M61', 'M84', 'M86', 'M87 Virgo A', 'M89', 'M90', 'M104 Sombrero'] },
  Vol: { origin: 'Keyser & de Houtman 1598', myth: 'The Flying Fish, a southern constellation near Carina.', season: 'Winter (S)', objects: [] },
  Vul: { origin: 'Hevelius 1687', myth: 'The Fox, originally "the Fox and the Goose." Contains the Dumbbell Nebula.', season: 'Summer', objects: ['M27 Dumbbell Nebula'] },
};
