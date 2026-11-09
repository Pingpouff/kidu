import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDatabase, saveSettings } from './persistence/db';
import { routineRepository } from './persistence/routineRepository';
import { ChildProfile, TaskDefinition, ParentSettings, RoutineSession, ShopItem } from './domain/models';
import { ProfileSelector } from './components/child-board/ProfileSelector';
import { RoutineBoard } from './components/child-board/RoutineBoard';
import { Celebration } from './components/rewards/Celebration';
import { PinModal } from './components/parent-mode/PinModal';
import { Dashboard as ParentDashboard } from './components/parent-mode/Dashboard';
import { reminderService } from './services/ReminderService';
import { backupFileName, parseBackup } from './domain/backup';
import { TrophyId, TROPHY_ICONS } from './domain/trophies';
import { shopItems, starsPerMedal } from './domain/rewards';
import { translate } from './i18n/dictionary';
import { RewardReveal } from './components/rewards/RewardReveal';
import { BadgeChoice } from './components/rewards/BadgeChoice';

/** Rewards waiting to be revealed, one full-screen reveal at a time */
type Reveal =
  | { kind: 'medal'; childId: string; key: string }
  | { kind: 'trophy'; childId: string; id: TrophyId; key: string };

export default function App() {
  const [dbSeeded, setDbSeeded] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [parentMode, setParentMode] = useState(false);
  const [pinPrompt, setPinPrompt] = useState(false);
  const [celebrationActive, setCelebrationActive] = useState(false);
  const [reveals, setReveals] = useState<Reveal[]>([]);
  const [revealsShown, setRevealsShown] = useState(0); // in the current batch

  // Seed DB on mount
  useEffect(() => {
    seedDatabase().then(() => setDbSeeded(true));
  }, []);

  // Fetch reactive data using Dexie live queries
  const profiles = useLiveQuery(() => db.profiles.toArray());
  const tasks = useLiveQuery(() => db.tasks.toArray());
  const history = useLiveQuery(() => db.history.toArray());
  const settings = useLiveQuery(() => db.settings.get('current'));

  // Apply the parent's sound / voice / song / animation preferences
  const feedback = settings?.feedback;
  useEffect(() => {
    reminderService.configure(feedback);
    document.documentElement.classList.toggle('reduce-motion', feedback?.animations === 'reduced');
  }, [feedback]);

  // Get current date string (YYYY-MM-DD local timezone)
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayStr();

  // Find active profile
  const activeProfile = profiles?.find((p) => p.id === activeProfileId) || null;

  // Reactively query active session from database
  const activeSession = useLiveQuery(
    () => (activeProfileId ? routineRepository.getActiveSession(activeProfileId, todayStr) : Promise.resolve(null)),
    [activeProfileId, todayStr],
    null
  );

  // Automatically create a session for the child today if none exists
  useEffect(() => {
    if (dbSeeded && activeProfileId && activeSession === undefined) {
      routineRepository.createSession(activeProfileId, todayStr);
    }
  }, [dbSeeded, activeProfileId, activeSession, todayStr]);

  // Loading Screen
  if (!dbSeeded || !profiles || !tasks || !settings) {
    return (
      <div className="w-full h-screen bg-slate-950 flex flex-col justify-center items-center gap-4 text-white">
        <div className="text-7xl animate-bounce">🌙</div>
        <div className="h-2 w-32 bg-white/10 rounded-full overflow-hidden relative">
          <div className="h-full bg-indigo-500 w-1/2 rounded-full absolute left-0 top-0 animate-pulse" />
        </div>
        <p className="text-sm text-indigo-300 font-bold tracking-wider uppercase animate-pulse">
          Chargement...
        </p>
      </div>
    );
  }

  const activeLang = settings.language || 'fr';

  // Handle active session updates
  const handleUpdateSession = async (updatedSession: RoutineSession) => {
    const childId = updatedSession.childId;
    // One star per newly completed task, a medal every N stars
    const { medalsGained } = await routineRepository.saveSessionWithRewards(updatedSession);

    if (updatedSession.isCompleted) {
      await routineRepository.recordHistory(updatedSession, activeProfile?.name || '');
    }

    const newTrophies = await routineRepository.awardNewTrophies(childId);

    const queued: Reveal[] = [
      ...Array.from({ length: medalsGained }, (_, i): Reveal => ({ kind: 'medal', childId, key: `medal_${Date.now()}_${i}` })),
      ...newTrophies.map((id): Reveal => ({ kind: 'trophy', childId, id, key: `trophy_${id}` })),
    ];
    if (queued.length > 0) {
      setReveals((current) => [...current, ...queued]);
    }
  };

  const currentReveal = reveals[0];
  const revealChild = currentReveal ? profiles.find((p) => p.id === currentReveal.childId) : undefined;
  const revealTotal = revealsShown + reveals.length;
  const revealPosition = revealTotal > 1 ? `${revealsShown + 1}/${revealTotal}` : undefined;
  const dismissReveal = () => {
    setRevealsShown((n) => (reveals.length <= 1 ? 0 : n + 1));
    setReveals((queue) => queue.slice(1));
  };
  // Once the reveals are over, the child picks a badge for each pending medal
  const pendingOffers = activeProfile?.badgeOffers ?? [];
  const showBadgeChoice = !currentReveal && activeProfile !== null && pendingOffers.length > 0;
  const starsTonight = activeSession?.tasks.filter((t) => t.rewarded).length ?? 0;

  // Reset active session callback
  const handleResetSession = async () => {
    if (activeSession) {
      await routineRepository.resetSessionInDb(activeSession.id);
      reminderService.playResetSound();
    }
  };

  // Task operation callbacks
  const handleAddTask = async (task: Omit<TaskDefinition, 'id'>) => {
    const id = `task_${Math.random().toString(36).slice(2, 9)}`;
    await db.tasks.add({ ...task, id });
    await routineRepository.syncAllActiveSessionsForToday(todayStr);
  };

  const handleUpdateTask = async (task: TaskDefinition) => {
    await db.tasks.put(task);
    await routineRepository.syncAllActiveSessionsForToday(todayStr);
  };

  const handleReorderTasks = async (reorderedTasks: TaskDefinition[]) => {
    await db.transaction('rw', db.tasks, async () => {
      for (const t of reorderedTasks) {
        await db.tasks.put(t);
      }
    });
    await routineRepository.syncAllActiveSessionsForToday(todayStr);
  };

  const handleDeleteTask = async (id: string) => {
    await db.tasks.delete(id);
    await routineRepository.syncAllActiveSessionsForToday(todayStr);
  };

  // Profile operation callbacks
  const handleAddProfile = async (profile: Omit<ChildProfile, 'id'>) => {
    const id = `profile_${Math.random().toString(36).slice(2, 9)}`;
    await db.profiles.add({ ...profile, id });
  };

  const handleUpdateProfile = async (profile: ChildProfile) => {
    await db.profiles.put(profile);
  };

  const handleDeleteProfile = async (id: string) => {
    await db.profiles.delete(id);
    if (activeProfileId === id) {
      setActiveProfileId(null);
    }
  };

  // History callbacks
  const handleDeleteHistory = async (id: string) => {
    await routineRepository.deleteHistoryEntry(id);
  };

  // Settings callbacks
  const handleSaveSettings = async (updatedSettings: ParentSettings) => {
    await saveSettings(updatedSettings);
  };

  const handleSaveShop = async (shop: ShopItem[]) => {
    await saveSettings({ ...settings, shop });
  };

  const handleResetAllData = async () => {
    await routineRepository.clearAllData();
  };

  // Backup callbacks
  const handleExportBackup = async (includeHistory: boolean) => {
    const backup = await routineRepository.exportBackup(includeHistory);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = backupFileName();
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // Throws a BackupError when the file is not a valid backup
  const handleImportBackup = async (fileContent: string) => {
    const backup = parseBackup(fileContent);
    await routineRepository.importBackup(backup);
    setActiveProfileId(null);
  };

  /* Router/State renderer logic */

  if (parentMode) {
    return (
      <ParentDashboard
        profiles={profiles}
        tasks={tasks}
        settings={settings}
        history={history || []}
        language={activeLang}
        onClose={() => setParentMode(false)}
        onAddTask={handleAddTask}
        onUpdateTask={handleUpdateTask}
        onReorderTasks={handleReorderTasks}
        onDeleteTask={handleDeleteTask}
        onAddProfile={handleAddProfile}
        onUpdateProfile={handleUpdateProfile}
        onDeleteProfile={handleDeleteProfile}
        onDeleteHistory={handleDeleteHistory}
        onSaveSettings={handleSaveSettings}
        onResetAllData={handleResetAllData}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onSaveShop={handleSaveShop}
      />
    );
  }

  return (
    <>
      {/* 1. Celebration Layer overlay */}
      {celebrationActive && activeProfile && (
        <Celebration
          profile={activeProfile}
          language={activeLang}
          starsEarned={starsTonight}
          onDismiss={() => {
            setCelebrationActive(false);
            setActiveProfileId(null); // return to select child screen
          }}
        />
      )}

      {/* Medal / trophy reveal, above the routine celebration */}
      {currentReveal && (
        <RewardReveal
          key={currentReveal.key}
          icon={currentReveal.kind === 'medal' ? '🏅' : TROPHY_ICONS[currentReveal.id]}
          heading={translate(currentReveal.kind === 'medal' ? 'medal.new' : 'trophies.new', activeLang)}
          title={
            currentReveal.kind === 'medal'
              ? translate('medal.title', activeLang)
              : translate(`trophy.${currentReveal.id}.name`, activeLang)
          }
          subtitle={
            currentReveal.kind === 'medal'
              ? translate('medal.subtitle', activeLang)
              : translate(`trophy.${currentReveal.id}.hint`, activeLang)
          }
          spoken={
            currentReveal.kind === 'medal'
              ? activeLang === 'fr'
                ? `Bravo ${revealChild?.name ?? ''} ! Tu as gagné une médaille !`
                : `Well done ${revealChild?.name ?? ''}! You won a medal!`
              : activeLang === 'fr'
                ? `Nouveau trophée : ${translate(`trophy.${currentReveal.id}.name`, activeLang)} !`
                : `New trophy: ${translate(`trophy.${currentReveal.id}.name`, activeLang)}!`
          }
          language={activeLang}
          position={revealPosition}
          onDismiss={dismissReveal}
        />
      )}

      {/* Badge choice for each medal waiting */}
      {showBadgeChoice && activeProfile && (
        <BadgeChoice
          key={pendingOffers[0].join('|')}
          childName={activeProfile.name}
          offer={pendingOffers[0]}
          pendingCount={pendingOffers.length}
          language={activeLang}
          onChoose={async (badgeId) => {
            await routineRepository.chooseBadge(activeProfile.id, badgeId);
          }}
        />
      )}

      {/* 2. Parent Mode Verification PIN pad */}
      {pinPrompt && (
        <PinModal
          correctPin={settings.parentPin}
          language={activeLang}
          onSuccess={() => {
            setPinPrompt(false);
            setParentMode(true);
          }}
          onClose={() => setPinPrompt(false)}
        />
      )}

      {/* 3. Main views (Routine Board vs Profile Selector) */}
      {activeProfile && activeSession ? (
        <RoutineBoard
          profile={activeProfile}
          session={activeSession}
          tasksDefinitions={tasks}
          language={activeLang}
          onBack={() => setActiveProfileId(null)}
          onUpdateSession={handleUpdateSession}
          onEnterParentMode={() => setPinPrompt(true)}
          onRoutineComplete={() => setCelebrationActive(true)}
          onResetSession={handleResetSession}
          starsPerMedal={starsPerMedal(settings)}
          shop={shopItems(settings)}
          parentPin={settings.parentPin}
          onBuyShopItem={async (itemId) => {
            await routineRepository.buyShopItem(activeProfile.id, itemId);
          }}
        />
      ) : (
        <ProfileSelector
          profiles={profiles}
          onSelect={(p) => setActiveProfileId(p.id)}
          onEnterParentMode={() => setPinPrompt(true)}
          language={activeLang}
        />
      )}
    </>
  );
}
