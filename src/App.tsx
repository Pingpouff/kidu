import { useState, useEffect, lazy, Suspense } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDatabase, saveSettings } from './persistence/db';
import { routineRepository } from './persistence/routineRepository';
import { ChildProfile, TaskDefinition, ParentSettings, RoutineSession, ShopItem } from './domain/models';
import { ProfileSelector } from './components/child-board/ProfileSelector';
import { RoutineBoard } from './components/child-board/RoutineBoard';
import { PinModal } from './components/parent-mode/PinModal';
import { reminderService } from './services/ReminderService';
import { backupFileName, parseBackup } from './domain/backup';
import { TrophyId, TROPHY_ICONS } from './domain/trophies';
import { shopItems, starsPerMedal } from './domain/rewards';
import { translate } from './i18n/dictionary';
import { RewardReveal } from './components/rewards/RewardReveal';
import { BadgeChoice } from './components/rewards/BadgeChoice';
import { ReminderBanner } from './components/child-board/ReminderBanner';
import { useTaskReminders } from './hooks/useTaskReminders';
import { readLastSeenVersion, saveLastSeenVersion, useAppUpdate } from './services/appUpdate';
import { APP_VERSION, ChangelogEntry, changesSince, previousVersion } from './domain/changelog';
import { AppUpdateBanner } from './components/app/AppUpdateBanner';
import { requestPersistentStorage } from './services/storage';
import { WhatsNewModal } from './components/app/WhatsNewModal';

/** Rewards waiting to be revealed, one full-screen reveal at a time */
type Reveal =
  | { kind: 'medal'; childId: string; key: string }
  | { kind: 'trophy'; childId: string; id: TrophyId; key: string };

// Loaded on demand: Parent Mode and the end-of-day celebration aren't needed to start the app
const ParentDashboard = lazy(() => import('./components/parent-mode/Dashboard').then((m) => ({ default: m.Dashboard })));
const Celebration = lazy(() => import('./components/rewards/Celebration').then((m) => ({ default: m.Celebration })));

