/*
 * Constellation metadata — all 88 IAU constellations with full mythology
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
  // ─── Zodiac ───────────────────────────────────────────────────────────────────
  {
    id: 'Ari', name: 'Aries', nameEn: 'The Ram',
    mythology: 'The golden-fleeced ram that rescued Phrixus and Helle, later sacrificed and its fleece hung in Colchis. The quest to recover it became the voyage of the Argonauts. Once held the vernal equinox.',
    brightestStar: 'Hamal (2.01)', season: 'Autumn', area: 441, zodiac: true,
  },
  {
    id: 'Tau', name: 'Taurus', nameEn: 'The Bull',
    mythology: 'Zeus transformed into a white bull to carry Europa across the sea to Crete. Contains the Pleiades cluster and the Hyades. The red eye of the bull is Aldebaran, a giant star 65 light-years away.',
    brightestStar: 'Aldebaran (0.87)', season: 'Winter', area: 797, zodiac: true,
  },
  {
    id: 'Gem', name: 'Gemini', nameEn: 'The Twins',
    mythology: 'Castor and Pollux, twin brothers from Greek myth. When mortal Castor died, Pollux begged Zeus to let them share immortality. They alternate between Olympus and the underworld, inseparable even in death.',
    brightestStar: 'Pollux (1.14)', season: 'Winter', area: 514, zodiac: true,
  },
  {
    id: 'Cnc', name: 'Cancer', nameEn: 'The Crab',
    mythology: 'Hera sent a giant crab to distract Heracles during his battle with the Hydra. Though crushed underfoot, Hera rewarded its loyalty with a place among the stars. The Beehive Cluster (M44) glows at its heart.',
    brightestStar: 'Tarf (3.53)', season: 'Spring', area: 506, zodiac: true,
  },
  {
    id: 'Leo', name: 'Leo', nameEn: 'The Lion',
    mythology: 'The Nemean Lion slain by Heracles as the first of his twelve labors. Its hide was impervious to weapons, so Heracles strangled it. The sickle-shaped asterism of its mane is distinctive in the spring sky.',
    brightestStar: 'Regulus (1.36)', season: 'Spring', area: 947, zodiac: true,
  },
  {
    id: 'Vir', name: 'Virgo', nameEn: 'The Maiden',
    mythology: 'Often associated with Demeter or Persephone, goddesses of harvest and seasons. Spica marks the sheaf of wheat she holds. The Virgo Cluster of galaxies lies within its boundaries.',
    brightestStar: 'Spica (0.98)', season: 'Spring', area: 1294, zodiac: true,
  },
  {
    id: 'Lib', name: 'Libra', nameEn: 'The Scales',
    mythology: 'The scales of Astraea, goddess of justice, who weighed the souls of the dead. The Romans carved this zodiac sign from the claws of neighboring Scorpius. Its two brightest stars still bear Arabic names meaning "northern claw" and "southern claw."',
    brightestStar: 'Zubeneschamali (2.61)', season: 'Spring', area: 538, zodiac: true,
  },
  {
    id: 'Sco', name: 'Scorpius', nameEn: 'The Scorpion',
    mythology: 'The scorpion sent by Gaia to defeat Orion. Its heart is the red supergiant Antares, whose name means "rival of Mars" for its ruddy color. One of the few constellations that genuinely resembles its namesake.',
    brightestStar: 'Antares (1.06)', season: 'Summer', area: 497, zodiac: true,
  },
  {
    id: 'Sgr', name: 'Sagittarius', nameEn: 'The Archer',
    mythology: 'A centaur archer aiming his bow at Scorpius. The center of our Milky Way galaxy lies in this direction. The Teapot asterism is easier to spot than the full archer figure.',
    brightestStar: 'Kaus Australis (1.79)', season: 'Summer', area: 867, zodiac: true,
  },
  {
    id: 'Cap', name: 'Capricornus', nameEn: 'Sea Goat',
    mythology: 'Pan, the goat-god, dove into the Nile to escape the monster Typhon and transformed his lower half into a fish. Zeus commemorated the half-goat, half-fish form in the sky. One of the oldest recognized constellations, dating to Babylonian star catalogs.',
    brightestStar: 'Deneb Algedi (2.85)', season: 'Autumn', area: 414, zodiac: true,
  },
  {
    id: 'Aqr', name: 'Aquarius', nameEn: 'Water Bearer',
    mythology: 'Ganymede, the beautiful Trojan youth abducted by Zeus in the form of an eagle to serve as cupbearer to the gods. The water he pours flows into the mouth of Piscis Austrinus below. Ancient Babylonians associated this region with their god of water, Ea.',
    brightestStar: 'Sadalsuud (2.87)', season: 'Autumn', area: 980, zodiac: true,
  },
  {
    id: 'Psc', name: 'Pisces', nameEn: 'The Fish',
    mythology: 'Aphrodite and Eros transformed into fish and tied themselves together with cord to escape the monster Typhon. The two fish swim in opposite directions, bound by a ribbon of stars. The vernal equinox currently lies within its borders.',
    brightestStar: 'Alpherg (3.62)', season: 'Autumn', area: 889, zodiac: true,
  },

  // ─── Major classical constellations ───────────────────────────────────────────
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
    id: 'CMa', name: 'Canis Major', nameEn: 'Great Dog',
    mythology: 'One of Orion\'s hunting dogs, faithful companion following the hunter across the sky. Contains Sirius, the brightest star in the night sky, whose heliacal rising marked the flooding of the Nile for ancient Egyptians.',
    brightestStar: 'Sirius (-1.46)', season: 'Winter', area: 380, zodiac: false,
  },
  {
    id: 'CMi', name: 'Canis Minor', nameEn: 'Little Dog',
    mythology: 'Orion\'s smaller hunting dog, or perhaps Maera, the faithful hound of Icarius who led his daughter to his grave. Procyon, its brightest star, rises just before Sirius and its name means "before the dog" in Greek.',
    brightestStar: 'Procyon (0.34)', season: 'Winter', area: 183, zodiac: false,
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
    id: 'Cru', name: 'Crux', nameEn: 'Southern Cross',
    mythology: 'The smallest constellation but culturally vital for southern hemisphere navigation. European explorers named it during the Age of Discovery. Its long axis points roughly toward the south celestial pole.',
    brightestStar: 'Acrux (0.77)', season: 'Spring', area: 68, zodiac: false,
  },
  {
    id: 'Boo', name: 'Bootes', nameEn: 'The Herdsman',
    mythology: 'The plowman who drives the oxen of Ursa Major around the pole. Some myths identify him as Arcas, son of Callisto, or Icarius, who introduced wine to humanity. Arcturus, the fourth-brightest star in the sky, marks his left knee.',
    brightestStar: 'Arcturus (-0.05)', season: 'Spring', area: 907, zodiac: false,
  },
  {
    id: 'Her', name: 'Hercules', nameEn: 'The Strongman',
    mythology: 'The greatest of Greek heroes, son of Zeus and Alcmene, who completed twelve impossible labors. He kneels in the sky with one foot on the head of Draco. The great globular cluster M13, containing 300,000 stars, sits in his torso.',
    brightestStar: 'Kornephoros (2.78)', season: 'Summer', area: 1225, zodiac: false,
  },
  {
    id: 'Oph', name: 'Ophiuchus', nameEn: 'Serpent Bearer',
    mythology: 'Asclepius, the healer so skilled he could raise the dead, holding the serpent whose venom taught him medicine. Zeus struck him down at Hades\' complaint and placed him in the sky. The ecliptic passes through this constellation, making it the unofficial thirteenth zodiac sign.',
    brightestStar: 'Rasalhague (2.08)', season: 'Summer', area: 948, zodiac: false,
  },
  {
    id: 'Ser', name: 'Serpens', nameEn: 'The Serpent',
    mythology: 'The only constellation split into two parts: Serpens Caput (head) and Serpens Cauda (tail), divided by Ophiuchus who grasps it. The serpent symbolizes the healing wisdom of Asclepius. The Eagle Nebula (M16) with its "Pillars of Creation" lies within Serpens Cauda.',
    brightestStar: 'Unukalhai (2.63)', season: 'Summer', area: 637, zodiac: false,
  },
  {
    id: 'Peg', name: 'Pegasus', nameEn: 'The Winged Horse',
    mythology: 'The winged horse that sprang from the blood of Medusa when Perseus beheaded her. Bellerophon rode Pegasus to slay the Chimera but fell when he tried to reach Olympus. The Great Square of Pegasus is one of the sky\'s most recognizable asterisms.',
    brightestStar: 'Enif (2.38)', season: 'Autumn', area: 1121, zodiac: false,
  },
  {
    id: 'Cep', name: 'Cepheus', nameEn: 'The King',
    mythology: 'King of Ethiopia, husband of Cassiopeia and father of Andromeda. His family drama played out in neighboring constellations. Delta Cephei established the period-luminosity relationship that became the cosmic distance ladder.',
    brightestStar: 'Alderamin (2.51)', season: 'Autumn', area: 588, zodiac: false,
  },
  {
    id: 'Cet', name: 'Cetus', nameEn: 'The Whale',
    mythology: 'The sea monster sent by Poseidon to devour Andromeda, turned to stone by Perseus wielding Medusa\'s head. Mira, the "Wonderful Star," was the first variable star discovered, pulsing from visible to invisible over 332 days.',
    brightestStar: 'Diphda (2.04)', season: 'Autumn', area: 1231, zodiac: false,
  },
  {
    id: 'Dra', name: 'Draco', nameEn: 'The Dragon',
    mythology: 'Ladon, the hundred-headed dragon who guarded the golden apples in the garden of the Hesperides. Heracles slew him as his eleventh labor. The dragon winds between the two bears, and Thuban in its tail was the pole star when the pyramids were built.',
    brightestStar: 'Eltanin (2.24)', season: 'Summer', area: 1083, zodiac: false,
  },
  {
    id: 'Hya', name: 'Hydra', nameEn: 'Water Snake',
    mythology: 'The multi-headed serpent of Lerna slain by Heracles as his second labor. Each time he cut off a head, two grew back, until his nephew Iolaus cauterized the stumps. It is the largest constellation by area, stretching across a quarter of the sky.',
    brightestStar: 'Alphard (1.98)', season: 'Spring', area: 1303, zodiac: false,
  },
  {
    id: 'Eri', name: 'Eridanus', nameEn: 'The River',
    mythology: 'The celestial river, sometimes identified as the path Phaethon burned across the sky when he lost control of the Sun\'s chariot. It meanders from Orion\'s foot southward to brilliant Achernar, the ninth-brightest star, whose name means "end of the river."',
    brightestStar: 'Achernar (0.46)', season: 'Winter', area: 1138, zodiac: false,
  },
  {
    id: 'Lep', name: 'Lepus', nameEn: 'The Hare',
    mythology: 'A hare crouching beneath the feet of Orion, fleeing his hunting dogs Canis Major and Canis Minor. Some accounts say it was placed in the sky because hares were Orion\'s favorite quarry. R Leporis, "Hind\'s Crimson Star," is one of the reddest stars visible in telescopes.',
    brightestStar: 'Arneb (2.58)', season: 'Winter', area: 290, zodiac: false,
  },
  {
    id: 'CrB', name: 'Corona Borealis', nameEn: 'Northern Crown',
    mythology: 'The crown given by Dionysus to Ariadne after Theseus abandoned her on Naxos. When she died, Dionysus threw the crown into the sky in grief. Its semicircle of stars is one of the most elegant shapes in the heavens.',
    brightestStar: 'Alphecca (2.22)', season: 'Summer', area: 179, zodiac: false,
  },
  {
    id: 'Crv', name: 'Corvus', nameEn: 'The Crow',
    mythology: 'Apollo sent the crow to fetch water in a cup (Crater), but it lingered to eat figs and returned late with a water snake (Hydra) as a false excuse. Apollo saw through the lie and banished all three to the sky, cursing the crow with a harsh voice.',
    brightestStar: 'Gienah (2.59)', season: 'Spring', area: 184, zodiac: false,
  },
  {
    id: 'Crt', name: 'Crater', nameEn: 'The Cup',
    mythology: 'The cup Apollo gave to the crow for fetching water. After the crow\'s lie, Apollo placed the cup in the sky just out of the thirsty crow\'s reach, with Hydra guarding it between them. It represents the sacred goblet of the gods.',
    brightestStar: 'Labrum (3.56)', season: 'Spring', area: 282, zodiac: false,
  },
  {
    id: 'Del', name: 'Delphinus', nameEn: 'The Dolphin',
    mythology: 'The dolphin that persuaded the sea nymph Amphitrite to marry Poseidon. As reward, Poseidon placed the dolphin among the stars. Its compact diamond-and-tail shape earned it the nickname "Job\'s Coffin" in medieval star lore.',
    brightestStar: 'Rotanev (3.63)', season: 'Summer', area: 189, zodiac: false,
  },
  {
    id: 'Equ', name: 'Equuleus', nameEn: 'Little Horse',
    mythology: 'The foal Celeris, brother of Pegasus, given by Hermes to Castor. It is the second-smallest constellation, showing only a horse\'s head peeking above the horizon. Despite its obscurity, it was among Ptolemy\'s original 48 constellations.',
    brightestStar: 'Kitalpha (3.92)', season: 'Autumn', area: 72, zodiac: false,
  },
  {
    id: 'Tri', name: 'Triangulum', nameEn: 'The Triangle',
    mythology: 'The Greeks saw it as the island of Sicily, which Demeter asked Zeus to place in the sky. Its simple three-star shape was recognized by nearly every ancient civilization. It hosts the Triangulum Galaxy (M33), the third-largest member of our Local Group.',
    brightestStar: 'Beta Trianguli (3.00)', season: 'Autumn', area: 132, zodiac: false,
  },
  {
    id: 'CVn', name: 'Canes Venatici', nameEn: 'Hunting Dogs',
    mythology: 'Asterion and Chara, the two dogs held on a leash by Bootes as they chase the bears around the pole. Created by Hevelius in 1687 from faint stars between Ursa Major and Bootes. Cor Caroli, the "Heart of Charles," was named for King Charles I of England.',
    brightestStar: 'Cor Caroli (2.89)', season: 'Spring', area: 465, zodiac: false,
  },
  {
    id: 'Com', name: 'Coma Berenices', nameEn: "Berenice's Hair",
    mythology: 'Queen Berenice II of Egypt cut off her golden hair as an offering so her husband would return safely from war. The hair vanished from the temple, and the astronomer Conon declared the gods had placed it among the stars. The Coma Cluster of galaxies lies within its boundaries.',
    brightestStar: 'Beta Comae Berenices (4.26)', season: 'Spring', area: 386, zodiac: false,
  },
  {
    id: 'Lup', name: 'Lupus', nameEn: 'The Wolf',
    mythology: 'In Greek tradition, an unspecified wild animal impaled on a pole carried by Centaurus as an offering to the gods. The Romans identified it as a wolf. Its position deep in the Milky Way fills it with rich star fields and nebulae.',
    brightestStar: 'Alpha Lupi (2.30)', season: 'Summer', area: 334, zodiac: false,
  },
  {
    id: 'CrA', name: 'Corona Australis', nameEn: 'Southern Crown',
    mythology: 'The crown that fell from Sagittarius\'s head, or the wreath placed at the feet of Centaurus. Aratus described it in the third century BCE. Its delicate arc of faint stars mirrors its northern counterpart, Corona Borealis, in elegance.',
    brightestStar: 'Meridiana (4.10)', season: 'Summer', area: 128, zodiac: false,
  },
  {
    id: 'Sge', name: 'Sagitta', nameEn: 'The Arrow',
    mythology: 'One of the arrows of Heracles, used to kill the eagle (Aquila) that tormented Prometheus. The third-smallest constellation, it is an ancient figure recognized by both Greeks and Romans. Despite its small size, it sits in a rich part of the Milky Way.',
    brightestStar: 'Gamma Sagittae (3.47)', season: 'Summer', area: 80, zodiac: false,
  },
  {
    id: 'Vul', name: 'Vulpecula', nameEn: 'The Fox',
    mythology: 'Originally "Vulpecula cum Ansere" (the fox with the goose), created by Hevelius in 1687. The goose was later dropped from the name but lives on in the star Anser. The Dumbbell Nebula (M27), one of the finest planetary nebulae, lies within its borders.',
    brightestStar: 'Anser (4.44)', season: 'Summer', area: 268, zodiac: false,
  },
  {
    id: 'Lac', name: 'Lacerta', nameEn: 'The Lizard',
    mythology: 'Created by Hevelius in 1687 from faint stars between Cygnus and Andromeda. The area was contested: other astronomers tried to name it after Louis XIV or Frederick the Great, but the humble lizard prevailed. BL Lacertae, found here, defined an entire class of active galaxies.',
    brightestStar: 'Alpha Lacertae (3.77)', season: 'Autumn', area: 201, zodiac: false,
  },
  {
    id: 'Mon', name: 'Monoceros', nameEn: 'The Unicorn',
    mythology: 'A faint constellation mapped by Plancius around 1612, filling the gap between Orion\'s dogs. Though it lacks bright stars, it straddles the winter Milky Way and contains the Rosette Nebula, a spectacular stellar nursery shaped like a cosmic flower.',
    brightestStar: 'Beta Monocerotis (3.76)', season: 'Winter', area: 482, zodiac: false,
  },
  {
    id: 'Sex', name: 'Sextans', nameEn: 'The Sextant',
    mythology: 'Created by Hevelius in 1687 to honor the astronomical sextant he used for precise star measurements, destroyed when his observatory burned in 1679. A faint equatorial constellation straddling the celestial equator south of Leo.',
    brightestStar: 'Alpha Sextantis (4.49)', season: 'Spring', area: 314, zodiac: false,
  },
  {
    id: 'Lyn', name: 'Lynx', nameEn: 'The Lynx',
    mythology: 'Hevelius named it in 1687, joking that you would need the eyes of a lynx to see its faint stars. It fills a large but barren region between Ursa Major and Auriga. Despite its dimness, it spans nearly 545 square degrees of sky.',
    brightestStar: 'Alpha Lyncis (3.14)', season: 'Winter', area: 545, zodiac: false,
  },
  {
    id: 'Sct', name: 'Scutum', nameEn: "Sobieski's Shield",
    mythology: 'Created by Hevelius in 1684 to honor the Polish king Jan III Sobieski, who defeated the Ottoman army at Vienna in 1683. Though small, it lies in one of the brightest parts of the Milky Way. The Wild Duck Cluster (M11) is one of the richest open clusters known.',
    brightestStar: 'Alpha Scuti (3.85)', season: 'Summer', area: 109, zodiac: false,
  },
  {
    id: 'PsA', name: 'Piscis Austrinus', nameEn: 'Southern Fish',
    mythology: 'The great fish that drinks the water poured by Aquarius, an image dating to Babylonian times. Fomalhaut, its brilliant star, was one of the four "Royal Stars" of ancient Persia guarding the sky. In 2008, one of the first exoplanets was directly imaged orbiting Fomalhaut.',
    brightestStar: 'Fomalhaut (1.16)', season: 'Autumn', area: 245, zodiac: false,
  },
  {
    id: 'Phe', name: 'Phoenix', nameEn: 'The Phoenix',
    mythology: 'Named by Keyser and de Houtman around 1596 for the mythical bird that burns and is reborn from its ashes. It was one of twelve new southern constellations mapped during Dutch trading voyages. Ankaa, its brightest star, derives from the Arabic for "the phoenix."',
    brightestStar: 'Ankaa (2.40)', season: 'Autumn', area: 469, zodiac: false,
  },
  {
    id: 'Gru', name: 'Grus', nameEn: 'The Crane',
    mythology: 'One of the southern constellations created by Keyser and de Houtman from Dutch trading expedition observations. The crane was sacred to Hermes in Greek tradition and symbolized vigilance. Alnair, its brightest star, means "the bright one" in Arabic.',
    brightestStar: 'Alnair (1.73)', season: 'Autumn', area: 366, zodiac: false,
  },
  {
    id: 'Scl', name: 'Sculptor', nameEn: 'The Sculptor',
    mythology: 'Originally "Apparatus Sculptoris" (the sculptor\'s workshop), created by Lacaille in 1751-52 during his expedition to the Cape of Good Hope. The south galactic pole lies within its borders. The Sculptor Dwarf Galaxy, a satellite of the Milky Way, was discovered here.',
    brightestStar: 'Alpha Sculptoris (4.31)', season: 'Autumn', area: 475, zodiac: false,
  },
  {
    id: 'For', name: 'Fornax', nameEn: 'The Furnace',
    mythology: 'Originally "Fornax Chemica" (the chemical furnace), created by Lacaille to honor Antoine Lavoisier\'s laboratory equipment. A nondescript southern constellation, it harbors the Fornax Cluster of galaxies and the Hubble Ultra Deep Field, one of the deepest images ever taken.',
    brightestStar: 'Alpha Fornacis (3.87)', season: 'Autumn', area: 398, zodiac: false,
  },

  // ─── Southern constellations (ship Argo and surrounds) ────────────────────────
  {
    id: 'Car', name: 'Carina', nameEn: 'The Keel',
    mythology: 'The keel of the great ship Argo, which carried Jason and the Argonauts to find the Golden Fleece. Lacaille divided the ancient mega-constellation Argo Navis into three parts. Canopus, its jewel, is the second-brightest star in the night sky.',
    brightestStar: 'Canopus (-0.72)', season: 'Winter', area: 494, zodiac: false,
  },
  {
    id: 'Pup', name: 'Puppis', nameEn: 'The Stern',
    mythology: 'The stern of the ship Argo Navis, separated by Lacaille in 1763. Rich in open clusters because it looks along the plane of the Milky Way. Naos (Zeta Puppis) is one of the hottest and most luminous stars visible to the naked eye.',
    brightestStar: 'Naos (2.21)', season: 'Winter', area: 673, zodiac: false,
  },
  {
    id: 'Vel', name: 'Vela', nameEn: 'The Sails',
    mythology: 'The sails of the ship Argo, billowing with divine winds as the Argonauts sailed to Colchis. Gamma Velorum is actually a complex multiple star system containing a Wolf-Rayet star, one of the most massive and luminous known. The Vela Supernova Remnant sprawls across its territory.',
    brightestStar: 'Gamma Velorum (1.75)', season: 'Spring', area: 500, zodiac: false,
  },
  {
    id: 'Pyx', name: 'Pyxis', nameEn: 'The Compass',
    mythology: 'The mariner\'s compass, added by Lacaille near the remains of Argo Navis. Though not part of the original ship, it logically sits where a compass might be. T Pyxidis is a recurrent nova that has erupted six times since 1890.',
    brightestStar: 'Alpha Pyxidis (3.68)', season: 'Spring', area: 221, zodiac: false,
  },
  {
    id: 'Col', name: 'Columba', nameEn: 'The Dove',
    mythology: 'The dove sent by the Argonauts to test passage through the Clashing Rocks. When the dove passed safely, losing only its tail feathers, the crew rowed through. Petrus Plancius separated it from Canis Major in 1592.',
    brightestStar: 'Phact (2.64)', season: 'Winter', area: 270, zodiac: false,
  },

  // ─── Deep southern constellations ─────────────────────────────────────────────
  {
    id: 'Pav', name: 'Pavo', nameEn: 'The Peacock',
    mythology: 'The peacock of Hera, whose tail feathers bore the hundred eyes of the giant Argus after Hermes slew him. One of the Keyser-de Houtman southern constellations from the 1590s. Its brightest star was officially named Peacock by the IAU.',
    brightestStar: 'Peacock (1.94)', season: 'Summer', area: 378, zodiac: false,
  },
  {
    id: 'Ind', name: 'Indus', nameEn: 'The Indian',
    mythology: 'Intended to represent indigenous peoples encountered by European explorers during the Age of Discovery. Created by Keyser and de Houtman around 1596. Epsilon Indi, a nearby orange dwarf just 12 light-years away, is one of the closest sun-like stars.',
    brightestStar: 'Alpha Indi (3.11)', season: 'Autumn', area: 294, zodiac: false,
  },
  {
    id: 'Tuc', name: 'Tucana', nameEn: 'The Toucan',
    mythology: 'Named for the colorful South American bird by Keyser and de Houtman. It contains the Small Magellanic Cloud, a satellite galaxy visible to the naked eye, and 47 Tucanae, one of the finest globular clusters in the sky.',
    brightestStar: 'Alpha Tucanae (2.87)', season: 'Autumn', area: 295, zodiac: false,
  },
  {
    id: 'Hyi', name: 'Hydrus', nameEn: 'Little Water Snake',
    mythology: 'Created by Keyser and de Houtman as the southern counterpart to Hydra. It lies between the Magellanic Clouds and the south celestial pole. Not to be confused with the much larger Hydra in the northern sky.',
    brightestStar: 'Beta Hydri (2.80)', season: 'Autumn', area: 243, zodiac: false,
  },
  {
    id: 'Dor', name: 'Dorado', nameEn: 'The Swordfish',
    mythology: 'Named for the mahi-mahi (dolphinfish) observed by Dutch navigators in tropical seas. It hosts the Large Magellanic Cloud, the Milky Way\'s largest satellite galaxy, and the Tarantula Nebula, the most active star-forming region in the Local Group.',
    brightestStar: 'Alpha Doradus (3.27)', season: 'Winter', area: 179, zodiac: false,
  },
  {
    id: 'Vol', name: 'Volans', nameEn: 'Flying Fish',
    mythology: 'The flying fish, seen leaping from the sea to escape the predatory swordfish (Dorado). Created by Keyser and de Houtman from observations during Dutch trading voyages to the East Indies in the 1590s.',
    brightestStar: 'Beta Volantis (3.77)', season: 'Winter', area: 141, zodiac: false,
  },
  {
    id: 'Pic', name: 'Pictor', nameEn: 'The Painter',
    mythology: 'Originally "Equuleus Pictoris" (the painter\'s easel), created by Lacaille. Beta Pictoris was the first star found to have a debris disk, photographed in 1984, and later revealed to harbor at least two giant exoplanets.',
    brightestStar: 'Alpha Pictoris (3.24)', season: 'Winter', area: 247, zodiac: false,
  },
  {
    id: 'Ret', name: 'Reticulum', nameEn: 'The Net',
    mythology: 'Originally "Reticulum Rhomboidalis," Lacaille created it to honor the reticle (crosshair eyepiece) he used for measuring star positions at the Cape of Good Hope. Zeta Reticuli, a binary system 39 light-years away, became famous in UFO lore.',
    brightestStar: 'Alpha Reticuli (3.33)', season: 'Winter', area: 114, zodiac: false,
  },
  {
    id: 'Hor', name: 'Horologium', nameEn: 'The Clock',
    mythology: 'Created by Lacaille to honor the pendulum clock, a crucial instrument for astronomical timekeeping. Christian Huygens invented the pendulum clock in 1656, revolutionizing the precision of celestial observations.',
    brightestStar: 'Alpha Horologii (3.86)', season: 'Winter', area: 249, zodiac: false,
  },
  {
    id: 'Cae', name: 'Caelum', nameEn: 'Chisel',
    mythology: 'Originally "Caela Sculptoris" (the sculptor\'s chisels), created by Lacaille. One of the faintest and most obscure constellations, with no star brighter than magnitude 4.4. It occupies one of the emptiest regions of the southern sky.',
    brightestStar: 'Alpha Caeli (4.44)', season: 'Winter', area: 125, zodiac: false,
  },
  {
    id: 'Mus', name: 'Musca', nameEn: 'The Fly',
    mythology: 'Originally "Apis" (the bee) when Keyser and de Houtman created it. Lacaille renamed it Musca to avoid confusion. It is the only insect among the 88 constellations. A dark nebula called the Dark Doodad stretches across its southern border.',
    brightestStar: 'Alpha Muscae (2.69)', season: 'Spring', area: 138, zodiac: false,
  },
  {
    id: 'TrA', name: 'Triangulum Australe', nameEn: 'Southern Triangle',
    mythology: 'The southern counterpart of Triangulum, created by Keyser and de Houtman. Its three brightest stars form a nearly perfect equilateral triangle, making it easy to identify near Alpha Centauri. Atria, its brightest star, is an orange giant 415 light-years away.',
    brightestStar: 'Atria (1.91)', season: 'Summer', area: 110, zodiac: false,
  },
  {
    id: 'Nor', name: 'Norma', nameEn: 'The Level',
    mythology: 'Originally "Norma et Regula" (the level and square), created by Lacaille for the carpenter\'s tools. It absorbed several stars formerly belonging to Scorpius and Ara. The Norma Cluster of galaxies lies within its boundaries.',
    brightestStar: 'Gamma2 Normae (4.02)', season: 'Summer', area: 165, zodiac: false,
  },
  {
    id: 'Cir', name: 'Circinus', nameEn: 'Compass',
    mythology: 'The draftsman\'s compass (not the mariner\'s), created by Lacaille from faint stars near Alpha Centauri. The fourth-smallest constellation, it lies in a rich region of the Milky Way. Circinus X-1 is one of the brightest X-ray sources in the sky.',
    brightestStar: 'Alpha Circini (3.19)', season: 'Winter', area: 93, zodiac: false,
  },
  {
    id: 'Aps', name: 'Apus', nameEn: 'Bird of Paradise',
    mythology: 'Named for the bird of paradise by Keyser and de Houtman. Early European naturalists believed these birds lacked feet, as trade skins arrived with feet removed. The name "Apus" literally means "footless" in Greek.',
    brightestStar: 'Alpha Apodis (3.83)', season: 'Winter', area: 206, zodiac: false,
  },
  {
    id: 'Cha', name: 'Chamaeleon', nameEn: 'Chameleon',
    mythology: 'The chameleon, one of the twelve southern constellations introduced by Keyser and de Houtman from their observations in the East Indies. It lies near the south celestial pole and contains several faint nebulae and young stellar associations.',
    brightestStar: 'Alpha Chamaeleontis (4.07)', season: 'Spring', area: 132, zodiac: false,
  },
  {
    id: 'Oct', name: 'Octans', nameEn: 'The Octant',
    mythology: 'Created by Lacaille for the reflecting octant, predecessor of the sextant, invented by John Hadley in 1731. It contains the south celestial pole, though its pole star Sigma Octantis is barely visible at magnitude 5.4, unlike its brilliant northern counterpart Polaris.',
    brightestStar: 'Nu Octantis (3.76)', season: 'Year-round', area: 291, zodiac: false,
  },
  {
    id: 'Men', name: 'Mensa', nameEn: 'Table Mountain',
    mythology: 'Named by Lacaille for Table Mountain in Cape Town, where he conducted his southern sky survey. Part of the Large Magellanic Cloud extends into it, resembling the cloud cap that often sits atop the real mountain. It is the only constellation named for a terrestrial feature.',
    brightestStar: 'Alpha Mensae (5.09)', season: 'Winter', area: 153, zodiac: false,
  },
  {
    id: 'Tel', name: 'Telescopium', nameEn: 'The Telescope',
    mythology: 'Created by Lacaille to honor the telescope, the instrument that transformed astronomy. Its original boundaries were larger, but subsequent remapping gave some of its stars to neighboring constellations. A faint but historically meaningful tribute to scientific innovation.',
    brightestStar: 'Alpha Telescopii (3.49)', season: 'Summer', area: 252, zodiac: false,
  },
  {
    id: 'Mic', name: 'Microscopium', nameEn: 'The Microscope',
    mythology: 'Lacaille named it for the compound microscope, pairing it with Telescopium as tributes to optical instruments. One of the faintest constellations, it contains no star brighter than magnitude 4.7. The microscope it honors revolutionized biology as the telescope did astronomy.',
    brightestStar: 'Gamma Microscopii (4.67)', season: 'Autumn', area: 210, zodiac: false,
  },
  {
    id: 'Ant', name: 'Antlia', nameEn: 'Air Pump',
    mythology: 'Originally "Antlia Pneumatica," Lacaille named it for the air pump invented by Robert Boyle. Its brightest star barely reaches magnitude 4.2. Though one of the least conspicuous constellations, it commemorates the dawn of experimental physics.',
    brightestStar: 'Alpha Antliae (4.25)', season: 'Spring', area: 239, zodiac: false,
  },
  {
    id: 'Cam', name: 'Camelopardalis', nameEn: 'Giraffe',
    mythology: 'Created by Plancius in 1612, representing the camel that carried Rebecca to Isaac in the Bible, or perhaps the giraffe the Romans called "camelopardalis" (camel-leopard). A vast, dim circumpolar constellation with few notable features but enormous empty skies.',
    brightestStar: 'Beta Camelopardalis (4.03)', season: 'Winter', area: 757, zodiac: false,
  },
];

/** Lookup by IAU abbreviation */
export function findConstellation(id: string): ConstellationMeta | undefined {
  return CONSTELLATIONS.find(c => c.id === id || c.id.toLowerCase() === id.toLowerCase());
}
