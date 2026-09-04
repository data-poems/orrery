import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import SidePanel from './SidePanel';

const renderPanel = (open: boolean) => renderToStaticMarkup(createElement(SidePanel, {
  accent: '#7ee7d8',
  layerState: {},
  onAction: vi.fn(),
  open,
  onOpenChange: vi.fn(),
}));

describe('SidePanel controlled state', () => {
  it('renders from the parent-owned open state used by Android Back', () => {
    expect(renderPanel(true)).toContain('transform:translateX(0)');
    expect(renderPanel(false)).toContain('transform:translateX(100%)');
  });
});
