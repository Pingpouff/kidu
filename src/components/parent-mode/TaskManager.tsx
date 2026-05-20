import React, { useState } from 'react';
import { TaskDefinition } from '../../domain/models';
import { translate, Language } from '../../i18n/dictionary';
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

interface TaskManagerProps {
  tasks: TaskDefinition[];
  language: Language;
  onAddTask: (task: Omit<TaskDefinition, 'id'>) => Promise<void>;
  onUpdateTask: (task: TaskDefinition) => Promise<void>;
  onReorderTasks: (reorderedTasks: TaskDefinition[]) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  tasks,
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

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIcon, setEditIcon] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editOrder, setEditOrder] = useState<number>(1);
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

    await onAddTask({
      icon: newIcon.trim(),
      labelKey: '', // Empty indicates custom user label
      defaultLabel: newLabel.trim(),
      order: tasks.length > 0 ? Math.max(...tasks.map((t) => t.order)) + 1 : 1,
    });

    setNewIcon('');
    setNewLabel('');
  };

  const startEdit = (task: TaskDefinition) => {
    setEditingId(task.id);
    setEditIcon(task.icon);
    setEditLabel(task.labelKey ? translate(task.labelKey, language) : task.defaultLabel);
    setEditOrder(task.order);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (task: TaskDefinition) => {
    if (!editIcon.trim() || !editLabel.trim()) return;

    await onUpdateTask({
      ...task,
      icon: editIcon.trim(),
      defaultLabel: editLabel.trim(),
      labelKey: '', // Custom label overrides key translation
      order: Number(editOrder),
    });

    setEditingId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sorted = [...tasks].sort((a, b) => a.order - b.order);
    const oldIndex = sorted.findIndex((t) => t.id === active.id);
    const newIndex = sorted.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sorted, oldIndex, newIndex);

    // Bulk update positions in IndexedDB
    const updatedTasks = reordered.map((task, index) => ({
      ...task,
      order: index + 1,
    }));

    await onReorderTasks(updatedTasks);
  };

  // Sort tasks in layout according to database schema order
  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-100">
          {translate('parent.tasks.title', language)}
        </h3>
      </div>

      {/* Task Creation Form */}
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
        <div className="relative sm:w-28">
          <input
            type="text"
            maxLength={4}
            value={newIcon}
            onFocus={() => setShowNewPicker(true)}
            onChange={(e) => setNewIcon(e.target.value)}
            placeholder={translate('parent.tasks.icon_placeholder', language)}
            className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-center text-xl text-white placeholder:text-white/20 cursor-pointer"
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
          className="flex-1 px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white placeholder:text-white/20"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/20 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>{translate('btn.add', language)}</span>
        </button>
      </form>

      {/* Task list list with DndContext */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto scrollbar-thin pr-1">
            {sortedTasks.map((task) => (
              <SortableTaskRow
                key={task.id}
                task={task}
                language={language}
                editingId={editingId}
                showEditPicker={showEditPicker}
                editIcon={editIcon}
                editLabel={editLabel}
                editOrder={editOrder}
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
      </DndContext>
    </div>
  );
};

/* Sortable Task Row Item Wrapper Component */
interface SortableTaskRowProps {
  task: TaskDefinition;
  language: Language;
  editingId: string | null;
  showEditPicker: boolean;
  editIcon: string;
  editLabel: string;
  editOrder: number;
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
  language,
  editingId,
  showEditPicker,
  editIcon,
  editLabel,
  editOrder,
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
      className={`flex items-center justify-between p-3 bg-white/5 rounded-2xl border transition-all ${
        isEditing ? 'border-indigo-500/50 bg-indigo-950/20' : 'border-white/5 hover:bg-white/10'
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Dedicated Grip Handle on the left */}
        {!isEditing && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-white/5 rounded text-white/40 hover:text-white/80 transition-colors touch-none"
            aria-label="drag task"
          >
            <GripVertical className="w-5 h-5" />
          </button>
        )}

        {isEditing ? (
          /* Edit Mode Inputs */
          <div className="flex-1 flex flex-wrap sm:flex-nowrap gap-3 items-center">
            <div className="relative">
              <input
                type="text"
                maxLength={4}
                value={editIcon}
                onFocus={() => setShowEditPicker(true)}
                onChange={(e) => setEditIcon(e.target.value)}
                className="w-16 px-2 py-1.5 bg-slate-900 border border-indigo-500/30 rounded-lg text-center text-lg text-white cursor-pointer"
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
              className="flex-1 px-3 py-1.5 bg-slate-900 border border-indigo-500/30 rounded-lg text-white text-sm"
            />
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <span>{translate('parent.tasks.order', language)}:</span>
              <input
                type="number"
                value={editOrder}
                onChange={(e) => setEditOrder(Number(e.target.value))}
                className="w-12 px-1 py-1 bg-slate-900 border border-indigo-500/30 rounded text-center text-white"
              />
            </div>
          </div>
        ) : (
          /* Display Mode Row */
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-2xl shadow-inner select-none">
              {task.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm md:text-base truncate">
                {task.labelKey ? translate(task.labelKey, language) : task.defaultLabel}
              </p>
              <span className="text-[10px] text-indigo-400/70 font-semibold tracking-wider uppercase">
                # {task.order}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 ml-4">
        {isEditing ? (
          <>
            <button
              onClick={() => saveEdit(task)}
              aria-label="save task"
              className="p-2 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/20 rounded-xl text-emerald-400 hover:text-white transition-colors"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={cancelEdit}
              aria-label="cancel edit"
              className="p-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => startEdit(task)}
              aria-label="edit task"
              className="p-2 bg-white/5 hover:bg-indigo-600/30 border border-white/10 hover:border-indigo-500/30 rounded-xl text-white/50 hover:text-indigo-200 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteTask(task.id)}
              aria-label="delete task"
              className="p-2 bg-white/5 hover:bg-rose-600 border border-white/10 hover:border-rose-500 rounded-xl text-rose-400 hover:text-white transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
