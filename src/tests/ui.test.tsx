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

  it('has a theme for every child color and falls back to indigo', () => {
    for (const color of CHILD_COLORS) expect(childTheme(color).board).toBe(`theme-${color}`);
    expect(childTheme('unknown')).toBe(childTheme('indigo'));
    expect(cx('a', false, undefined, 'b', 0 as const)).toBe('a b');
    // later classes override earlier ones for the same property
    expect(cx('px-4 py-2 text-sm', 'px-2')).toBe('py-2 text-sm px-2');
    expect(cx('fixed z-overlay', 'z-dialog')).toBe('fixed z-dialog');
  });
});
