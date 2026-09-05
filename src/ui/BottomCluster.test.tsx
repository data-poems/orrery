import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BottomCluster from './BottomCluster';

describe('BottomCluster accessibility', () => {
  it('keeps an explicit return and tour stop when chrome is hidden', () => {
    const html = renderToStaticMarkup(<BottomCluster visible={false} accent="white"
      accentRgb="255,255,255" onAction={() => undefined} atInnermost={false}
      atOutermost={false} skyActive={false} tourActive />);
    expect(html).toContain('Show controls');
    expect(html).toContain('Stop tour');
    expect(html).not.toContain('aria-label="Zoom in"');
  });
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
