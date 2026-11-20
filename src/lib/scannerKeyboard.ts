/** Keyboard-wedge scanner input, shared by reception and its regression tests. */
export function createScannerKeyHandler(onScan: (code: string) => void, now = () => performance.now()) {
  let buffer = '';
  let lastKeyAt = 0;
  return (event: KeyboardEvent): void => {
    const target = event.target;
    if (
      event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey ||
      (target instanceof Element && (target.closest('input, textarea, select, [contenteditable], [role="textbox"]'))) ||
      document.querySelector('[role="dialog"][aria-modal="true"]')
    ) {
      buffer = '';
      return;
    }
    const at = now();
    if (event.key === 'Enter') {
      if (buffer.trim().length >= 6 && at - lastKeyAt <= 100) {
        event.preventDefault();
        event.stopPropagation();
        onScan(buffer.trim());
      }
      buffer = '';
      return;
    }
    if (event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) return;
    buffer = at - lastKeyAt > 100 ? event.key : (buffer + event.key).slice(-2048);
    lastKeyAt = at;
  };
}
