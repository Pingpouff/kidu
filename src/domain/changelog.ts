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
    version: '1.6.0',
    date: '2026-11-10',
    changes: {
      fr: [
        'Affichage allégé, activé automatiquement sur les tablettes anciennes : plus d\'effet de verre dépoli ni de décors animés en boucle, l\'app est bien plus fluide. Réglable dans Paramètres → Sons et animations.',
        'Le mode « Animations réduites » arrête aussi les étoiles qui clignotent et rebondissent.',
        'La police est intégrée à l\'app : démarrage plus rapide et même apparence sans connexion.',
      ],
      en: [
        'Lite display, turned on automatically on older tablets: no frosted glass and no looping decorations, the app is much smoother. Adjustable in Settings → Sounds & animations.',
        '"Reduced animations" also stops the twinkling and bouncing stars.',
        'The font is built into the app: faster start-up and the same look offline.',
      ],
    },
  },
  {
    version: '1.5.1',
    date: '2026-11-10',
    changes: {
      fr: [
        'L\'écran d\'accueil défile quand il y a beaucoup d\'échéances prévues.',
        'L\'historique des versions défile lorsqu\'il est long, et s\'affiche correctement depuis les Paramètres.',
      ],
      en: [
        'The home screen scrolls when many deadlines are planned.',
        'A long version history now scrolls, and shows correctly from Settings.',
      ],
    },
  },
  {
    version: '1.5.0',
    date: '2026-11-10',
    changes: {
      fr: [
        'Bouton « À propos » sur l\'écran d\'accueil : version de l\'app, historique des versions, recherche de mise à jour et installation.',
        'Invitation à installer l\'app sur l\'écran d\'accueil (Chrome, Edge, Android), et mode d\'emploi sur iPhone et iPad.',
      ],
      en: [
        '"About" button on the home screen: app version, version history, update check and install.',
        'Invitation to install the app on the home screen (Chrome, Edge, Android), with instructions on iPhone and iPad.',
      ],
    },
  },
  {
    version: '1.4.1',
    date: '2026-11-10',
    changes: {
      fr: ['Correction : le bouton « Mettre à jour » recharge bien l\'app, même juste après une première visite ou un rechargement forcé.'],
      en: ['Fix: the "Update" button now reloads the app, even right after a first visit or a hard reload.'],
    },
  },
  {
    version: '1.4.0',
    date: '2026-11-10',
    changes: {
      fr: [
        'Données mieux protégées : l\'app demande au navigateur de ne pas les effacer, et rappelle de faire une sauvegarde au bout de 30 jours.',
        'Date de la dernière sauvegarde et état de la protection dans Paramètres.',
        'Démarrage plus léger : le Mode Parent et les animations se chargent seulement quand on en a besoin.',
        'Accessibilité : cartes de tâche lisibles par les lecteurs d\'écran et utilisables au clavier, focus géré dans les fenêtres, textes plus contrastés.',
      ],
      en: [
        'Better protected data: the app asks the browser not to clear it, and reminds you to back up after 30 days.',
        'Date of the last backup and protection status in Settings.',
        'Lighter start: Parent Mode and animations load only when needed.',
        'Accessibility: task cards readable by screen readers and usable with the keyboard, focus kept in dialogs, higher-contrast texts.',
      ],
    },
  },
  {
    version: '1.3.0',
    date: '2026-11-10',
    changes: {
      fr: [
        'Bouton « Passer l\'étape » (avec le code parent) : un matin manqué ne bloque plus la soirée. Une étape passée peut être reprise.',
        'Une journée compte pour la série dès que les autres étapes sont terminées, même si une étape a été passée.',
        'Les tâches d\'une étape passée ne déclenchent plus de rappel de retard.',
        'Jours par tâche : une tâche peut être limitée à certains jours (ex. cartable et devoirs du lundi au vendredi).',
        'L\'historique montre aussi les journées partielles (ex. 9/12 tâches).',
      ],
      en: [
        '"Skip this step" button (with the parent PIN): a missed morning no longer blocks the evening. A skipped step can be resumed.',
        'A day counts for the streak once the other steps are done, even if a step was skipped.',
        'Tasks of a skipped step no longer trigger late reminders.',
        'Days per task: a task can be limited to some days (e.g. school bag and homework Monday to Friday).',
        'The history also shows partial days (e.g. 9/12 tasks).',
      ],
    },
  },
  {
    version: '1.2.0',
    date: '2026-11-10',
    changes: {
      fr: [
        'Mode Parent mieux protégé : plus de raccourci « maintenir 3 secondes ». En cas d\'oubli du code, une question de calcul pour adulte le remplace.',
        'Après 3 codes faux, le clavier se bloque 30 secondes.',
        'Le Mode Parent invite à remplacer le code 1234 ; le code est masqué dans Paramètres.',
        'Salutation selon l\'heure (Bonjour, Bon après-midi, Bonsoir) et textes adaptés à toute la journée (« jours de suite », « aujourd\'hui »).',
        'Le trophée « Lève-tôt » récompense maintenant l\'étape Matin finie avant 8 h.',
        'Tous les textes de l\'app sont traduits en anglais.',
      ],
      en: [
        'Parent Mode is better protected: no more "hold for 3 seconds" shortcut. If the PIN is forgotten, a grown-up math question replaces it.',
        'After 3 wrong PINs, the keypad locks for 30 seconds.',
        'Parent Mode asks to replace the 1234 PIN; the PIN is hidden in Settings.',
        'Greeting depends on the time of day (Good morning, Good afternoon, Good evening) and texts fit the whole day ("days in a row", "today").',
        'The "Early bird" trophy now rewards finishing the Morning step before 8 am.',
        'Every text of the app is translated into English.',
      ],
    },
  },
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
