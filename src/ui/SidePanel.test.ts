// @vitest-environment jsdom
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

  it('lets enlarged control labels grow their rows and scale buttons wrap', () => {
    const doc = document.implementation.createHTMLDocument();
    doc.body.innerHTML = renderPanel(true);
    const buttons = Array.from(doc.querySelectorAll('button'));
    for (const label of ['Replay cinematic tour', 'Near-Earth objects', 'Meteor showers']) {
      const button = buttons.find(item => item.textContent?.includes(label))!;
      expect(button.style.height).toBe('');
      expect(button.style.minHeight).toBe('48px');
    }
    const inner = buttons.find(item => item.textContent === 'Inner')!;
    expect(inner.parentElement?.style.flexWrap).toBe('wrap');
    expect(inner.style.height).toBe('');
    expect(inner.style.minHeight).toBe('44px');
  });
});
