import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Modal, Overlay } from '../ui/Overlay';
import { childTheme, CHILD_COLORS } from '../ui/theme';
import { cx } from '../ui/cx';

describe('UI kit', () => {
  it('Escape closes only the top overlay, and the page behind cannot scroll meanwhile', () => {
    const closeBottom = vi.fn();
    const closeTop = vi.fn();
    const { rerender, unmount } = render(
      <>
        <Overlay layer="overlay" onClose={closeBottom} aria-label="bottom">bottom</Overlay>
        <Overlay layer="dialog" onClose={closeTop} aria-label="top">top</Overlay>
      </>
    );
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(closeTop).toHaveBeenCalledTimes(1);
    expect(closeBottom).not.toHaveBeenCalled();

    rerender(<Overlay layer="overlay" onClose={closeBottom} aria-label="bottom">bottom</Overlay>);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(closeBottom).toHaveBeenCalledTimes(1);

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('a modal closes on its backdrop and close button, not on clicks inside', () => {
    const onClose = vi.fn();
    render(
      <Modal label="Tirelire" closeLabel="Fermer" onClose={onClose} testId="panel">
        <p>contenu</p>
      </Modal>
    );
    fireEvent.click(screen.getByText('contenu'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('presentation'));
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('dialog', { name: 'Tirelire' })).toBe(screen.getByTestId('panel'));
  });

  it('moves focus into an overlay, keeps Tab inside, and gives it back on close', () => {
    const outside = document.createElement('button');
    outside.textContent = 'ouvrir';
    document.body.appendChild(outside);
    outside.focus();

    const { unmount } = render(
      <Modal label="Code" closeLabel="Fermer" onClose={() => {}}>
        <button>un</button>
        <button>deux</button>
      </Modal>
    );
    const close = screen.getByRole('button', { name: 'Fermer' });
    expect(document.activeElement).toBe(close); // first focusable element
    screen.getByRole('button', { name: 'deux' }).focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(close); // wraps around
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'deux' }));

    unmount();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('has a theme for every child color and falls back to indigo', () => {
    for (const color of CHILD_COLORS) expect(childTheme(color).board).toBe(`theme-${color}`);
    expect(childTheme('unknown')).toBe(childTheme('indigo'));
    expect(cx('a', false, undefined, 'b', 0 as const)).toBe('a b');
    // later classes override earlier ones for the same property
    expect(cx('px-4 py-2 text-sm', 'px-2')).toBe('py-2 text-sm px-2');
    expect(cx('fixed z-overlay', 'z-dialog')).toBe('fixed z-dialog');
  });
});

describe('Toasts', () => {
  it('a toast closes by itself, but not while it is touched or focused', async () => {
    const { useAutoDismiss } = await import('../ui/useAutoDismiss');
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const Toast = () => {
      const auto = useAutoDismiss(1000, onDismiss);
      return <button {...auto.handlers}>toast</button>;
    };
    render(<Toast />);
    const toast = screen.getByRole('button', { name: 'toast' });
    fireEvent.pointerDown(toast);
    vi.advanceTimersByTime(5000);
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.pointerUp(toast);
    vi.advanceTimersByTime(999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('merges handlers of the same event', async () => {
    const { mergeHandlers } = await import('../ui/mergeHandlers');
    const calls: string[] = [];
    const merged = mergeHandlers({ onClick: () => calls.push('a') }, { onClick: () => calls.push('b'), onFocus: undefined });
    merged.onClick!();
    expect(calls).toEqual(['a', 'b']);
    expect(merged.onFocus).toBeUndefined();
  });
});
