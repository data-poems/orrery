import { describe, it, expect } from 'vitest';
import { CAMS } from '../data/planets';

/**
 * Regression guard: observatory / Earth Observer must keep `observe: true`
 * so CamCtrl does not fight user OrbitControls drags.
 */
describe('CamCtrl observe preset contract', () => {
  it('Earth Observer preset is observe + follow Earth', () => {
    const preset = CAMS.find(c => c.label === 'Earth Observer');
    expect(preset).toBeDefined();
    expect(preset?.observe).toBe(true);
    expect(preset?.follow).toBe(2);
  });
});
