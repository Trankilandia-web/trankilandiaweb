import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const openModals: HTMLElement[] = [];
let previousOverflow = '';

function getFocusable(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => {
    const style = window.getComputedStyle(element);
    return !element.closest('[hidden], [inert], [aria-hidden="true"]') && style.display !== 'none' && style.visibility !== 'hidden';
  });
}

/** Keeps keyboard focus and scrolling within the topmost open dialog. */
export function useModalFocus<T extends HTMLElement = HTMLDivElement>(isOpen: boolean, onClose: () => void, options: { initialFocus?: string } = {}) {
  const dialogRef = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const initialFocus = options.initialFocus;

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (openModals.length === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openModals.push(dialog);
    const isTopmost = () => openModals[openModals.length - 1] === dialog;
    const focusFirst = () => {
      const preferred = initialFocus ? dialog.querySelector<HTMLElement>(initialFocus) : null;
      (preferred || getFocusable(dialog)[0] || dialog).focus();
    };
    focusFirst();
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopmost()) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); closeRef.current();
      } else if (event.key === 'Tab') {
        const items = getFocusable(dialog);
        const first = items[0];
        const last = items[items.length - 1];
        if (!first) { event.preventDefault(); dialog.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    const onFocusIn = (event: FocusEvent) => { if (isTopmost() && !dialog.contains(event.target as Node)) focusFirst(); };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn);
      const index = openModals.lastIndexOf(dialog);
      if (index !== -1) openModals.splice(index, 1);
      if (openModals.length === 0) document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen, initialFocus]);
  return dialogRef;
}
