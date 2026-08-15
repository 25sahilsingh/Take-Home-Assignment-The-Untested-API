const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// ─── create ──────────────────────────────────────────────────────────────────

describe('taskService.create', () => {
  it('creates a task with all defaults', () => {
    const task = taskService.create({ title: 'Test task' });
    expect(task).toMatchObject({
      title: 'Test task',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
    });
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
  });

  it('creates a task with custom fields', () => {
    const task = taskService.create({
      title: 'Custom',
      description: 'desc',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2030-01-01T00:00:00.000Z',
    });
    expect(task.title).toBe('Custom');
    expect(task.description).toBe('desc');
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe('2030-01-01T00:00:00.000Z');
  });

  it('adds the task to the internal store', () => {
    taskService.create({ title: 'A' });
    expect(taskService.getAll()).toHaveLength(1);
  });
});

// ─── getAll ──────────────────────────────────────────────────────────────────

describe('taskService.getAll', () => {
  it('returns empty array when no tasks', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  it('returns all created tasks', () => {
    taskService.create({ title: 'A' });
    taskService.create({ title: 'B' });
    const all = taskService.getAll();
    expect(all).toHaveLength(2);
  });

  it('returns a copy, not the internal array', () => {
    taskService.create({ title: 'A' });
    const all = taskService.getAll();
    all.push({ fake: true });
    expect(taskService.getAll()).toHaveLength(1);
  });
});

// ─── findById ────────────────────────────────────────────────────────────────

describe('taskService.findById', () => {
  it('returns the task when it exists', () => {
    const created = taskService.create({ title: 'Find me' });
    const found = taskService.findById(created.id);
    expect(found.title).toBe('Find me');
  });

  it('returns undefined for non-existent id', () => {
    expect(taskService.findById('nope')).toBeUndefined();
  });
});

// ─── getByStatus ─────────────────────────────────────────────────────────────

describe('taskService.getByStatus', () => {
  it('filters tasks by exact status', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'in_progress' });
    taskService.create({ title: 'C', status: 'done' });

    const todos = taskService.getByStatus('todo');
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('A');
  });

  it('returns empty array when no tasks match', () => {
    taskService.create({ title: 'A', status: 'todo' });
    expect(taskService.getByStatus('done')).toEqual([]);
  });

  /**
   * BUG: getByStatus uses String.includes() instead of strict equality (===).
   * This means searching for status "do" would match "done" tasks as well,
   * and searching for "in" would match "in_progress".
   * The test below demonstrates this bug.
   */
  it('BUG: uses .includes() so partial status matches incorrectly', () => {
    taskService.create({ title: 'Done task', status: 'done' });
    taskService.create({ title: 'Todo task', status: 'todo' });

    // "do" is NOT a valid status, but .includes('do') matches "done" AND "todo"
    const result = taskService.getByStatus('do');
    // Both 'done' and 'todo' contain the substring 'do' — wrong behavior
    expect(result).toHaveLength(2); // BUG: should be 0 (invalid status)
  });
});

// ─── getPaginated ────────────────────────────────────────────────────────────

describe('taskService.getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 15; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  it('FIXED: page 1 returns first `limit` items', () => {
    const page1 = taskService.getPaginated(1, 10);
    expect(page1).toHaveLength(10);
  });

  it('returns correct number of items for page 2 limit 5', () => {
    const page2 = taskService.getPaginated(2, 5);
    expect(page2).toHaveLength(5);
  });

  it('returns empty array when page is past the end', () => {
    const result = taskService.getPaginated(100, 10);
    expect(result).toEqual([]);
  });
});

// ─── getStats ────────────────────────────────────────────────────────────────

describe('taskService.getStats', () => {
  it('returns zero counts when empty', () => {
    expect(taskService.getStats()).toEqual({
      todo: 0,
      in_progress: 0,
      done: 0,
      overdue: 0,
    });
  });

  it('counts tasks by status', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'in_progress' });
    taskService.create({ title: 'C', status: 'done' });
    taskService.create({ title: 'D', status: 'todo' });

    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  it('counts overdue tasks (past dueDate and not done)', () => {
    taskService.create({
      title: 'Overdue',
      status: 'todo',
      dueDate: '2000-01-01T00:00:00.000Z', // well in the past
    });
    taskService.create({
      title: 'Done but past due',
      status: 'done',
      dueDate: '2000-01-01T00:00:00.000Z',
    });

    const stats = taskService.getStats();
    expect(stats.overdue).toBe(1); // only the non-done task
  });

  it('does not count future dueDate tasks as overdue', () => {
    taskService.create({
      title: 'Future',
      status: 'todo',
      dueDate: '2099-01-01T00:00:00.000Z',
    });
    expect(taskService.getStats().overdue).toBe(0);
  });
});

// ─── update ──────────────────────────────────────────────────────────────────

describe('taskService.update', () => {
  it('updates fields on an existing task', () => {
    const task = taskService.create({ title: 'Old title' });
    const updated = taskService.update(task.id, { title: 'New title' });
    expect(updated.title).toBe('New title');
  });

  it('returns null for non-existent id', () => {
    expect(taskService.update('nope', { title: 'X' })).toBeNull();
  });

  it('persists the update in the store', () => {
    const task = taskService.create({ title: 'A' });
    taskService.update(task.id, { title: 'B' });
    expect(taskService.findById(task.id).title).toBe('B');
  });

  /**
   * POTENTIAL BUG: update() does NOT validate fields — a caller can overwrite
   * id, createdAt, or inject arbitrary keys. The route layer validates some
   * fields but not id/createdAt.
   */
  it('BUG: allows overwriting protected fields like id and createdAt', () => {
    const task = taskService.create({ title: 'A' });
    const originalId = task.id;
    const updated = taskService.update(originalId, { id: 'hacked', createdAt: 'fake' });
    expect(updated.id).toBe('hacked'); // BUG: id should not be overwritable
    expect(updated.createdAt).toBe('fake'); // BUG: createdAt should not be overwritable
  });
});

// ─── remove ──────────────────────────────────────────────────────────────────

describe('taskService.remove', () => {
  it('removes an existing task and returns true', () => {
    const task = taskService.create({ title: 'Delete me' });
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.getAll()).toHaveLength(0);
  });

  it('returns false for non-existent id', () => {
    expect(taskService.remove('nope')).toBe(false);
  });
});

// ─── completeTask ────────────────────────────────────────────────────────────

describe('taskService.completeTask', () => {
  it('marks a task as done and sets completedAt', () => {
    const task = taskService.create({ title: 'Finish me' });
    const completed = taskService.completeTask(task.id);
    expect(completed.status).toBe('done');
    expect(completed.completedAt).toBeDefined();
  });

  it('returns null for non-existent id', () => {
    expect(taskService.completeTask('nope')).toBeNull();
  });

  /**
   * BUG: completeTask resets the task's priority to 'medium' regardless
   * of its original priority. A high-priority task becomes medium after
   * completion — this is almost certainly unintentional.
   */
  it('BUG: resets priority to medium on completion', () => {
    const task = taskService.create({ title: 'High', priority: 'high' });
    const completed = taskService.completeTask(task.id);
    expect(completed.priority).toBe('medium'); // BUG: should stay 'high'
  });
});

// ─── _reset ──────────────────────────────────────────────────────────────────

describe('taskService._reset', () => {
  it('clears all tasks', () => {
    taskService.create({ title: 'A' });
    taskService.create({ title: 'B' });
    taskService._reset();
    expect(taskService.getAll()).toEqual([]);
  });
});
