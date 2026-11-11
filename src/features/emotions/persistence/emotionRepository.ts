import { db } from '../../../persistence/db';
import type { CustomStrategy, EmotionLevel, EmotionLog } from '../../../domain/models';
import { toggleHelpful } from '../domain/checkin';
import { emotionSettings } from '../domain/settings';

export const emotionRepository = {
  async addLog(log: EmotionLog): Promise<void> {
    await db.emotionLogs.put(log);
  },

  /** Updates a log already saved (a check-in is saved from its first step). */
  async updateLog(id: string, changes: Partial<EmotionLog>): Promise<void> {
    await db.emotionLogs.update(id, changes);
  },

  async logsForChild(childId: string): Promise<EmotionLog[]> {
    return db.emotionLogs.where('childId').equals(childId).sortBy('at');
  },

  /** "Ça m'aide": adds or removes a strategy from the child's toolbox. */
  async toggleHelpful(childId: string, strategyId: string): Promise<void> {
    await db.transaction('rw', db.profiles, async () => {
      const profile = await db.profiles.get(childId);
      if (!profile) return;
      const helpful = toggleHelpful(profile.emotions?.helpful ?? [], strategyId);
      await db.profiles.put({ ...profile, emotions: { ...profile.emotions, helpful } });
    });
  },

  async deleteChildLogs(childId: string): Promise<void> {
    await db.emotionLogs.where('childId').equals(childId).delete();
  },

  /** Age level chosen by the parent; `undefined` = from the child's age. */
  async setLevel(childId: string, level: EmotionLevel | undefined): Promise<void> {
    await db.transaction('rw', db.profiles, async () => {
      const profile = await db.profiles.get(childId);
      if (!profile) return;
      const helpful = profile.emotions?.helpful ?? [];
      await db.profiles.put({ ...profile, emotions: level ? { helpful, level } : { helpful } });
    });
  },

  /**
   * The parent's own strategies. A removed one also leaves every child's
   * toolbox, so nothing points to an idea that no longer exists.
   */
  async setCustomStrategies(customStrategies: CustomStrategy[]): Promise<void> {
    await db.transaction('rw', [db.settings, db.profiles], async () => {
      const settings = await db.settings.get('current');
      if (!settings) return;
      const before = emotionSettings(settings).customStrategies;
      await db.settings.put({ ...settings, emotions: { ...emotionSettings(settings), customStrategies } });
      const removed = before.map((c) => c.id).filter((id) => !customStrategies.some((c) => c.id === id));
      if (removed.length === 0) return;
      for (const profile of await db.profiles.toArray()) {
        const helpful = profile.emotions?.helpful ?? [];
        if (helpful.some((id) => removed.includes(id))) {
          await db.profiles.put({ ...profile, emotions: { ...profile.emotions, helpful: helpful.filter((id) => !removed.includes(id)) } });
        }
      }
    });
  },
};
