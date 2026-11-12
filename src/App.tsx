import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDatabase, saveSettings } from './persistence/db';
import { routineRepository } from './persistence/routineRepository';
import { ChildProfile, TaskDefinition, ParentSettings, RoutineSession, ShopItem } from './domain/models';
import { ProfileSelector } from './components/child-board/ProfileSelector';
import { RoutineBoard } from './components/child-board/RoutineBoard';
import { PinModal } from './components/parent-mode/PinModal';
import { reminderService } from './services/ReminderService';
import { isLowEndDevice, resolveVisuals } from './services/performance';
import { emotionSettings } from './features/emotions/domain/settings';
import { dismissEveningInvite, eveningInviteDismissed } from './features/emotions/eveningInvite';
import { getRoutinePhases } from './domain/routine';
import { backupFileName, parseBackup } from './domain/backup';
import { TrophyId, TROPHY_ICONS } from './domain/trophies';
import { shopItems, starsPerMedal } from './domain/rewards';
import { translate } from './i18n/dictionary';
import { RewardReveal } from './components/rewards/RewardReveal';
import { MedalChoice } from './components/rewards/MedalChoice';
import { dayContext } from './domain/calendar';
import { useBackHandler } from './services/backStack';
import { childTheme } from './ui/theme';
import { onReminderAction } from './services/notifications';
import { ReminderBanner } from './components/child-board/ReminderBanner';
import { useTaskReminders } from './hooks/useTaskReminders';
import { readLastSeenVersion, saveLastSeenVersion, useAppUpdate } from './services/appUpdate';
import { APP_VERSION, ChangelogEntry, changesSince, previousVersion } from './domain/changelog';
import { AppUpdateBanner } from './components/app/AppUpdateBanner';
import { requestPersistentStorage } from './services/storage';
import { dismissInstallInvite, installInviteDismissed, useInstallState } from './services/install';
import { AboutModal } from './components/app/AboutModal';
import { InstallBanner } from './components/app/InstallBanner';
import { WhatsNewModal } from './components/app/WhatsNewModal';

/**
 * Trophies waiting to be revealed, one full-screen reveal at a time. A new
 * medal has no reveal of its own: choosing its motif (MedalChoice) is the reveal.
 */
type Reveal = { kind: 'trophy'; childId: string; id: TrophyId; key: string };

// Loaded on demand: Parent Mode and the end-of-day celebration aren't needed to start the app
const ParentDashboard = lazy(() => import('./components/parent-mode/Dashboard').then((m) => ({ default: m.Dashboard })));
const Celebration = lazy(() => import('./components/rewards/Celebration').then((m) => ({ default: m.Celebration })));
// "Mes émotions": loaded on demand, the routine's start-up stays as light as before
const CalmCorner = lazy(() => import('./features/emotions/components/CalmCorner'));
const EmotionsHub = lazy(() => import('./features/emotions/components/EmotionsHub'));

