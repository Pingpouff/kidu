import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { TaskCard } from '../components/child-board/TaskCard';
import { ProgressBar } from '../components/child-board/ProgressBar';
import { RoutineTask, TaskDefinition } from '../domain/models';
import { isBackupDue, BACKUP_REMINDER_DAYS } from '../domain/backup';

const definition: TaskDefinition = { id: 'teeth', labelKey: 'task.teeth', defaultLabel: 'Teeth', icon: '🪥', order: 1 };
const task: RoutineTask = { id: 't1', definitionId: 'teeth', status: 'doing' };

describe('Accessibility of the board', () => {
  it('task cards say what they are and can be moved with the keyboard', () => {
    const onTap = vi.fn();
    render(
      <DndContext>
        <TaskCard task={task} definition={definition} language="fr" onTap={onTap} />
      </DndContext>
    );
    const card = screen.getByRole('button', { name: 'Se brosser les dents, en cours' });
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    expect(onTap).toHaveBeenCalledTimes(2);
  });

  it('the progress bar exposes its value', () => {
    render(<ProgressBar progress={42.4} avatar="🦊" colorTheme="indigo" label="Progression" />);
    const bar = screen.getByRole('progressbar', { name: 'Progression' });
    expect(bar.getAttribute('aria-valuenow')).toBe('42');
  });
});

describe('Backup reminder', () => {
  const DAY = 24 * 60 * 60 * 1000;
  it('asks for a backup when there is history and none in the last 30 days', () => {
    const now = 100 * DAY;
    expect(isBackupDue(undefined, 2, now)).toBe(false); // little to lose yet
    expect(isBackupDue(undefined, 3, now)).toBe(true); // never backed up
    expect(isBackupDue(now - 10 * DAY, 30, now)).toBe(false);
    expect(isBackupDue(now - (BACKUP_REMINDER_DAYS + 1) * DAY, 30, now)).toBe(true);
  });
});
