# Minimalist HUD — design

## Context

The summoned radial/sun-fan control surface kept missing. The goal is a
minimal, modal-free HUD: at rest, nothing but the orrery; controls and
selected-body stats appear quietly and never as boxed modal cards.

## Model

**Control bar — bottom-center expander.**
- Collapsed: a single small primary element at bottom-center.
- Hover (pointer) / tap (touch) extends icons symmetrically to each side along
  the bottom edge: `[Layers] [Sky] [View]  ⦿  [−] [+] [Dice] [Info]`
  (order/placement tuned visually). Zoom −/+ and Dice are the frequent,
  front-line actions; Layers/Sky/View/Info are settings.
- Items with sub-options (Layers, View) pop their choices in a small row just
  ABOVE the bar when activated; selecting one applies and collapses.
- Idle-fades: fades out after a few seconds of no interaction, wakes on any
  interaction. Keyboard/Siri-Remote: arrows traverse, Enter activates, Escape
  collapses.

**Selected-body display — no modal.**
- The body's NAME shows as a large, soft label positioned near it.
- Its stats run as a quiet, unboxed text column down the LEFT edge
  (distance, period, gravity, temp, moons, etc.).
- Clear via clicking empty space / Escape (existing navigateBack).

## Changes

- New: `src/ui/ControlBar.tsx` (the expander), `src/ui/BodyStats.tsx`
  (left-edge column + on-body name label).
- Remove: `src/ui/SolarArc.tsx` (sun-fan) and its Orrery wiring; the `SunHub`
  preset + `fastApproach`; the modal planet/moon/sun selection card in
  `Panels.tsx` (replaced by BodyStats). Other object cards (NEO/comet/etc) can
  follow the same pattern later.
- Wire in `Orrery.tsx`: the bar dispatches the same actions
  (tour/dice/preset/layer/toggleSky/info); selection feeds BodyStats.

## Verification

Headless-Chrome screenshots of the running app at each step: bar collapsed
(rest), bar expanded, a sub-option row, a selected body (name + left column).
tsc · lint · tests · build green.
