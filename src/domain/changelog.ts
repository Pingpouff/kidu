import type { Language } from '../i18n/dictionary';

/** Version of the running app (package.json, injected at build time). */
export const APP_VERSION: string = __APP_VERSION__;

export interface ChangelogEntry {
  version: string; // "x.y.z", same as package.json for the latest entry
  date: string; // YYYY-MM-DD
  changes: Record<Language, string[]>;
}

/**
 * What changed in each version, newest first. Shown to parents in the
 * "What's new" window after an update and in Settings.
 * When releasing: bump package.json and add an entry at the top.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.0',
    date: '2026-11-09',
    changes: {
      fr: [
        'Nouvelle étape « Matin » ☀️ avant l\'école, avec son trophée « Soleil du matin ».',
        'Exemple de journée d\'école complète à la première installation (matin, après l\'école, repas, coucher).',
        'Le carton jaune ou rouge du soir reste visible sur le tableau et l\'écran d\'accueil.',
        'Mises à jour : un bandeau propose la nouvelle version au lieu de recharger l\'app en pleine routine, puis cette fenêtre présente les nouveautés.',
        'Version de l\'app et historique des versions dans Paramètres.',
      ],
      en: [
        'New "Morning" step ☀️ before school, with its "Morning sunshine" trophy.',
        'A full school-day example routine on first install (morning, after school, meal, bedtime).',
        'Tonight\'s yellow or red card stays visible on the board and the home screen.',
        'Updates: a banner offers the new version instead of reloading the app mid-routine, then this window shows what\'s new.',
        'App version and version history in Settings.',
      ],
    },
  },
  {
    version: '1.0.0',
    date: '2026-11-09',
    changes: {
      fr: [
        'Routine en étapes : après l\'école, repas, coucher.',
        'Étoiles, médailles, badges, tirelire, boutique et trésor.',
        'Cartons jaune et rouge.',
        'Rappels des tâches en retard, tâches personnelles, sauvegarde de la configuration.',
      ],
      en: [
        'Step-by-step routine: after school, meal, bedtime.',
        'Stars, medals, badges, piggy bank, shop and treasure.',
        'Yellow and red cards.',
        'Late task reminders, personal tasks, configuration backup.',
      ],
    },
  },
];

/** Version installed before this mechanism existed (no "last seen" version stored). */
export const BASELINE_VERSION = '1.0.0';

function parts(version: string): number[] {
  return version.split('.').map((n) => Number.parseInt(n, 10) || 0);
}

/** Compares two "x.y.z" versions: negative if a < b, 0 if equal, positive if a > b. */
export function compareVersions(a: string, b: string): number {
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Entries newer than `lastSeen`, up to `current`, newest first.
 * Without a `lastSeen` version (fresh install) there is nothing to announce.
 */
export function changesSince(
  lastSeen: string | null | undefined,
  current: string = APP_VERSION,
  changelog: ChangelogEntry[] = CHANGELOG
): ChangelogEntry[] {
  if (!lastSeen) return [];
  return changelog.filter(
    (e) => compareVersions(e.version, lastSeen) > 0 && compareVersions(e.version, current) <= 0
  );
}

/**
 * Version to compare against on startup: the stored one, or — for an install
 * that already had data before versions were tracked — the baseline version.
 * A fresh install returns null (nothing to announce).
 */
export function previousVersion(stored: string | null, freshInstall: boolean): string | null {
  if (stored) return stored;
  return freshInstall ? null : BASELINE_VERSION;
}
