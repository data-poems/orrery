import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BottomCluster from './BottomCluster';

describe('BottomCluster accessibility', () => {
  it('keeps visible text alternatives inside WebView toggle buttons', () => {
    const html = renderToStaticMarkup(
      <BottomCluster
        visible
        accent="#ffffff"
        accentRgb="255,255,255"
        onAction={() => undefined}
        atInnermost={false}
        atOutermost={false}
        skyActive
        tourActive={false}
      />,
    );

    expect(html).toContain('aria-label="Stargaze — sky and constellations"');
    expect(html).toContain('>Stargaze — sky and constellations</span>');
    expect(html).toContain('aria-label="Start ambient tour"');
    expect(html).toContain('>Start ambient tour</span>');
  });
});
