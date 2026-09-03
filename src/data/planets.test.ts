import { describe, it, expect } from 'vitest';
import {
  buildTextureUrls,
  CAMS,
  CAM_LABEL_ORDER,
  camIndex,
  CAM_PRESET_LAYER_EFFECTS,
} from './planets';

describe('CAMS label integrity', () => {
  it('CAM_LABEL_ORDER matches CAMS array order', () => {
    expect(CAM_LABEL_ORDER).toEqual(CAMS.map(c => c.label));
  });

  it('keyboard presets 1-9 map to indices 0-8', () => {
    for (let i = 0; i < 9; i++) {
      expect(CAMS[i].key).toBe(String(i + 1));
    }
  });

  it('cinematic tour presets resolve by label', () => {
    expect(camIndex('Oort')).toBeGreaterThanOrEqual(0);
    expect(camIndex('System')).toBeGreaterThanOrEqual(0);
    expect(camIndex('Inner')).toBeGreaterThanOrEqual(0);
    expect(camIndex('Earth Observer')).toBeGreaterThanOrEqual(0);
  });

  it('Earth Observer uses observe mode', () => {
    const earthObs = CAMS.find(c => c.label === 'Earth Observer');
    expect(earthObs?.observe).toBe(true);
    expect(earthObs?.follow).toBe(2);
  });

  it('declarative layer effects cover tour presets', () => {
    expect(CAM_PRESET_LAYER_EFFECTS.Oort?.deepSpace).toBe(true);
    expect(CAM_PRESET_LAYER_EFFECTS.Stargazer?.constellationFocus).toBe(true);
  });
});

describe('planet texture URLs', () => {
  it('uses bundled textures for Uranus and Neptune', () => {
    const textures = buildTextureUrls(false);

    expect(textures.uranus).toMatch(/textures\/uranus_2k\.jpg$/);
    expect(textures.neptune).toMatch(/textures\/neptune_2k\.jpg$/);
    expect(Object.values(textures).some(url => url.includes('cloudfront.net'))).toBe(false);
  });
});
