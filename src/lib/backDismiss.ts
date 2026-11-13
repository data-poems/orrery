/*
 * Things Android's Back should close before anything else: dialogs that keep
 * their open state inside a component (About, Keyboard shortcuts), where the
 * Back handler in Orrery.tsx cannot see it. A component registers a closer
 * while its dialog is open; Back runs the most recent one.
 */
type Closer = () => void;

const closers: Closer[] = [];

/** Register a closer. Returns the function that removes it again. */
export function registerBackDismiss(close: Closer): () => void {
  closers.push(close);
  return () => {
    const at = closers.lastIndexOf(close);
    if (at !== -1) closers.splice(at, 1);
  };
}

/** Close the most recently opened dialog. True when there was one. */
export function dismissTopForBack(): boolean {
  const close = closers[closers.length - 1];
  if (!close) return false;
  close();
  return true;
}
