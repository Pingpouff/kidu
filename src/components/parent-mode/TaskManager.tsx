import React, { useState } from 'react';
import { ConfirmIconButton, IconButton } from '../../ui/controls';
import { buttonClass, chipClass, fieldClass } from '../../ui/styles';
import { ChildProfile, TaskDefinition, TaskCategory, TASK_CATEGORIES, CATEGORY_ICONS } from '../../domain/models';
import { getTaskCategory, sortDefinitions } from '../../domain/routine';
import { isValidTimeWindow } from '../../domain/reminders';
import { translate, taskLabel, Language } from '../../i18n/dictionary';
import { Plus, Trash2, Edit2, Check, X, GripVertical } from 'lucide-react';
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PanelHeader } from '../../ui/Panel';

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
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (task: TaskDefinition) => {
    if (!editIcon.trim() || !editLabel.trim()) return;
    if (!isValidTimeWindow(editStartTime || undefined, editDueTime || undefined)) return;

    // Without a due time / assignment, the field is removed (no reminder / common task)
    const rest = { ...task };
    delete rest.dueTime;
    delete rest.startTime;
    delete rest.assignedTo;
    delete rest.days;
    await onUpdateTask({
      ...rest,
      ...(editStartTime ? { startTime: editStartTime } : {}),
      ...(editDueTime ? { dueTime: editDueTime } : {}),
      ...(editAssigned.length ? { assignedTo: editAssigned } : {}),
      ...(editDays.length ? { days: editDays } : {}),
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
          <AssigneePicker profiles={profiles} value={newAssigned} onChange={setNewAssigned} language={language} />
          <DayPicker value={newDays} onChange={setNewDays} language={language} />
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

/* Phase selector shared by the creation and edit forms */
interface CategorySelectProps {
  value: TaskCategory;
  onChange: (category: TaskCategory) => void;
  language: Language;
  className: string;
}

const CategorySelect: React.FC<CategorySelectProps> = ({ value, onChange, language, className }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as TaskCategory)}
    aria-label={translate('parent.tasks.category', language)}
    className={className}
  >
    {TASK_CATEGORIES.map((category) => (
      <option key={category} value={category}>
        {CATEGORY_ICONS[category]} {translate(`category.${category}`, language)}
      </option>
    ))}
  </select>
);

/** Expected start and end times, with a warning when the start is not before the end. */
interface TimeWindowInputsProps {
  start: string;
  end: string;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
  language: Language;
  inputClassName: string;
}

const TimeWindowInputs: React.FC<TimeWindowInputsProps> = ({ start, end, onStart, onEnd, language, inputClassName }) => {
  const invalid = !isValidTimeWindow(start || undefined, end || undefined);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <label className="flex flex-col text-[10px] font-bold text-sky-300/80 uppercase tracking-wide" title={translate('parent.tasks.start_time_hint', language)}>
          🚀 {translate('parent.tasks.start_short', language)}
          <input
            type="time"
            value={start}
            onChange={(e) => onStart(e.target.value)}
            aria-label={translate('parent.tasks.start_time', language)}
            aria-invalid={invalid}
            className={`${inputClassName} ${invalid ? '!border-rose-500' : ''}`}
          />
        </label>
        <span className="text-white/30 pt-4">→</span>
        <label className="flex flex-col text-[10px] font-bold text-amber-300/80 uppercase tracking-wide" title={translate('parent.tasks.due_time_hint', language)}>
          ⏰ {translate('parent.tasks.end_short', language)}
          <input
            type="time"
            value={end}
            onChange={(e) => onEnd(e.target.value)}
            aria-label={translate('parent.tasks.due_time', language)}
            aria-invalid={invalid}
            className={`${inputClassName} ${invalid ? '!border-rose-500' : ''}`}
          />
        </label>
      </div>
      {invalid && (
        <p className="text-xs font-bold text-rose-300" role="alert" data-testid="time-window-error">
          {translate('parent.tasks.window_invalid', language)}
        </p>
      )}
    </div>
  );
};

/**
 * Who does the task: every child (default) or only some of them.
 * Selecting every child explicitly comes back to a common task.
 */
interface AssigneePickerProps {
  profiles: ChildProfile[];
  value: string[]; // empty = every child
  onChange: (ids: string[]) => void;
  language: Language;
  compact?: boolean;
}

