import { describe, it, expect } from 'vitest';
import { TaskDefinition, ChildProfile } from '../domain/models';
import { initSession, moveTask, resetSession, calculateHistory, awardStars, syncSessionWithDefinitions } from '../domain/routine';

describe('Evening Routine Domain Logic', () => {
  // Sample task definitions
  const mockDefinitions: TaskDefinition[] = [
    { id: 'toys', labelKey: 'task.toys', defaultLabel: 'Toys', icon: '🧸', order: 1 },
    { id: 'teeth', labelKey: 'task.teeth', defaultLabel: 'Teeth', icon: '🪥', order: 2 },
  ];

  const mockChild: ChildProfile = {
    id: 'leo',
    name: 'Léo',
    avatar: '🦊',
    color: 'indigo',
    age: 5,
    stars: 3,
  };

  it('should initialize a session with all tasks set to todo', () => {
    const session = initSession(mockChild.id, '2026-05-20', mockDefinitions);

    expect(session.childId).toBe('leo');
    expect(session.date).toBe('2026-05-20');
    expect(session.isCompleted).toBe(false);
    expect(session.tasks).toHaveLength(2);
    expect(session.tasks[0].status).toBe('todo');
    expect(session.tasks[0].definitionId).toBe('toys');
    expect(session.tasks[1].status).toBe('todo');
    expect(session.tasks[1].definitionId).toBe('teeth');
  });

  it('should update task status and not complete the session if some tasks are pending', () => {
    let session = initSession(mockChild.id, '2026-05-20', mockDefinitions);
    
    // Move first task to "doing"
    session = moveTask(session, session.tasks[0].id, 'doing');
    expect(session.tasks[0].status).toBe('doing');
    expect(session.isCompleted).toBe(false);
    expect(session.completedAt).toBeUndefined();

    // Move first task to "done"
    session = moveTask(session, session.tasks[0].id, 'done');
    expect(session.tasks[0].status).toBe('done');
    expect(session.tasks[0].completedAt).toBeDefined();
    expect(session.isCompleted).toBe(false); // Second task still 'todo'
  });

  it('should complete the session when all tasks are moved to done', () => {
    let session = initSession(mockChild.id, '2026-05-20', mockDefinitions);

    // Complete all tasks
    session = moveTask(session, session.tasks[0].id, 'done');
    session = moveTask(session, session.tasks[1].id, 'done');

    expect(session.isCompleted).toBe(true);
    expect(session.completedAt).toBeDefined();
  });

  it('should reset all tasks back to todo and clear completion state', () => {
    let session = initSession(mockChild.id, '2026-05-20', mockDefinitions);

    // Complete session
    session = moveTask(session, session.tasks[0].id, 'done');
    session = moveTask(session, session.tasks[1].id, 'done');
    expect(session.isCompleted).toBe(true);

    // Reset session
    const reseted = resetSession(session);
    expect(reseted.isCompleted).toBe(false);
    expect(reseted.completedAt).toBeUndefined();
    expect(reseted.tasks[0].status).toBe('todo');
    expect(reseted.tasks[0].completedAt).toBeUndefined();
    expect(reseted.tasks[1].status).toBe('todo');
  });

  it('should compile correct history entry from a session', () => {
    let session = initSession(mockChild.id, '2026-05-20', mockDefinitions);
    session = moveTask(session, session.tasks[0].id, 'done');

    const history = calculateHistory(session, mockChild.name);

    expect(history.id).toBe(session.id);
    expect(history.date).toBe('2026-05-20');
    expect(history.childId).toBe('leo');
    expect(history.childName).toBe('Léo');
    expect(history.totalTasks).toBe(2);
    expect(history.completedTasks).toBe(1);
    expect(history.isCompleted).toBe(false);
  });

  it('should award correct number of stars to a child profile', () => {
    const updated = awardStars(mockChild, 2);
    expect(updated.stars).toBe(5);
  });

  it('should synchronize session tasks with updated definitions', () => {
    let session = initSession(mockChild.id, '2026-05-20', mockDefinitions);
    // Complete first task (toys)
    session = moveTask(session, session.tasks[0].id, 'done');

    // Updated definitions: teeth reordered first, toys second, new task 'pyjamas' added
    const updatedDefs: TaskDefinition[] = [
      { id: 'teeth', labelKey: 'task.teeth', defaultLabel: 'Teeth', icon: '🪥', order: 1 },
      { id: 'toys', labelKey: 'task.toys', defaultLabel: 'Toys', icon: '🧸', order: 2 },
      { id: 'pyjamas', labelKey: 'task.pyjamas', defaultLabel: 'Pyjamas', icon: '👕', order: 3 },
    ];

    const synced = syncSessionWithDefinitions(session, updatedDefs);

    // Should have 3 tasks now
    expect(synced.tasks).toHaveLength(3);

    // Check order (teeth, toys, pyjamas)
    expect(synced.tasks[0].definitionId).toBe('teeth');
    expect(synced.tasks[0].status).toBe('todo'); // teeth was todo in original session

    expect(synced.tasks[1].definitionId).toBe('toys');
    expect(synced.tasks[1].status).toBe('done'); // toys status was preserved!

    expect(synced.tasks[2].definitionId).toBe('pyjamas');
    expect(synced.tasks[2].status).toBe('todo'); // new task initialized as todo
  });
});

