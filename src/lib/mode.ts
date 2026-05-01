/*
 * Entry mode — determined once at module load from the URL path.
 *
 * /observatory/* boots into Inner Planets view + Stargazer with no cinematic,
 * and suppresses solar-system-scale elements like the Oort Cloud.
 */

export const OBSERVATORY_MODE: boolean =
  typeof window !== 'undefined' && window.location.pathname.startsWith('/observatory');
