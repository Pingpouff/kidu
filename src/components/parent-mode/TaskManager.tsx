import React, { useState } from 'react';
import { buttonClass, fieldClass } from '../../ui/styles';
import { ChildProfile, TaskDefinition, TaskCategory, TaskSchedule, TASK_CATEGORIES, CATEGORY_ICONS } from '../../domain/models';
import { getTaskCategory, sortDefinitions } from '../../domain/routine';
import { isValidTimeWindow } from '../../domain/reminders';
import { translate, taskLabel, Language } from '../../i18n/dictionary';
import { Plus, X } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PanelHeader } from '../../ui/Panel';
import { AssigneePicker, CategorySelect, DurationInput, SchedulePicker, TimeWindowInputs } from './tasks/TaskFields';
import { parseDuration } from '../../domain/timer';
import { DayPicker } from './tasks/DayPicker';
import { SortableTaskRow } from './tasks/SortableTaskRow';

interface TaskManagerProps {
  tasks: TaskDefinition[];
  profiles: ChildProfile[];
  language: Language;
  onAddTask: (task: Omit<TaskDefinition, 'id'>) => Promise<void>;
  onUpdateTask: (task: TaskDefinition) => Promise<void>;
  onReorderTasks: (reorderedTasks: TaskDefinition[]) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  tasks,
  profiles,
  language,
  onAddTask,
  onUpdateTask,
  onReorderTasks,
  onDeleteTask,
}) => {
  // Add new task form states
  const [newIcon, setNewIcon] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [showNewPicker, setShowNewPicker] = useState(false);
  const [newCategory, setNewCategory] = useState<TaskCategory>(TASK_CATEGORIES[0]);
  const [newDueTime, setNewDueTime] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newAssigned, setNewAssigned] = useState<string[]>([]); // empty = every child
  const [newDays, setNewDays] = useState<number[]>([]); // empty = every day
  const [newDuration, setNewDuration] = useState(''); // minutes, empty = not timed
  const [newSchedule, setNewSchedule] = useState<TaskSchedule | undefined>(undefined); // undefined = always
  const [showForm, setShowForm] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIcon, setEditIcon] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editOrder, setEditOrder] = useState<number>(1);
  const [editCategory, setEditCategory] = useState<TaskCategory>(TASK_CATEGORIES[0]);
  const [editDueTime, setEditDueTime] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editAssigned, setEditAssigned] = useState<string[]>([]);
  const [editDays, setEditDays] = useState<number[]>([]);
  const [editDuration, setEditDuration] = useState('');
  const [editSchedule, setEditSchedule] = useState<TaskSchedule | undefined>(undefined);
  const [showEditPicker, setShowEditPicker] = useState(false);

  // Setup sensors for desktop & mobile touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // 150ms delay to support touch screen page scrolling
        tolerance: 8,
      },
    })
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIcon.trim() || !newLabel.trim()) return;
    if (!isValidTimeWindow(newStartTime || undefined, newDueTime || undefined)) return;
    if (newDuration !== '' && parseDuration(newDuration) === undefined) return;
    const durationMinutes = parseDuration(newDuration);

    await onAddTask({
      icon: newIcon.trim(),
      labelKey: '', // Empty indicates custom user label
      defaultLabel: newLabel.trim(),
      order: tasks.length > 0 ? Math.max(...tasks.map((t) => t.order)) + 1 : 1,
      category: newCategory,
      ...(newStartTime ? { startTime: newStartTime } : {}),
      ...(newDueTime ? { dueTime: newDueTime } : {}),
      ...(newAssigned.length ? { assignedTo: newAssigned } : {}),
      ...(newDays.length ? { days: newDays } : {}),
      ...(durationMinutes ? { durationMinutes } : {}),
      ...(newSchedule ? { schedule: newSchedule } : {}),
    });

    setNewIcon('');
    setNewLabel('');
  };

  const startEdit = (task: TaskDefinition) => {
    setEditingId(task.id);
    setEditIcon(task.icon);
    setEditLabel(taskLabel(task, language));
    setEditOrder(task.order);
    setEditCategory(getTaskCategory(task));
    setEditDueTime(task.dueTime ?? '');
    setEditStartTime(task.startTime ?? '');
    setEditAssigned(task.assignedTo ?? []);
    setEditDays(task.days ?? []);
    setEditDuration(task.durationMinutes ? String(task.durationMinutes) : '');
    setEditSchedule(task.schedule);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (task: TaskDefinition) => {
    if (!editIcon.trim() || !editLabel.trim()) return;
    if (!isValidTimeWindow(editStartTime || undefined, editDueTime || undefined)) return;
    if (editDuration !== '' && parseDuration(editDuration) === undefined) return;
    const durationMinutes = parseDuration(editDuration);

    // Without a due time / assignment, the field is removed (no reminder / common task)
    const rest = { ...task };
    delete rest.dueTime;
    delete rest.startTime;
    delete rest.assignedTo;
    delete rest.days;
    delete rest.durationMinutes;
    delete rest.schedule;
    await onUpdateTask({
      ...rest,
      ...(editStartTime ? { startTime: editStartTime } : {}),
      ...(editDueTime ? { dueTime: editDueTime } : {}),
      ...(editAssigned.length ? { assignedTo: editAssigned } : {}),
      ...(editDays.length ? { days: editDays } : {}),
      ...(durationMinutes ? { durationMinutes } : {}),
      ...(editSchedule ? { schedule: editSchedule } : {}),
      icon: editIcon.trim(),
      defaultLabel: editLabel.trim(),
      labelKey: '', // Custom label overrides key translation
      order: Number(editOrder),
      category: editCategory,
    });

    setEditingId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sorted = sortDefinitions(tasks);
    const oldIndex = sorted.findIndex((t) => t.id === active.id);
    const newIndex = sorted.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;
    // Tasks are only reordered inside their own phase
    if (getTaskCategory(sorted[oldIndex]) !== getTaskCategory(sorted[newIndex])) return;

    const reordered = arrayMove(sorted, oldIndex, newIndex);

    // Bulk update positions in IndexedDB
    const updatedTasks = reordered.map((task, index) => ({
      ...task,
      order: index + 1,
    }));

    await onReorderTasks(updatedTasks);
  };

  // Group tasks by phase, sorted by order inside each phase
  const sortedTasks = sortDefinitions(tasks);
  const groups = TASK_CATEGORIES
    .map((category) => ({
      category,
      tasks: sortedTasks.filter((t) => getTaskCategory(t) === category),
    }))
    .filter((g) => g.tasks.length > 0);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PanelHeader
        title={translate('parent.tasks.title', language)}
        className="items-center"
        action={!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            data-testid="open-task-form"
            className={buttonClass('primary', 'md', 'shrink-0 gap-1.5 px-3 sm:px-4 py-2')}
          >
            <Plus className="w-4 h-4" />
            {translate('parent.tasks.add', language)}
          </button>
        )}
      />

      {/* Task Creation Form (folded by default so the list comes first) */}
      {showForm && (
      <form onSubmit={handleAdd} className="relative flex flex-col gap-3 bg-white/5 p-3 sm:p-4 rounded-2xl border border-indigo-500/30">
        <button
          type="button"
          onClick={() => setShowForm(false)}
          aria-label={translate('btn.close', language)}
          className="absolute -top-3 -right-2 w-8 h-8 rounded-full bg-slate-800 border border-white/15 text-white/70 hover:text-white flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex flex-wrap gap-2 sm:gap-3">
        <div className="relative w-20 sm:w-24">
          <input
            type="text"
            maxLength={4}
            value={newIcon}
            onFocus={() => setShowNewPicker(true)}
            onChange={(e) => setNewIcon(e.target.value)}
            placeholder={translate('parent.tasks.icon_placeholder', language)}
            className={fieldClass('lg', 'w-full text-center text-xl cursor-pointer')}
          />
          {showNewPicker && (
            <EmojiPicker
              language={language}
              onSelect={(emoji) => setNewIcon(emoji)}
              onClose={() => setShowNewPicker(false)}
            />
          )}
        </div>
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder={translate('parent.tasks.label_placeholder', language)}
          className={fieldClass('lg', 'flex-1 min-w-[10rem]')}
        />
        <CategorySelect
          value={newCategory}
          onChange={setNewCategory}
          language={language}
          className={fieldClass('lg', 'px-3 text-sm')}
        />
        <button
          type="submit"
          className={buttonClass('primary', 'lg')}
        >
          <Plus className="w-5 h-5" />
          <span>{translate('btn.add', language)}</span>
        </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <TimeWindowInputs
            start={newStartTime}
            end={newDueTime}
            onStart={setNewStartTime}
            onEnd={setNewDueTime}
            language={language}
            inputClassName={fieldClass('md', 'px-2')}
          />
          <DurationInput value={newDuration} onChange={setNewDuration} language={language} inputClassName={fieldClass('md', 'px-2')} />
          <AssigneePicker profiles={profiles} value={newAssigned} onChange={setNewAssigned} language={language} />
          <DayPicker value={newDays} onChange={setNewDays} language={language} />
          <SchedulePicker value={newSchedule} onChange={setNewSchedule} language={language} />
        </div>
      </form>
      )}

      {/* Task list list with DndContext */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.category} className="flex flex-col gap-3" data-testid={`task-group-${group.category}`}>
              <h4 className="flex items-center gap-2 text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                <span className="text-base">{CATEGORY_ICONS[group.category]}</span>
                {translate(`category.${group.category}`, language)}
              </h4>
              <SortableContext
                items={group.tasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-3">
                  {group.tasks.map((task) => (
                    <SortableTaskRow
                      key={task.id}
                      task={task}
                      profiles={profiles}
                      language={language}
                      editAssigned={editAssigned}
                      editDays={editDays}
                      setEditDays={setEditDays}
                      editDuration={editDuration}
                      setEditDuration={setEditDuration}
                      editSchedule={editSchedule}
                      setEditSchedule={setEditSchedule}
                      setEditAssigned={setEditAssigned}
                      editingId={editingId}
                      showEditPicker={showEditPicker}
                      editIcon={editIcon}
                      editLabel={editLabel}
                      editOrder={editOrder}
                      editCategory={editCategory}
                      editDueTime={editDueTime}
                      setEditDueTime={setEditDueTime}
                      editStartTime={editStartTime}
                      setEditStartTime={setEditStartTime}
                      setEditCategory={setEditCategory}
                      setShowEditPicker={setShowEditPicker}
                      setEditIcon={setEditIcon}
                      setEditLabel={setEditLabel}
                      setEditOrder={setEditOrder}
                      startEdit={startEdit}
                      cancelEdit={cancelEdit}
                      saveEdit={saveEdit}
                      onDeleteTask={onDeleteTask}
                    />
                  ))}
                </div>
              </SortableContext>
            </section>
          ))}
        </div>
      </DndContext>
    </div>
  );
};
