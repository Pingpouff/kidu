import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDatabase, saveSettings } from './persistence/db';
import { routineRepository } from './persistence/routineRepository';
import { ChildProfile, TaskDefinition, ParentSettings, RoutineSession } from './domain/models';
import { ProfileSelector } from './components/child-board/ProfileSelector';
import { RoutineBoard } from './components/child-board/RoutineBoard';
import { Celebration } from './components/rewards/Celebration';
import { PinModal } from './components/parent-mode/PinModal';
import { Dashboard as ParentDashboard } from './components/parent-mode/Dashboard';
import { reminderService } from './services/ReminderService';
import { backupFileName, parseBackup } from './domain/backup';

export default function App() {
  const [dbSeeded, setDbSeeded] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [parentMode, setParentMode] = useState(false);
  const [pinPrompt, setPinPrompt] = useState(false);
  const [celebrationActive, setCelebrationActive] = useState(false);

  // Seed DB on mount
  useEffect(() => {
    seedDatabase().then(() => setDbSeeded(true));
  }, []);

  // Fetch reactive data using Dexie live queries
  const profiles = useLiveQuery(() => db.profiles.toArray());
  const tasks = useLiveQuery(() => db.tasks.toArray());
  const history = useLiveQuery(() => db.history.toArray());
  const settings = useLiveQuery(() => db.settings.get('current'));

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
    await routineRepository.saveActiveSession(updatedSession);
    
    // Check if session has been completed to record history & award stars
    if (updatedSession.isCompleted) {
      await routineRepository.recordHistoryAndAwardStars(
        updatedSession,
        activeProfile?.name || '',
        settings.rewards.starsPerCompletion
      );
    }
  };

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
          starsEarned={settings.rewards.starsPerCompletion}
          onDismiss={() => {
            setCelebrationActive(false);
            setActiveProfileId(null); // return to select child screen
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
