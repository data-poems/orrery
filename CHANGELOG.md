# Changelog

All notable changes to Orrery are documented here.

## Unreleased

### Fixed

- On a narrow screen every overview stands further back, so it shows the same
  width of the system as on a wide one. On a phone the System view stopped at
  Saturn and the Outer view cut off Neptune. The tour does the same, the +/-
  ladder, layer fades and the label at the top follow, and nothing changes on
  screens wider than 5:4.
- A planet's close-up on a narrow screen stands far enough back that its
  moons' orbits fit across it, without letting the planet drop under a fifth
  of the screen's width. The Moon's name used to clip at the edge of Earth's
  close-up on a phone.
- Moons other than Earth's have a surface. No map of their own is bundled, so
  they wear the generic cratered surface the dwarf planets use, tinted their
  own color, in place of a flat colored ball. Titan stays smooth under its
  haze.
- Today's near-Earth objects are requested when the Near-Earth objects layer
  is first turned on, not at launch, and the list is kept on the device for
  the rest of the day. The shared NASA demo key answers 30 requests an hour
  per network address, and every launch used to spend one. When the feed is
  over its limit the message says so, and turning the layer off and on asks
  again.
- A tap within 8 pixels (mouse) or 10 (finger) of the Sun or a planet is a tap
  on it, whatever smaller body is nearer still, and a body within 6 pixels of
  a more important one counts as part of it. The earlier rule compared only
  the distance between the two bodies, which on a phone standing further back
  made Jupiter unreachable at the Outer scale.
- Rotating the device re-frames the current view for the new shape. A small
  change of height, such as a phone's address bar sliding away, does not.

### Changed

- Version 1.3.3, shared native build 789: the first app build with the
  opening tour, picking, narrow-screen and near-Earth feed changes listed
  under Fixed below. Android first; no iOS 1.3.3 build has been made.
- The privacy page is dated November 25, 2026: NASA NeoWs is contacted when
  the Near-Earth objects layer is turned on (app versions 1.3.2 and earlier
  still ask at launch), and today's list is kept in localStorage.

### Fixed

- The opening tour is one continuous flight. The camera used to lunge at four
  fixed viewpoints, coast to a stop at each, wait for a timer and lunge again,
  and its clock started while the page was still loading, so the first move
  happened behind the title card. Now it spirals in from deep space to Earth
  in 15 seconds without stopping, circling about 80 degrees on the way, and
  starts when the scene is ready. The titles change when the camera reaches
  each region, and fade instead of swapping.
- The tour lands on Earth's sunlit side wherever Earth is in its orbit, passes
  beside the Sun instead of over it, and the view no longer shifts when the
  tour hands over.
- Skipping the tour leaves the view where it is. A tap used to send the camera
  to the Sun and a key press to Earth.
- One Skip tour button replaces the Exit button and the separate "tap to
  explore" line, and neither it nor the tour title shows over the loading
  card any more. Tapping anywhere still skips.
- Mercury is no longer a blank white disc. The Sun's light fell off with the
  square of distance, which gave Mercury about 55 times Earth's light and left
  Neptune nearly black. Every body is now lit like Earth.
- Closing a planet's card leaves the camera where it is, as its Close button
  says. It used to drift back out to the whole system.
- Replaying the tour pulls back from wherever the view was instead of cutting.
- A click or tap selects the body it was aimed at. Every body has an invisible
  target larger than its disc, and at system scale those targets overlap; the
  one nearest the camera used to win, so a click on the Sun selected Mercury
  and a click on Mercury from above selected the Sun. The choice is now made
  on screen: the body whose center is nearest the tap, and when two are too
  close to tell apart the more important one, so a finger on the Sun is the
  Sun at every scale. The Sun has the same 18-pixel minimum
  target as the planets.
- From far away a tap on a planet selects the planet, not one of its moons. A
  moon can be picked once its orbit is at least 24 pixels wide on screen;
  before that the planet keeps its full target, which the moons used to shrink
  to a pixel or two. A tap on a planet's disc is the planet unless it is right
  on a moon, a moon behind its planet cannot be picked through it, and a click
  on a moon is not taken by another planet's target in front of it.
- Orbiting the view and letting go over a planet no longer selects it. Only a
  tap (the pointer moving 8 pixels or less) selects.
- A selected planet is viewed from its sunlit side wherever it is in its
  orbit. The view used a fixed direction, which on this date showed Saturn and
  Neptune from their night side.
- The tour's landing arrives in two beats: Earth's card and the controls
  first, the constellations a moment later. The "Sky mode enabled" badge is
  gone; the Sky button lights and pulses, and screen readers still hear that
  Sky mode came on. The reveal is skipped if the person has already picked
  something else or used a control.
- One card at a time: a constellation, comet or spacecraft card takes the
  place of the planet's card until it is closed. They used to open on top of
  each other. Selecting the Sun, a planet or a moon closes any such card.
- On a phone, a planet's details wrap onto two rows. The row used to scroll
  sideways with nothing to say so, which cut off the last values.
