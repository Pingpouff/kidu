import React, { useState } from 'react';
import { translate, Language } from '../../i18n/dictionary';
import { ChildProfile, TaskDefinition, ParentSettings, HistoryEntry, CalendarPeriod } from '../../domain/models';
import { TaskManager } from './TaskManager';
import { CalendarPanel } from './CalendarPanel';
import { ProfileManager } from './ProfileManager';
import { HistoryPanel } from './HistoryPanel';
import { SettingsPanel } from './SettingsPanel';
import { ShopManager } from './ShopManager';
import { shopItems } from '../../domain/rewards';
import { ShopItem } from '../../domain/models';
import { LogOut, LayoutGrid, Users, Calendar, Gift, Smile, Settings as Gear, MoreHorizontal } from 'lucide-react';
import { Overlay } from '../../ui/Overlay';
import { EmotionsPanel } from '../../features/emotions/components/parent/EmotionsPanel';
import { emotionSettings } from '../../features/emotions/domain/settings';
import { buttonClass } from '../../ui/styles';
import { CardHistory } from './CardHistory';
import type { AppUpdate } from '../../services/appUpdate';
import { isBackupDue } from '../../domain/backup';

interface DashboardProps {
  profiles: ChildProfile[];
  tasks: TaskDefinition[];
  settings: ParentSettings;
  history: HistoryEntry[];
  language: Language;
  onClose: () => void;
  
  // Tasks handlers
  onAddTask: (task: Omit<TaskDefinition, 'id'>) => Promise<void>;
  onUpdateTask: (task: TaskDefinition) => Promise<void>;
  onReorderTasks: (reorderedTasks: TaskDefinition[]) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  /** Holidays and rest days */
  onSavePeriods: (periods: CalendarPeriod[]) => Promise<void>;
  /** Today, YYYY-MM-DD */
  today: string;

  // Profiles handlers
  onAddProfile: (profile: Omit<ChildProfile, 'id'>) => Promise<void>;
  onUpdateProfile: (profile: ChildProfile) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;

  // History handlers
  onDeleteHistory: (id: string) => Promise<void>;
  onWithdrawCard: (childId: string, cardId: string) => Promise<void>;

  // Settings handlers
  onSaveSettings: (settings: ParentSettings) => Promise<void>;
  onResetAllData: () => Promise<void>;
  onExportBackup: (includeHistory: boolean) => Promise<void>;
  onImportBackup: (fileContent: string) => Promise<void>;
  onSaveShop: (shop: ShopItem[]) => Promise<void>;
  /** Service worker update state (absent in tests) */
  appUpdate?: AppUpdate;
}

/** Destinations in the phone / tablet bottom bar (Material: 3 to 5) */
const BAR_MAX = 5;

type TabId = 'tasks' | 'children' | 'shop' | 'history' | 'emotions' | 'settings';

