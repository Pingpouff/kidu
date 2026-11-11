import { db } from '../../../persistence/db';
import type { EmotionLog } from '../../../domain/models';
import { toggleHelpful } from '../domain/checkin';

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
};