export default function App() {
  const [dbSeeded, setDbSeeded] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [parentMode, setParentMode] = useState(false);
  // Calm corner open (from the home screen: no child; from a board: that child)
  const [calm, setCalm] = useState<{ childId?: string } | null>(null);
  // A child's emotions space ("Comment je me sens", toolbox)
  const [emotionsHub, setEmotionsHub] = useState<{ childId: string; initial: 'hub' | 'checkin' } | null>(null);
  const [inviteDismissed, setInviteDismissed] = useState(0); // re-reads the dismissal after "Pas ce soir"
  const [pinPrompt, setPinPrompt] = useState(false);
  // A parent stops reminders for tonight (PIN): some children, or all when undefined
  const [muteAsk, setMuteAsk] = useState<{ childIds?: string[] } | null>(null);
  const [celebrationActive, setCelebrationActive] = useState(false);
  const [reveals, setReveals] = useState<Reveal[]>([]);
  const [revealsShown, setRevealsShown] = useState(0); // in the current batch

  // New version waiting (service worker) and "What's new" after an update
  const appUpdate = useAppUpdate();
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [lastSeenVersion] = useState(readLastSeenVersion); // read before it is overwritten below
  const [whatsNew, setWhatsNew] = useState<ChangelogEntry[]>([]);

  // "About" window and the invitation to install the app
  const install = useInstallState();
  const [showAbout, setShowAbout] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(() => installInviteDismissed());

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
  // Every past day is only read by the screen that shows it: on a child's
  // board, a tap then only re-reads today's session, however old the data.
  const onHome = !parentMode && !activeProfileId;
  const history = useLiveQuery(async () => (parentMode ? db.history.toArray() : null), [parentMode]);
  const homeSessions = useLiveQuery(async () => (onHome ? db.sessions.toArray() : null), [onHome]);
  // Last value kept while the home screen's query reloads (no flash of empty cards)
  const allSessions = useRef<RoutineSession[]>([]);
  if (homeSessions) allSessions.current = homeSessions;
  const settings = useLiveQuery(() => db.settings.get('current'));

  // Apply the parent's sound / voice / song / animation preferences
  const feedback = settings?.feedback;
  useEffect(() => {
    reminderService.configure(feedback);
    document.documentElement.classList.toggle('reduce-motion', feedback?.animations === 'reduced');
    // Lite display on weak devices: no blur, no looping animations
    document.documentElement.classList.toggle('lite', resolveVisuals(feedback?.visuals, isLowEndDevice()) === 'lite');
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

  // Evening invitation: only while the child has no check-in today
  const checkInsToday = useLiveQuery(
    async () =>
      activeProfileId
        ? db.emotionLogs.where('[childId+date]').equals([activeProfileId, todayStr]).filter((l) => l.kind === 'checkin').count()
        : 0,
    [activeProfileId, todayStr]
  );

  // Automatically create a session for the child today if none exists
  useEffect(() => {
    if (dbSeeded && activeProfileId && activeSession === undefined) {
      routineRepository.createSession(activeProfileId, todayStr);
    }
  }, [dbSeeded, activeProfileId, activeSession, todayStr]);

  // Buttons of a reminder notification (app in the background): snooze now, PIN for "stop tonight"
  const snoozeRef = useRef<(childId: string) => void>(() => {});
  useEffect(
    () =>
      onReminderAction(({ action, childId }) => {
        if (action === 'snooze') snoozeRef.current(childId);
        else setMuteAsk({ childIds: [childId] });
      }),
    []
  );

  // App shortcuts (long press on the Android icon): ?open=calm / ?open=parent
  const shortcutRef = useRef(new URLSearchParams(window.location.search).get('open'));

  useEffect(() => {
    const open = shortcutRef.current;
    if (!open || !dbSeeded || !settings) return;
    shortcutRef.current = null;
    window.history.replaceState(window.history.state, '', window.location.pathname);
    if (open === 'calm' && emotionSettings(settings).enabled) setCalm({});
    else if (open === 'parent') setPinPrompt(true);
  }, [dbSeeded, settings]);

  // Android status bar follows the screen (the child's color on their board); page language for TalkBack
  const statusBarColor = parentMode ? '#0f172a' : activeProfile ? childTheme(activeProfile.color).statusBar : '#1e1b4b';
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', statusBarColor);
  }, [statusBarColor]);
  useEffect(() => {
    document.documentElement.lang = settings?.language ?? 'fr';
  }, [settings?.language]);

  // Android Back: Parent Mode → home, a child's board → home
  useBackHandler(parentMode, () => setParentMode(false));
  useBackHandler(!parentMode && activeProfileId !== null, () => setActiveProfileId(null));

  // Reminders for tasks past their due time (all children, on every screen)
  const reminders = useTaskReminders({
    settings,
    profiles,
    tasks,
    today: todayStr,
    language: settings?.language ?? 'fr',
    paused: parentMode || calm !== null || emotionsHub !== null, // no reminder in the emotions space
  });
  snoozeRef.current = reminders.snooze;
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
  const emotions = emotionSettings(settings);
  const openCalm = emotions.enabled ? (childId?: string) => setCalm({ childId }) : undefined;
  const openEmotions = emotions.enabled ? (childId: string, initial: 'hub' | 'checkin' = 'hub') => setEmotionsHub({ childId, initial }) : undefined;
  const bedtimeDone =
    !!activeSession && getRoutinePhases(activeSession, tasks).some((p) => p.category === 'bedtime' && p.isCompleted);
  const showEveningInvite =
    !!openEmotions &&
    emotions.eveningCheckIn &&
    !!activeProfile &&
    bedtimeDone &&
    checkInsToday === 0 &&
    !celebrationActive &&
    inviteDismissed >= 0 &&
    !eveningInviteDismissed(activeProfile.id, todayStr);

  // Handle active session updates
  const handleUpdateSession = async (updatedSession: RoutineSession) => {
    const childId = updatedSession.childId;
    // One star per newly completed task, a medal every N stars (its choice shows from badgeOffers)
    await routineRepository.saveSessionWithRewards(updatedSession);

    // Partial days are kept in the history too (e.g. 9/12 tasks)
    await routineRepository.recordHistory(updatedSession, activeProfile?.name || '');

    const newTrophies = await routineRepository.awardNewTrophies(childId);

    const queued: Reveal[] = newTrophies.map((id): Reveal => ({ kind: 'trophy', childId, id, key: `trophy_${id}` }));
    if (queued.length > 0) {
      setReveals((current) => [...current, ...queued]);
    }
  };

  // A new medal first (the child picks it), then the trophies it may have unlocked
  const pendingOffers = activeProfile?.badgeOffers ?? [];
  const showMedalChoice = activeProfile !== null && pendingOffers.length > 0;
  const currentReveal = showMedalChoice ? undefined : reveals[0];
  const revealTotal = revealsShown + reveals.length;
  const revealPosition = revealTotal > 1 ? `${revealsShown + 1}/${revealTotal}` : undefined;
  const dismissReveal = () => {
    setRevealsShown((n) => (reveals.length <= 1 ? 0 : n + 1));
    setReveals((queue) => queue.slice(1));
  };
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
        history={history ?? []}
        language={activeLang}
        onClose={() => setParentMode(false)}
        onAddTask={handleAddTask}
        onUpdateTask={handleUpdateTask}
        onReorderTasks={handleReorderTasks}
        onDeleteTask={handleDeleteTask}
        onSavePeriods={(periods) => routineRepository.savePeriods(periods, todayStr)}
        today={todayStr}
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
          icon={TROPHY_ICONS[currentReveal.id]}
          heading={translate('trophies.new', activeLang)}
          title={translate(`trophy.${currentReveal.id}.name`, activeLang)}
          subtitle={translate(`trophy.${currentReveal.id}.hint`, activeLang)}
          spoken={translate('reveal.new_trophy_spoken', activeLang, {
            trophy: translate(`trophy.${currentReveal.id}.name`, activeLang),
          })}
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
          onSnooze={() => reminders.snooze(reminders.current!.childId)}
          onMute={() => setMuteAsk({ childIds: [reminders.current!.childId] })}
        />
      )}

      {muteAsk && (
        <PinModal
          correctPin={settings.parentPin}
          language={activeLang}
          title={translate('reminders.mute_title', activeLang)}
          instruction={translate('reminders.mute_instruction', activeLang)}
          onClose={() => setMuteAsk(null)}
          onSuccess={() => {
            void routineRepository.muteReminders(todayStr, muteAsk.childIds);
            setMuteAsk(null);
          }}
        />
      )}

      {/* A new medal: the child picks its motif (one screen per medal waiting) */}
      {showMedalChoice && activeProfile && (
        <MedalChoice
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
          onOpenCalm={openCalm && (() => openCalm(activeProfile.id))}
          dayKind={(() => {
            const day = dayContext(settings.periods, todayStr, activeProfile.id);
            return day.off ? 'off' : day.holidays ? 'holidays' : undefined;
          })()}
          eveningInvite={
            showEveningInvite
              ? {
                  onGo: () => openEmotions(activeProfile.id, 'checkin'),
                  onLater: () => {
                    dismissEveningInvite(activeProfile.id, todayStr);
                    setInviteDismissed((n) => n + 1);
                  },
                }
              : undefined
          }
        />
      ) : (
        <ProfileSelector
          profiles={profiles}
          onSelect={(p) => setActiveProfileId(p.id)}
          onEnterParentMode={() => setPinPrompt(true)}
          language={activeLang}
          lateCounts={lateCounts}
          tasks={tasks}
          sessions={allSessions.current}
          settings={settings}
          today={todayStr}
          onShowAbout={() => setShowAbout(true)}
          onOpenCalm={openCalm && (() => openCalm())}
          onOpenEmotions={openEmotions && ((childId: string) => openEmotions(childId))}
          onMuteReminders={() => setMuteAsk({})}
          onUnmuteReminders={() => void routineRepository.unmuteReminders()}
          banner={
            !installDismissed && (
              <InstallBanner
                install={install}
                language={activeLang}
                onDismiss={() => {
                  dismissInstallInvite();
                  setInstallDismissed(true);
                }}
              />
            )
          }
        />
      )}

      {emotionsHub && emotions.enabled && profiles.some((p) => p.id === emotionsHub.childId) && (
        <Suspense fallback={null}>
          <EmotionsHub
            language={activeLang}
            profile={profiles.find((p) => p.id === emotionsHub.childId)!}
            settings={emotions}
            initial={emotionsHub.initial}
            onClose={() => setEmotionsHub(null)}
            onOpenCalm={() => {
              setEmotionsHub(null);
              setCalm({ childId: emotionsHub.childId });
            }}
          />
        </Suspense>
      )}

      {calm && emotions.enabled && (
        <Suspense fallback={null}>
          <CalmCorner
            language={activeLang}
            profile={calm.childId ? profiles.find((p) => p.id === calm.childId) : null}
            settings={emotions}
            onClose={() => setCalm(null)}
          />
        </Suspense>
      )}

      {showAbout && !activeProfile && (
        <AboutModal language={activeLang} install={install} appUpdate={appUpdate} onClose={() => setShowAbout(false)} />
      )}

      {/* After an update: what changed (on the selection screen only) */}
      {whatsNew.length > 0 && !activeProfile && (
        <WhatsNewModal entries={whatsNew} language={activeLang} onClose={() => setWhatsNew([])} />
      )}
      {updateBanner}
    </>
  );
}