export const AssigneePicker: React.FC<AssigneePickerProps> = ({ profiles, value, onChange, language, compact = false }) => {
  const known = value.filter((id) => profiles.some((p) => p.id === id));
  const toggle = (id: string) => {
    const next = known.includes(id) ? known.filter((x) => x !== id) : [...known, id];
    onChange(next.length === profiles.length ? [] : next);
  };
  const chip = (active: boolean) => chipClass(active, compact);
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={translate('parent.tasks.assigned_to', language)}>
      <span className="text-xs font-bold text-white/50">{translate('parent.tasks.assigned_to', language)}</span>
      <button type="button" aria-pressed={known.length === 0} onClick={() => onChange([])} className={chip(known.length === 0)}>
        👨‍👩‍👧 {translate('parent.tasks.everyone', language)}
      </button>
      {profiles.map((p) => (
        <button key={p.id} type="button" aria-pressed={known.includes(p.id)} onClick={() => toggle(p.id)} className={chip(known.includes(p.id))}>
          <span>{p.avatar}</span>
          {p.name}
        </button>
      ))}
    </div>
  );
};

/** Days of the week, Monday first (0 = Sunday … 6 = Saturday) */
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const SCHOOL_DAYS = [1, 2, 3, 4, 5];

/** Short localized day name ("lun.", "Mon") */
const dayName = (day: number, language: Language) =>
  new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short' }).format(new Date(2023, 0, 1 + day)); // 2023-01-01 is a Sunday

const sameDays = (a: number[], b: number[]) => a.length === b.length && b.every((d) => a.includes(d));

/** "Mon → Fri", or the list of days in week order */
const daysLabel = (days: number[], language: Language) =>
  sameDays(days, SCHOOL_DAYS)
    ? translate('parent.tasks.school_days', language)
    : WEEK.filter((d) => days.includes(d)).map((d) => dayName(d, language)).join(' ');

/**
 * Days the task is planned. Empty = every day; choosing all seven days comes back to "every day".
 */
interface DayPickerProps {
  value: number[];
  onChange: (days: number[]) => void;
  language: Language;
  compact?: boolean;
}

export const DayPicker: React.FC<DayPickerProps> = ({ value, onChange, language, compact = false }) => {
  const toggle = (day: number) => {
    const next = value.includes(day) ? value.filter((d) => d !== day) : [...value, day];
    onChange(next.length === 7 ? [] : WEEK.filter((d) => next.includes(d)));
  };
  const chip = (active: boolean) => chipClass(active, compact);
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={translate('parent.tasks.days', language)} data-testid="day-picker">
      <span className="text-xs font-bold text-white/50">{translate('parent.tasks.days', language)}</span>
      <button type="button" aria-pressed={value.length === 0} onClick={() => onChange([])} className={chip(value.length === 0)}>
        {translate('parent.tasks.every_day', language)}
      </button>
      <button type="button" aria-pressed={sameDays(value, SCHOOL_DAYS)} onClick={() => onChange(SCHOOL_DAYS)} className={chip(sameDays(value, SCHOOL_DAYS))}>
        {translate('parent.tasks.school_days', language)}
      </button>
      {WEEK.map((d) => (
        <button key={d} type="button" aria-pressed={value.includes(d)} onClick={() => toggle(d)} className={chip(value.includes(d))}>
          {dayName(d, language)}
        </button>
      ))}
    </div>
  );
};

/* Sortable Task Row Item Wrapper Component */
interface SortableTaskRowProps {
  task: TaskDefinition;
  profiles: ChildProfile[];
  editAssigned: string[];
  editDays: number[];
  setEditDays: (days: number[]) => void;
  setEditAssigned: (ids: string[]) => void;
  language: Language;
  editingId: string | null;
  showEditPicker: boolean;
  editIcon: string;
  editLabel: string;
  editOrder: number;
  editCategory: TaskCategory;
  editDueTime: string;
  setEditDueTime: (val: string) => void;
  editStartTime: string;
  setEditStartTime: (val: string) => void;
  setEditCategory: (val: TaskCategory) => void;
  setShowEditPicker: (show: boolean) => void;
  setEditIcon: (val: string) => void;
  setEditLabel: (val: string) => void;
  setEditOrder: (val: number) => void;
  startEdit: (task: TaskDefinition) => void;
  cancelEdit: () => void;
  saveEdit: (task: TaskDefinition) => void;
  onDeleteTask: (id: string) => Promise<void>;
}

