import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import pkg from '../../package.json';
import {
  APP_VERSION,
  BASELINE_VERSION,
  CHANGELOG,
  ChangelogEntry,
  changesSince,
  compareVersions,
  previousVersion,
} from '../domain/changelog';
import { WhatsNewModal } from '../components/app/WhatsNewModal';
import { AppUpdateBanner } from '../components/app/AppUpdateBanner';

const entry = (version: string): ChangelogEntry => ({
  version,
  date: '2026-11-09',
  changes: { fr: [`fr ${version}`], en: [`en ${version}`] },
});
const log = [entry('1.2.0'), entry('1.1.1'), entry('1.1.0'), entry('1.0.0')];

describe('Versions and changelog', () => {
  it('compares x.y.z versions numerically', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
  });

  it('lists the versions between the last seen one and the current one, newest first', () => {
    expect(changesSince('1.0.0', '1.2.0', log).map((e) => e.version)).toEqual(['1.2.0', '1.1.1', '1.1.0']);
    expect(changesSince('1.1.0', '1.1.1', log).map((e) => e.version)).toEqual(['1.1.1']);
    expect(changesSince('1.2.0', '1.2.0', log)).toEqual([]);
  });

  it('announces nothing on a fresh install, and everything since the baseline on an older install', () => {
    expect(previousVersion(null, true)).toBeNull();
    expect(changesSince(previousVersion(null, true), '1.2.0', log)).toEqual([]);
    expect(previousVersion(null, false)).toBe(BASELINE_VERSION);
    expect(previousVersion('1.1.0', false)).toBe('1.1.0');
  });

  it('the app version is package.json, and it is the latest changelog entry', () => {
    expect(APP_VERSION).toBe(pkg.version);
    expect(CHANGELOG[0].version).toBe(pkg.version);
  });

  it('the changelog is sorted, unique, dated, and translated', () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(compareVersions(CHANGELOG[i - 1].version, CHANGELOG[i].version)).toBeGreaterThan(0);
    }
    for (const e of CHANGELOG) {
      expect(e.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.changes.fr.length).toBeGreaterThan(0);
      expect(e.changes.en.length).toBe(e.changes.fr.length);
    }
  });
});

describe('Update UI', () => {
  it('"What\'s new" lists each version in the chosen language', () => {
    const onClose = vi.fn();
    render(<WhatsNewModal entries={[entry('1.1.0'), entry('1.0.1')]} language="fr" onClose={onClose} />);
    expect(screen.getByText('Quoi de neuf ?')).toBeTruthy();
    expect(screen.getAllByTestId('whats-new-entry')).toHaveLength(2);
    expect(screen.getByText('fr 1.1.0')).toBeTruthy();
    expect(screen.queryByText('en 1.1.0')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Super !' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('the update banner applies or postpones the update', () => {
    const onUpdate = vi.fn();
    const onLater = vi.fn();
    render(<AppUpdateBanner language="en" onUpdate={onUpdate} onLater={onLater} />);
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onLater).toHaveBeenCalledTimes(1);
  });
});