export default function App() {
  const [dbSeeded, setDbSeeded] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [parentMode, setParentMode] = useState(false);
  const [pinPrompt, setPinPrompt] = useState(false);
  const [celebrationActive, setCelebrationActive] = useState(false);
  const [reveals, setReveals] = useState<Reveal[]>([]);
  const [revealsShown, setRevealsShown] = useState(0); // in the current batch

  // New version waiting (service worker) and "What's new" after an update
  const appUpdate = useAppUpdate();
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [lastSeenVersion] = useState(readLastSeenVersion); // read before it is overwritten below
  const [whatsNew, setWhatsNew] = useState<ChangelogEntry[]>([]);

  // Ask the browser to keep our data (no automatic eviction)
  useEffect(() => {
    requestPersistentStorage();
  }, []);

  // Seed DB on mount
  useEffect(() => {
    seedDatabase().then(({ freshInstall }) => {
      setWhatsNew(changesSince(previousVersion(lastSeenVersion, freshInstall)));
      saveLastSeenVersion(APP_VERSION);
      setDbSeeded(true);
    });
  }, [lastSeenVersion]);

  // Fetch reactive data using Dexie live queries
  const profiles = useLiveQuery(() => db.profiles.toArray());
  const tasks = useLiveQuery(() => db.tasks.toArray());
  const history = useLiveQuery(() => db.history.toArray());
  const allSessions = useLiveQuery(() => db.sessions.toArray());
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

  // Reminders for tasks past their due time (all children, on every screen)
  const reminders = useTaskReminders({
    settings,
    profiles,
    tasks,
    today: todayStr,
    language: settings?.language ?? 'fr',
    paused: parentMode,
  });
  const lateCounts: Record<string, number> = {};
  for (const task of reminders.overdue) lateCounts[task.childId] = (lateCounts[task.childId] ?? 0) + 1;
  const activeLateIds = new Set(
    reminders.overdue.filter((t) => t.childId === activeProfileId).map((t) => t.definitionId)
  );

  // Loading Screen
  if (!dbSeeded || !profiles || !tasks || !settings) {
    return (
      <div className="w-full h-screen bg-slate-950 flex flex-col justify-center items-center gap-4 text-white">
        <div className="text-7xl animate-bounce">🌟</div>
        <div className="h-2 w-32 bg-white/10 rounded-full overflow-hidden relative">
          <div className="h-full bg-indigo-500 w-1/2 rounded-full absolute left-0 top-0 animate-pulse" />
        </div>
        <p className="text-sm text-indigo-300 font-bold tracking-wider uppercase animate-pulse">
          {translate('app.loading', settings?.language ?? 'fr')}
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

    // Partial days are kept in the history too (e.g. 9/12 tasks)
    await routineRepository.recordHistory(updatedSession, activeProfile?.name || '');

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
    await routineRepository.deleteProfile(id);
    await routineRepository.syncAllActiveSessionsForToday(todayStr);
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
    await saveSettings({ ...settings, lastBackupAt: Date.now() });
  };

  // Throws a BackupError when the file is not a valid backup
  const handleImportBackup = async (fileContent: string) => {
    const backup = parseBackup(fileContent);
    await routineRepository.importBackup(backup);
    setActiveProfileId(null);
  };

  /* Router/State renderer logic */

  // Never shown on a child's board: an update must not cut a routine
  const updateBanner = appUpdate.updateAvailable && !updateDismissed && (parentMode || !activeProfile) && (
    <AppUpdateBanner
      language={activeLang}
      onUpdate={appUpdate.applyUpdate}
      updating={appUpdate.updating}
      onLater={() => setUpdateDismissed(true)}
    />
  );

  if (parentMode) {
    return (
      <>
      <Suspense fallback={<div className="w-full h-[100dvh] bg-slate-950" />}>
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
        onWithdrawCard={(childId, cardId) => routineRepository.withdrawCard(childId, cardId)}
        onSaveSettings={handleSaveSettings}
        onResetAllData={handleResetAllData}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onSaveShop={handleSaveShop}
        appUpdate={appUpdate}
      />
      </Suspense>
      {updateBanner}
      </>
    );
  }

  return (
    <>
      {/* 1. Celebration Layer overlay */}
      {celebrationActive && activeProfile && (
        <Suspense fallback={null}>
        <Celebration
          profile={activeProfile}
          language={activeLang}
          starsEarned={starsTonight}
          onDismiss={() => {
            setCelebrationActive(false);
            setActiveProfileId(null); // return to select child screen
          }}
        />
        </Suspense>
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
              ? translate('reveal.new_medal_spoken', activeLang, { name: revealChild?.name ?? '' })
              : translate('reveal.new_trophy_spoken', activeLang, {
                  trophy: translate(`trophy.${currentReveal.id}.name`, activeLang),
                })
          }
          language={activeLang}
          position={revealPosition}
          onDismiss={dismissReveal}
        />
      )}

      {/* Reminder being announced (late tasks) */}
      {reminders.current && (
        <ReminderBanner
          announcement={reminders.current}
          profile={profiles.find((p) => p.id === reminders.current!.childId)}
          definitions={tasks}
          language={activeLang}
          onDismiss={reminders.dismissCurrent}
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
          allowForgotPin
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
          lateDefinitionIds={activeLateIds}
          onGiveCard={(color, reason) => routineRepository.giveCard(activeProfile.id, color, activeSession.date, reason)}
        />
      ) : (
        <ProfileSelector
          profiles={profiles}
          onSelect={(p) => setActiveProfileId(p.id)}
          onEnterParentMode={() => setPinPrompt(true)}
          language={activeLang}
          lateCounts={lateCounts}
          tasks={tasks}
          sessions={allSessions ?? []}
          settings={settings}
          today={todayStr}
        />
      )}

      {/* After an update: what changed (on the selection screen only) */}
      {whatsNew.length > 0 && !activeProfile && (
        <WhatsNewModal entries={whatsNew} language={activeLang} onClose={() => setWhatsNew([])} />
      )}
      {updateBanner}
    </>
  );
}