- Names in the scene stop growing close up. Next to a small moon its name was
  several times taller than the moon, and its planet's name taller still.
- Closing About or Keyboard shortcuts returns to the Controls panel it was
  opened from. Escape in either dialog no longer also steps the scene back a
  level, and the scene's shortcuts wait while a dialog is open.
- Keyboard shortcuts is not listed in Controls where the main pointer is a
  finger.
- After the tour is skipped mid-flight, or a card is closed, the label at the
  top names the scale the camera is at instead of always "Full System".
- A selected body's name stays clear of the Back button in its card on a
  desktop; "Mercury" ran under it.

### Removed

- The Satellites layer, with its `I` shortcut and info card. It did not show
  up in practice. The request to CelesTrak, the bundled `stations.tle` file,
  the `satellite.js` dependency and the TLE prebake script go with it. That
  leaves three live data services: NOAA and NASA at launch, and JPL when a
  near-Earth object is selected.

### Changed

- Version 1.3.2, shared native build 788: the Android release build turns on
  R8 code and resource shrinking, which F-Droid asked for. The unsigned APK
  drops from 19,062,838 to 16,856,940 bytes (2.2 MB, 11.6%); classes.dex goes
  from 7.1 MB to 0.8 MB. Capacitor's own rules keep the plugins and the
  JavaScript bridge, so `proguard-rules.pro` adds nothing. No iOS 1.3.2 build
  has been made.
- Version 1.3.1, shared native build 787: the first release without the
  Satellites layer. Android first; no iOS 1.3.1 build has been uploaded.
- The privacy page is dated November 24, 2026, the day CelesTrak left its list
  of services.
- Version 1.3.0, shared native build 786 (785 before the laptop-pose fix): the
  iOS build, and the numbers the next Android build uses. iOS 1.3.0 (785) went to TestFlight on
  November 14 (internal group only, like 777) from af85893; IPA SHA-256
  83b940ab26da4e42480260a824188c145d4260e27a9ea93e06500b24deed140c.

### Fixed

- iPhone Duo, half-open like a laptop (build 786): info cards hang from the fold
  and span the lower half, and only one shows at a time; before, a constellation
  or comet card opened on top of the planet's details. A planet's details start
  open there with larger type, and an empty lower half says what it is for.

### Added

- iPhone Duo: standing half-open like a laptop (tabletop), the solar system
  fills the upper half and the controls and planet readout sit on the half
  resting on the table. Held sideways (book or fully open), the scene centers on
  the left page and the control strip and planet readout move to the right
  page, off the fold. Other screens,
  including the website, are unchanged. See [iPhone Duo](docs/iphone-duo.md).

### Fixed

- Android build 784, accessibility: touch targets are at least 48dp, TalkBack
  stays inside an open dialog, low-contrast text is raised to 4.5:1, names in
  the scene stop growing at 130 percent text size, and asterism names are
  readable.
- Android build 783: the launcher icon is the orrery artwork instead of the
  Android Studio template.
- Android: the bands behind the status and navigation bars are black in light
  and dark mode, with light icons, instead of white or dark gray.
- The asteroid belt, comet, meteor shower and satellite layers load their data
  once when shown. They used to reload it on every render, about 40 times a
  second, including during the opening tour.
- The opening tour's text lines no longer overlap on a phone.
- The JPL orbit lookup for a near-Earth object works in the iPhone, iPad and
  Android apps. It used a parameter JPL rejects and a request the web view was
  not allowed to read. The website still shows the approximate orbit.
- The About panel and loading screen give counts that match the bundled data.
- The solar wind speed shows in the opening tour again. NOAA changed the shape
  of its feed and the app was reading a field that no longer exists.
- Android Back closes the About and Keyboard shortcuts dialogs and returns from
  the bundled privacy page instead of leaving the app.
- At large system text sizes on Android, the tour text no longer overlaps and
  the top of the About and Keyboard shortcuts dialogs can be reached.
- Bundled the Uranus and Neptune textures so iPhone and iPad no longer depend
  on a CloudFront origin that returns 403 responses.

### Added

- An explicit Replay Cinematic Tour action in Controls.
- An iOS-only, outcome-based StoreKit review gate with unit-tested session,
  version, and cooldown rules plus a native DEBUG force hook.
- Reproducible Android release staging for versioned APK and AAB artifacts.
- Optional gitignored keystore configuration with signed APK/AAB verification.
- SHA-256 checksum and explicit signing-status files for staged Android builds.
- Android release commands and signing guidance in the project documentation.

### Changed

- The opening cinematic now auto-plays only until it has been seen; returning
  visits start in the interactive Full System view.
- The app keeps dice and ambient destinations separate from manual exploration,
  so automatic movement never advances review eligibility.
- Release metadata now uses marketing version 1.2.2 and native build 777, above
  the current global App Store Connect build floor of 22.
- Android now reads the marketing version from `package.json`, verifies it
  matches iOS, and reuses the iOS native build number as `versionCode`.
- Android Capacitor builds have a dedicated relative-path build command while
  preserving the existing low-GPU Android rendering profile.
