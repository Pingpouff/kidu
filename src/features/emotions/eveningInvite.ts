/**
 * "Pas ce soir": the evening invitation to the check-in is not offered again
 * the same evening for that child. Best effort (localStorage may be blocked):
 * at worst it is offered again after a reload.
 */
const KEY = 'kidu.eveningInviteDismissed';

const read = (): string[] => {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

export function eveningInviteDismissed(childId: string, date: string): boolean {
  return read().includes(`${date}_${childId}`);
}

export function dismissEveningInvite(childId: string, date: string): void {
  try {
    // Only this evening's entries are kept
    const kept = read().filter((k) => k.startsWith(`${date}_`));
    localStorage.setItem(KEY, JSON.stringify([...new Set([...kept, `${date}_${childId}`])]));
  } catch {
    // ignore: storage blocked
  }
}