const SortableTaskRow: React.FC<SortableTaskRowProps> = ({
  task,
  profiles,
  editAssigned,
  editDays,
  setEditDays,
  setEditAssigned,
  language,
  editingId,
  showEditPicker,
  editIcon,
  editLabel,
  editOrder,
  editCategory,
  editDueTime,
  setEditDueTime,
  editStartTime,
  setEditStartTime,
  setEditCategory,
  setShowEditPicker,
  setEditIcon,
  setEditLabel,
  setEditOrder,
  startEdit,
  cancelEdit,
  saveEdit,
  onDeleteTask,
}) => {
  const isEditing = editingId === task.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isEditing, // Disable sorting inputs while editing
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Ghost dashed outline style when active drag is in progress
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center justify-between p-3 bg-slate-950/40 border-2 border-dashed border-white/20 rounded-2xl h-[74px] opacity-40"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="task-row"
      className={`flex items-center justify-between p-2 sm:p-3 bg-white/5 rounded-2xl border transition-all ${
        isEditing ? 'border-indigo-500/50 bg-indigo-950/20' : 'border-white/5 hover:bg-white/10'
      }`}
    >
      <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
        {/* Dedicated Grip Handle on the left */}
        {!isEditing && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-white/5 rounded text-white/40 hover:text-white/80 transition-colors touch-none"
            aria-label={translate('parent.tasks.drag', language)}
          >
            <GripVertical className="w-5 h-5" />
          </button>
        )}

        {isEditing ? (
          /* Edit Mode Inputs */
          <div className="flex-1 min-w-0 flex flex-wrap gap-3 items-center">
            <div className="relative">
              <input
                type="text"
                maxLength={4}
                value={editIcon}
                onFocus={() => setShowEditPicker(true)}
                onChange={(e) => setEditIcon(e.target.value)}
                className={fieldClass('sm', 'w-16 text-center text-lg cursor-pointer', { editing: true })}
              />
              {showEditPicker && (
                <EmojiPicker
                  language={language}
                  onSelect={(emoji) => setEditIcon(emoji)}
                  onClose={() => setShowEditPicker(false)}
                />
              )}
            </div>
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className={fieldClass('sm', 'flex-1', { editing: true })}
            />
            <CategorySelect
              value={editCategory}
              onChange={setEditCategory}
              language={language}
              className={fieldClass('sm', undefined, { editing: true })}
            />
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <span>{translate('parent.tasks.order', language)}:</span>
              <input
                type="number"
                value={editOrder}
                onChange={(e) => setEditOrder(Number(e.target.value))}
                className={fieldClass('sm', 'w-14 px-1 text-center', { editing: true })}
              />
            </div>
            <div className="basis-full flex flex-wrap items-center gap-x-6 gap-y-2">
              <TimeWindowInputs
                start={editStartTime}
                end={editDueTime}
                onStart={setEditStartTime}
                onEnd={setEditDueTime}
                language={language}
                inputClassName={fieldClass('sm', 'px-2', { editing: true })}
              />
              <AssigneePicker profiles={profiles} value={editAssigned} onChange={setEditAssigned} language={language} compact />
              <DayPicker value={editDays} onChange={setEditDays} language={language} compact />
            </div>
          </div>
        ) : (
          /* Display Mode Row */
          <div className="flex items-center gap-2.5 sm:gap-4 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-2xl shadow-inner select-none">
              {task.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm md:text-base line-clamp-2 break-words">
                {taskLabel(task, language)}
              </p>
              <span className="text-[10px] text-indigo-400/70 font-semibold tracking-wider uppercase">
                {task.startTime && <span className="mr-2 text-sky-300" data-testid="task-start-time">🚀 {task.startTime}</span>}
                {task.dueTime && <span className="mr-2 text-amber-300">⏰ {task.dueTime}</span>}
                {task.days?.length ? (
                  <span className="mr-2 text-emerald-300" data-testid="task-days">
                    📅 {daysLabel(task.days, language)}
                  </span>
                ) : null}
              </span>
              {(() => {
                const assignees = profiles.filter((p) => task.assignedTo?.includes(p.id));
                return assignees.length > 0 ? (
                  <span
                    className="ml-2 text-[11px] font-bold text-pink-200"
                    data-testid="task-assignees"
                    title={`${translate('parent.tasks.only_for', language)} ${assignees.map((p) => p.name).join(', ')}`}
                  >
                    👤 {assignees.map((p) => `${p.avatar} ${p.name}`).join(', ')}
                  </span>
                ) : null;
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 ml-2 sm:ml-4 shrink-0">
        {isEditing ? (
          <>
            <IconButton tone="success" label="save task" onClick={() => saveEdit(task)}>
              <Check className="w-5 h-5" />
            </IconButton>
            <IconButton tone="neutral" label="cancel edit" onClick={cancelEdit}>
              <X className="w-5 h-5" />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton tone="edit" label="edit task" onClick={() => startEdit(task)}>
              <Edit2 className="w-4 h-4" />
            </IconButton>
            <ConfirmIconButton
              label="delete task"
              confirmText={translate('btn.confirm_delete', language)}
              icon={<Trash2 className="w-4 h-4" />}
              onConfirm={() => onDeleteTask(task.id)}
            />
          </>
        )}
      </div>
    </div>
  );
};
