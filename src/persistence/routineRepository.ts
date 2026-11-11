import { db, getSettings } from './db';
import { RoutineSession, HistoryEntry, ChildProfile, CardColor } from '../domain/models';
import { BackupFile, createBackup } from '../domain/backup';
import { TrophyId, computeTrophyStats, findNewTrophies } from '../domain/trophies';
import { initSession, calculateHistory, syncSessionWithDefinitions, unassignChild } from '../domain/routine';
import { applyTaskRewards, chooseBadge, spendBadges, starsPerMedal, shopItems } from '../domain/rewards';
import { CardOutcome, giveCard, withdrawCard } from '../domain/cards';

export const routineRepository = {
  /**
   * Retrieves an active session for a child on a specific date.
   */
  async getActiveSession(childId: string, dateStr: string): Promise<RoutineSession | undefined> {
    const sessionId = `${dateStr}_${childId}`;
    return db.sessions.get(sessionId);
  },

  /**
   * Saves or updates a session.
   */
  async saveActiveSession(session: RoutineSession): Promise<void> {
    await db.sessions.put(session);
  },

  /**
   * Creates and saves a new session for a child using current task definitions in the database.
   */
  async createSession(childId: string, dateStr: string): Promise<RoutineSession> {
    const definitions = await db.tasks.toArray();
    const session = initSession(childId, dateStr, definitions);
    await db.sessions.put(session);
    return session;
  },

  /**
   * Resets a session's tasks to "todo" and updates database with latest task definitions.
   */
  async resetSessionInDb(sessionId: string): Promise<RoutineSession | undefined> {
    const session = await db.sessions.get(sessionId);
    if (!session) return undefined;

    const definitions = await db.tasks.toArray();
    const fresh = initSession(session.childId, session.date, definitions);
    // Keep the "star already given" marks so a reset can't be used to earn stars twice
    const rewarded = new Set(session.tasks.filter((t) => t.rewarded).map((t) => t.definitionId));
    const reseted = {
      ...fresh,
      tasks: fresh.tasks.map((t) => (rewarded.has(t.definitionId) ? { ...t, rewarded: true } : t)),
    };
    await db.sessions.put(reseted);
    await db.history.delete(session.id); // nothing done anymore today
    return reseted;
  },

  /**
   * Saves a session update and gives the rewards it unlocks:
   * one star per newly completed task, a medal (+ badge offer) every N stars.
   * "Star already given" marks stored in the database are kept even if the
   * caller's copy of the session is slightly stale (fast taps).
   */
  async saveSessionWithRewards(session: RoutineSession): Promise<{ starsGained: number; medalsGained: number }> {
    return db.transaction('rw', [db.sessions, db.profiles, db.settings], async () => {
      const stored = await db.sessions.get(session.id);
      const alreadyRewarded = new Set(stored?.tasks.filter((t) => t.rewarded).map((t) => t.id));
      const merged: RoutineSession = {
        ...session,
        tasks: session.tasks.map((t) => (alreadyRewarded.has(t.id) ? { ...t, rewarded: true } : t)),
      };

      const [profile, settings] = await Promise.all([
        db.profiles.get(session.childId),
        db.settings.get('current'),
      ]);
      if (!profile) {
        await db.sessions.put(merged);
        return { starsGained: 0, medalsGained: 0 };
      }

      const result = applyTaskRewards(merged, profile, starsPerMedal(settings));
      await db.sessions.put(result.session);
      if (result.starsGained > 0) await db.profiles.put(result.profile);
      return { starsGained: result.starsGained, medalsGained: result.medalsGained };
    });
  },

  /**
   * Records a completed session in the history.
   */
  async recordHistory(session: RoutineSession, childName: string): Promise<HistoryEntry | undefined> {
    const historyEntry = calculateHistory(session, childName);
    // A day where nothing is done (yet, or anymore) has no history entry
    if (historyEntry.completedTasks === 0 && !historyEntry.isCompleted) {
      await db.history.delete(historyEntry.id);
      return undefined;
    }
    await db.history.put(historyEntry);
    return historyEntry;
  },

  /**
   * The child picks a badge from their oldest pending offer.
   */
  async chooseBadge(childId: string, badgeId: string): Promise<ChildProfile | undefined> {
    return db.transaction('rw', db.profiles, async () => {
      const profile = await db.profiles.get(childId);
      if (!profile) return undefined;
      const updated = chooseBadge(profile, badgeId);
      await db.profiles.put(updated);
      return updated;
    });
  },

  /**
   * Exchanges badges from the child's piggy bank for a shop reward.
   */
  async buyShopItem(childId: string, itemId: string): Promise<ChildProfile | undefined> {
    return db.transaction('rw', [db.profiles, db.settings], async () => {
      const [profile, settings] = await Promise.all([db.profiles.get(childId), db.settings.get('current')]);
      const item = shopItems(settings).find((i) => i.id === itemId);
      if (!profile || !item) return undefined;
      const updated = spendBadges(profile, item);
      await db.profiles.put(updated);
      return updated;
    });
  },

  /**
   * A parent gives a yellow or red card (see domain/cards.ts).
   */
  async giveCard(childId: string, color: CardColor, date: string, reason?: string): Promise<{ outcome: CardOutcome; lostProgress: number } | undefined> {
    return db.transaction('rw', db.profiles, async () => {
      const profile = await db.profiles.get(childId);
      if (!profile) return undefined;
      const result = giveCard(profile, color, date, Date.now(), reason);
      await db.profiles.put(result.profile);
      return { outcome: result.outcome, lostProgress: result.lostProgress };
    });
  },

  /**
   * Withdraws a card given by mistake (gives back the stars a red card took).
   */
  async withdrawCard(childId: string, cardId: string): Promise<void> {
    await db.transaction('rw', [db.profiles, db.settings], async () => {
      const [profile, settings] = await Promise.all([db.profiles.get(childId), db.settings.get('current')]);
      if (!profile) return;
      await db.profiles.put(withdrawCard(profile, cardId, starsPerMedal(settings)));
    });
  },

  /**
   * Checks a child's sessions for newly unlocked trophies, saves them on the
   * profile and returns their ids (empty when nothing new was earned).
   */
  async awardNewTrophies(childId: string): Promise<TrophyId[]> {
    return db.transaction('rw', [db.profiles, db.sessions, db.tasks], async () => {
      const profile = await db.profiles.get(childId);
      if (!profile) return [];

      const [sessions, definitions] = await Promise.all([
        db.sessions.where('childId').equals(childId).toArray(),
        db.tasks.toArray(),
      ]);
      const newTrophies = findNewTrophies(computeTrophyStats(sessions, definitions), profile.trophies);
      if (newTrophies.length === 0) return [];

      const now = Date.now();
      await db.profiles.put({
        ...profile,
        trophies: [...(profile.trophies ?? []), ...newTrophies.map((id) => ({ id, earnedAt: now }))],
      });
      return newTrophies;
    });
  },

  /**
   * Retrieves history list sorted by date descending.
   */
  async getHistory(): Promise<HistoryEntry[]> {
    const entries = await db.history.toArray();
    // Sort descending by date, then completed timestamp
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  },

  /**
   * Deletes a single history record.
   */
  async deleteHistoryEntry(id: string): Promise<void> {
    await db.history.delete(id);
  },

  /**
   * Synchronizes all active sessions for a given date with the current task definitions.
   */
  async syncAllActiveSessionsForToday(dateStr: string): Promise<void> {
    const definitions = await db.tasks.toArray();
    const sessions = await db.sessions.where('date').equals(dateStr).toArray();

    for (const session of sessions) {
      const synced = syncSessionWithDefinitions(session, definitions);
      await db.sessions.put(synced);
    }
  },

  /**
   * Builds a backup of the current configuration (settings, tasks, profiles),
   * optionally including the routine history.
   */
  async exportBackup(includeHistory: boolean): Promise<BackupFile> {
    const [settings, tasks, profiles, history, emotionLogs] = await Promise.all([
      getSettings(),
      db.tasks.toArray(),
      db.profiles.toArray(),
      includeHistory ? db.history.toArray() : Promise.resolve(undefined),
      // Emotions are as personal as the history: exported with it
      includeHistory ? db.emotionLogs.toArray() : Promise.resolve(undefined),
    ]);
    return createBackup({ settings, tasks, profiles, history, emotionLogs });
  },

  /**
   * Replaces the current configuration with the content of a validated backup.
   * In-progress sessions are cleared since they reference the previous tasks/profiles.
   * History and emotion logs are only replaced when the backup contains them.
   */
  async importBackup(backup: BackupFile): Promise<void> {
    const { settings, tasks, profiles, history, emotionLogs } = backup.data;
    await db.transaction('rw', [db.settings, db.tasks, db.profiles, db.sessions, db.history, db.emotionLogs], async () => {
      await db.settings.put({ ...settings, id: 'current' });
      await db.tasks.clear();
      await db.tasks.bulkPut(tasks);
      await db.profiles.clear();
      await db.profiles.bulkPut(profiles);
      await db.sessions.clear();
      if (history) {
        await db.history.clear();
        await db.history.bulkPut(history);
      }
      if (emotionLogs) {
        await db.emotionLogs.clear();
        await db.emotionLogs.bulkPut(emotionLogs);
      }
    });
  },

  /**
   * Cleans/resets the entire database.
   */
  /**
   * Deletes a child. Their personal tasks shared with other children stay for
   * the others; tasks assigned only to them are deleted.
   */
  async deleteProfile(childId: string): Promise<void> {
    await db.transaction('rw', [db.profiles, db.tasks, db.emotionLogs], async () => {
      await db.profiles.delete(childId);
      await db.emotionLogs.where('childId').equals(childId).delete();
      const { updated, orphans } = unassignChild(await db.tasks.toArray(), childId);
      if (updated.length) await db.tasks.bulkPut(updated);
      if (orphans.length) await db.tasks.bulkDelete(orphans);
    });
  },

  async clearAllData(): Promise<void> {
    await db.sessions.clear();
    await db.history.clear();
    await db.profiles.clear();
    await db.tasks.clear();
    await db.settings.clear();
    await db.emotionLogs.clear();
  }
};
