import React, { useState } from 'react';
import { translate, Language } from '../../i18n/dictionary';
import { ChildProfile, TaskDefinition, ParentSettings, HistoryEntry } from '../../domain/models';
import { TaskManager } from './TaskManager';
import { ProfileManager } from './ProfileManager';
import { HistoryPanel } from './HistoryPanel';
import { SettingsPanel } from './SettingsPanel';
import { ShopManager } from './ShopManager';
import { shopItems } from '../../domain/rewards';
import { ShopItem } from '../../domain/models';
import { LogOut, LayoutGrid, Users, Calendar, Gift, Settings as Gear } from 'lucide-react';

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

  // Profiles handlers
  onAddProfile: (profile: Omit<ChildProfile, 'id'>) => Promise<void>;
  onUpdateProfile: (profile: ChildProfile) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;

  // History handlers
  onDeleteHistory: (id: string) => Promise<void>;

  // Settings handlers
  onSaveSettings: (settings: ParentSettings) => Promise<void>;
  onResetAllData: () => Promise<void>;
  onExportBackup: (includeHistory: boolean) => Promise<void>;
  onImportBackup: (fileContent: string) => Promise<void>;
  onSaveShop: (shop: ShopItem[]) => Promise<void>;
}

type TabId = 'tasks' | 'children' | 'shop' | 'history' | 'settings';

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
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
  onDeleteHistory,
  onSaveSettings,
  onResetAllData,
  onExportBackup,
  onImportBackup,
  onSaveShop,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('tasks');

  // Sidebar navigation configuration
  const navigationItems = [
    { id: 'tasks', label: translate('parent.tab.tasks', language), icon: LayoutGrid },
    { id: 'children', label: translate('parent.tab.children', language), icon: Users },
    { id: 'shop', label: translate('parent.tab.shop', language), icon: Gift },
    { id: 'history', label: translate('parent.tab.history', language), icon: Calendar },
    { id: 'settings', label: translate('parent.tab.settings', language), icon: Gear },
  ] as const;

  return (
    <div className="w-full h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-100 select-none relative">
      {/* Visual glowing decorations */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Main Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-slate-900/60 border-b border-white/5 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Gear className="w-5 h-5 animate-pulse-slow" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg md:text-xl text-white tracking-wide">
              {translate('parent.title', language)}
            </h1>
            <span className="text-[10px] text-white/40 tracking-wider uppercase font-semibold">
              Administration MVP
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 border border-rose-400/20 text-white font-bold rounded-xl active:scale-95 transition-all text-sm shadow-md"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>{translate('btn.exit_parent', language)}</span>
        </button>
      </header>

      {/* Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden z-10">
        {/* Sidebar Nav */}
        <nav className="w-full md:w-64 bg-slate-900/30 border-b md:border-b-0 md:border-r border-white/5 p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible shrink-0 scrollbar-none">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm tracking-wide transition-all whitespace-nowrap md:w-full ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10 border border-indigo-400/30'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab Panel Window */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-900/10">
          <div className="max-w-4xl mx-auto glass-panel p-6 border-white/5 bg-slate-900/40 shadow-2xl backdrop-blur-xl">
            {activeTab === 'tasks' && (
              <TaskManager
                tasks={tasks}
                language={language}
                onAddTask={onAddTask}
                onUpdateTask={onUpdateTask}
                onReorderTasks={onReorderTasks}
                onDeleteTask={onDeleteTask}
              />
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
              <HistoryPanel
                history={history}
                language={language}
                onDeleteHistory={onDeleteHistory}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsPanel
                settings={settings}
                language={language}
                onSaveSettings={onSaveSettings}
                onResetAllData={onResetAllData}
                onExportBackup={onExportBackup}
                onImportBackup={onImportBackup}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
