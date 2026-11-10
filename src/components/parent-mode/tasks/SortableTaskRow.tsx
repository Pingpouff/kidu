import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Edit2, Check, X, GripVertical } from 'lucide-react';
import { ChildProfile, TaskDefinition, TaskCategory } from '../../../domain/models';
import { translate, taskLabel, Language } from '../../../i18n/dictionary';
import { ConfirmIconButton, IconButton } from '../../../ui/controls';
import { fieldClass } from '../../../ui/styles';
import { EmojiPicker } from '../EmojiPicker';
import { AssigneePicker, CategorySelect, TimeWindowInputs } from './TaskFields';
import { DayPicker } from './DayPicker';
import { daysLabel } from './days';

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

export const SortableTaskRow: React.FC<SortableTaskRowProps> = ({
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
      className={`flex items-center justify-between p-2 sm:p-3 bg-white/5 rounded-2xl border transition-colors ${
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
