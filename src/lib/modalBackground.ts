/*
 * While a modal dialog is open, take everything outside it out of the
 * accessibility tree. aria-modal alone does not do this in the Android web
 * view: TalkBack could still swipe from the Controls panel into the buttons
 * and cards behind it.
 *
 * Marks the siblings of the dialog and of each of its ancestors, up to the app
 * root, with aria-hidden. Elements that already carry aria-hidden are left
 * alone, so the returned function restores exactly what this call changed.
 */
export function hideBackgroundFromAssistiveTech(dialog: HTMLElement | null): () => void {
  if (!dialog) return () => {};
  const root = document.getElementById('root') ?? document.body;
  const hidden: Element[] = [];
  let node: HTMLElement = dialog;
  while (node !== root && node.parentElement) {
    for (const sibling of Array.from(node.parentElement.children)) {
      if (sibling === node || sibling.hasAttribute('aria-hidden')) continue;
      sibling.setAttribute('aria-hidden', 'true');
      hidden.push(sibling);
    }
    node = node.parentElement;
  }
  return () => {
    for (const element of hidden) element.removeAttribute('aria-hidden');
  };
}