export const Dashboard: React.FC<DashboardProps> = ({
  profiles,
  tasks,
  settings,
  history,
  language,
  onClose,
  onAddTask,
  onUpdateTask,
  onReorderTasks,
  onDeleteTask,
  onSavePeriods,
  today,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
  onDeleteHistory,
  onWithdrawCard,
  onSaveSettings,
  onResetAllData,
  onExportBackup,
  onImportBackup,
  onSaveShop,
  appUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('tasks');
  // Phones / tablets: a bottom bar of 5 destinations at most (Material); the others go in "Plus"
  const [showMore, setShowMore] = useState(false);
  const [backupReminderHidden, setBackupReminderHidden] = useState(false);
  const [now] = useState(() => Date.now());
  const showBackupReminder = !backupReminderHidden && isBackupDue(settings.lastBackupAt, history.length, now);

  // Sidebar navigation configuration
  const navigationItems = [
    { id: 'tasks', label: translate('parent.tab.tasks', language), short: translate('parent.tab.tasks_short', language), icon: LayoutGrid },
    { id: 'children', label: translate('parent.tab.children', language), short: translate('parent.tab.children', language), icon: Users },
    { id: 'shop', label: translate('parent.tab.shop', language), short: translate('parent.tab.shop', language), icon: Gift },
    { id: 'history', label: translate('parent.tab.history', language), short: translate('parent.tab.history', language), icon: Calendar },
    ...(emotionSettings(settings).enabled
      ? [{ id: 'emotions', label: translate('parent.tab.emotions', language), short: translate('parent.tab.emotions', language), icon: Smile } as const]
      : []),
    { id: 'settings', label: translate('parent.tab.settings', language), short: translate('parent.tab.settings_short', language), icon: Gear },
  ] as const;
  const overflow = navigationItems.length > BAR_MAX;
  const barCount = overflow ? BAR_MAX : navigationItems.length;
  const moreActive = overflow && navigationItems.findIndex((i) => i.id === activeTab) >= BAR_MAX - 1;

  return (
    <div className="w-full h-[100dvh] bg-slate-950 flex flex-col overflow-hidden text-slate-100 select-none relative">
      {/* Visual glowing decorations */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Main Header */}
      <header className="flex justify-between items-center gap-3 px-3 py-2.5 sm:px-6 sm:py-4 bg-slate-900/60 border-b border-white/5 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 items-center justify-center text-indigo-400">
            <Gear className="w-5 h-5 animate-pulse-slow" />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-base sm:text-lg md:text-xl text-white tracking-wide truncate">
              {translate('parent.title', language)}
            </h1>
            <span className="hidden sm:block text-xs text-white/60 tracking-wider uppercase font-semibold">
              {translate('parent.subtitle', language)}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label={translate('btn.exit_parent', language)}
          className={buttonClass('danger', 'md', 'shrink-0 px-3 sm:px-4 py-2 shadow-md')}
        >
          <LogOut className="w-4.5 h-4.5" />
          <span className="hidden sm:inline">{translate('btn.exit_parent', language)}</span>
          <span className="sm:hidden">{translate('btn.exit_short', language)}</span>
        </button>
      </header>

      {settings.parentPin === '1234' && activeTab !== 'settings' && (
        <div
          role="status"
          data-testid="default-pin-warning"
          className="z-10 flex flex-wrap items-center justify-center gap-3 px-4 py-2 bg-amber-500/15 border-b border-amber-400/30 text-amber-100 text-xs sm:text-sm"
        >
          <span>{translate('parent.default_pin_warning', language)}</span>
          <button type="button" onClick={() => setActiveTab('settings')} className={buttonClass('secondary', 'sm', 'py-1')}>
            {translate('parent.default_pin_action', language)}
          </button>
        </div>
      )}

      {showBackupReminder && (
        <div
          role="status"
          data-testid="backup-reminder"
          className="z-10 flex flex-wrap items-center justify-center gap-3 px-4 py-2 bg-sky-500/15 border-b border-sky-400/30 text-sky-100 text-xs sm:text-sm"
        >
          <span>💾 {translate('parent.backup.reminder', language)}</span>
          <button
            type="button"
            onClick={async () => {
              await onExportBackup(true);
              setBackupReminderHidden(true);
            }}
            className={buttonClass('primary', 'sm', 'py-1')}
          >
            {translate('parent.backup.reminder_action', language)}
          </button>
          <button type="button" onClick={() => setBackupReminderHidden(true)} className={buttonClass('secondary', 'sm', 'py-1')}>
            {translate('update.later', language)}
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden z-10">
        {/* Navigation: bottom bar on phones / tablets (5 destinations at most, the rest in "Plus"), sidebar on large screens */}
        <nav
          aria-label={translate('parent.title', language)}
          className="order-last lg:order-none w-full lg:w-64 bg-slate-900/80 lg:bg-slate-900/30 border-t lg:border-t-0 lg:border-r border-white/10 lg:border-white/5 p-1.5 sm:p-2 lg:p-4 grid lg:flex lg:flex-col gap-1 sm:gap-2 shrink-0"
          style={{ gridTemplateColumns: `repeat(${barCount}, minmax(0, 1fr))` }}
        >
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const inMore = overflow && index >= BAR_MAX - 1;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`${inMore ? 'hidden lg:flex' : 'flex'} min-h-[56px] lg:min-h-0 flex-col sm:flex-row items-center justify-center lg:justify-start gap-1 sm:gap-2 lg:gap-3 px-1 sm:px-3 lg:px-4 py-2 lg:py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all lg:w-full min-w-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10 border border-indigo-400/30'
                    : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="truncate max-w-full lg:hidden">{item.short}</span>
                <span className="hidden lg:inline">{item.label}</span>
              </button>
            );
          })}
          {overflow && (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              aria-label={translate('parent.tab.more', language)}
              aria-haspopup="dialog"
              data-testid="parent-more"
              className={`lg:hidden flex min-h-[56px] flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3 py-2 rounded-xl font-bold text-xs sm:text-sm tracking-wide min-w-0 ${
                moreActive ? 'bg-indigo-600 text-white border border-indigo-400/30' : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <MoreHorizontal className="w-5 h-5 shrink-0" />
              <span className="truncate max-w-full">{moreActive ? navigationItems.find((i) => i.id === activeTab)?.short : translate('parent.tab.more', language)}</span>
            </button>
          )}
        </nav>

        {/* "Plus": a bottom sheet with the other destinations */}
        {showMore && (
          <Overlay
            layer="dialog"
            onClose={() => setShowMore(false)}
            closeOnBackdrop
            aria-label={translate('parent.tab.more', language)}
            data-testid="parent-more-sheet"
            className="bg-black/60 flex items-end"
          >
            <div className="w-full bg-slate-900 border-t border-white/10 rounded-t-3xl p-3 pb-5 flex flex-col gap-1">
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/30" aria-hidden="true" />
              {navigationItems.slice(BAR_MAX - 1).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setShowMore(false);
                    }}
                    aria-current={activeTab === item.id ? 'page' : undefined}
                    className={`flex items-center gap-4 min-h-[56px] px-4 rounded-2xl font-bold text-base ${
                      activeTab === item.id ? 'bg-indigo-600 text-white' : 'text-white/85 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </Overlay>
        )}

        {/* Tab Panel Window */}
        <main className="flex-1 overflow-y-auto p-2 sm:p-6 lg:p-8 bg-slate-900/10">
          <div className="max-w-4xl mx-auto glass-panel p-3 sm:p-6 border-white/5 bg-slate-900/40 shadow-2xl backdrop-blur-xl">
            {activeTab === 'tasks' && (
              <div className="flex flex-col gap-6">
                <TaskManager
                  tasks={tasks}
                  profiles={profiles}
                  language={language}
                  onAddTask={onAddTask}
                  onUpdateTask={onUpdateTask}
                  onReorderTasks={onReorderTasks}
                  onDeleteTask={onDeleteTask}
                />
                <hr className="border-white/10" />
                <CalendarPanel
                  periods={settings.periods ?? []}
                  profiles={profiles}
                  language={language}
                  today={today}
                  onSave={onSavePeriods}
                />
              </div>
            )}
            {activeTab === 'children' && (
              <ProfileManager
                profiles={profiles}
                language={language}
                onAddProfile={onAddProfile}
                onUpdateProfile={onUpdateProfile}
                onDeleteProfile={onDeleteProfile}
              />
            )}
            {activeTab === 'shop' && (
              <ShopManager
                shop={shopItems(settings)}
                profiles={profiles}
                language={language}
                onSaveShop={onSaveShop}
              />
            )}
            {activeTab === 'history' && (
              <div className="flex flex-col gap-8">
                <CardHistory profiles={profiles} language={language} onWithdraw={onWithdrawCard} />
                <HistoryPanel
                  history={history}
                  language={language}
                  onDeleteHistory={onDeleteHistory}
                />
              </div>
            )}
            {activeTab === 'emotions' && <EmotionsPanel profiles={profiles} settings={settings} language={language} />}
            {activeTab === 'settings' && (
              <SettingsPanel
                settings={settings}
                language={language}
                onSaveSettings={onSaveSettings}
                onResetAllData={onResetAllData}
                onExportBackup={onExportBackup}
                onImportBackup={onImportBackup}
                appUpdate={appUpdate}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
