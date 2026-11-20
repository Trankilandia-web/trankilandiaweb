import { useState } from 'react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useModalFocus } from '../../hooks/useModalFocus';

afterEach(cleanup);

function Dialog({ open, close, children }: { open: boolean; close: () => void; children?: React.ReactNode }) {
  const ref = useModalFocus(open, close);
  return open ? <div role="dialog" tabIndex={-1} ref={ref}><button>First</button>{children}<button>Last</button></div> : null;
}

describe('useModalFocus', () => {
  it('restores the trigger focus and the preexisting body overflow', () => {
    document.body.style.overflow = 'scroll';
    function Harness() {
      const [open, setOpen] = useState(false);
      return <><button onClick={() => setOpen(true)}>Open</button><Dialog open={open} close={() => setOpen(false)} /></>;
    }
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    trigger.focus(); fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('scroll');
    document.body.style.overflow = '';
  });

  it('only closes the topmost modal and keeps scrolling locked until all close', () => {
    const closeParent = vi.fn();
    const closeChild = vi.fn();
    const parent = render(<Dialog open close={closeParent} />);
    const child = render(<Dialog open close={closeChild} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closeParent).not.toHaveBeenCalled();
    expect(closeChild).toHaveBeenCalledOnce();
    child.unmount();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closeParent).toHaveBeenCalledOnce();
    parent.unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
