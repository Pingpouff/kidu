import { db, getSettings } from './db';
import { RoutineSession, HistoryEntry } from '../domain/models';
import { BackupFile, createBackup } from '../domain/backup';
import { initSession, calculateHistory, awardStars, syncSessionWithDefinitions } from '../domain/routine';

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
    // Sort tasks by order
    definitions.sort((a, b) => a.order - b.order);
    
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
    definitions.sort((a, b) => a.order - b.order);

    const reseted = initSession(session.childId, session.date, definitions);
    await db.sessions.put(reseted);
    return reseted;
  },

  /**
   * Records a session to history and awards stars to the child profile if completed.
   */
  async recordHistoryAndAwardStars(session: RoutineSession, childName: string, starsToAward: number): Promise<HistoryEntry> {
    const historyEntry = calculateHistory(session, childName);
    
    // Save to history table
    await db.history.put(historyEntry);

    // If completed and completed for the first time in this session, award stars
    if (session.isCompleted) {
      const profile = await db.profiles.get(session.childId);
      if (profile) {
        const updatedProfile = awardStars(profile, starsToAward);
        await db.profiles.put(updatedProfile);
      }
    }

    return historyEntry;
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
    const [settings, tasks, profiles, history] = await Promise.all([
      getSettings(),
      db.tasks.toArray(),
      db.profiles.toArray(),
      includeHistory ? db.history.toArray() : Promise.resolve(undefined),
    ]);
    return createBackup({ settings, tasks, profiles, history });
  },

  /**
   * Replaces the current configuration with the content of a validated backup.
   * In-progress sessions are cleared since they reference the previous tasks/profiles.
   * History is only replaced when the backup contains it.
   */
  async importBackup(backup: BackupFile): Promise<void> {
    const { settings, tasks, profiles, history } = backup.data;
    await db.transaction('rw', [db.settings, db.tasks, db.profiles, db.sessions, db.history], async () => {
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
    });
  },

  /**
   * Cleans/resets the entire database.
   */
  async clearAllData(): Promise<void> {
    await db.sessions.clear();
    await db.history.clear();
    await db.profiles.clear();
    await db.tasks.clear();
    await db.settings.clear();
  }
};
