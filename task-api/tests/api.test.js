const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// ─── POST /tasks ─────────────────────────────────────────────────────────────

describe('POST /tasks', () => {
  it('creates a task and returns 201', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'New task' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New task');
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('todo');
  });

  it('creates a task with all optional fields', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({
        title: 'Full task',
        description: 'some desc',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2030-06-15T00:00:00.000Z',
      });
    expect(res.status).toBe(201);
    expect(res.body.description).toBe('some desc');
    expect(res.body.status).toBe('in_progress');
    expect(res.body.priority).toBe('high');
    expect(res.body.dueDate).toBe('2030-06-15T00:00:00.000Z');
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when title is empty string', async () => {
    const res = await request(app).post('/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'X', status: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid priority', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'X', priority: 'critical' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid dueDate', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'X', dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
  });
});

// ─── GET /tasks ──────────────────────────────────────────────────────────────

describe('GET /tasks', () => {
  it('returns empty array when no tasks exist', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all tasks', async () => {
    await request(app).post('/tasks').send({ title: 'A' });
    await request(app).post('/tasks').send({ title: 'B' });
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// ─── GET /tasks?status= ─────────────────────────────────────────────────────

describe('GET /tasks?status=', () => {
  beforeEach(async () => {
    await request(app).post('/tasks').send({ title: 'Todo', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'WIP', status: 'in_progress' });
    await request(app).post('/tasks').send({ title: 'Done', status: 'done' });
  });

  it('filters by exact status', async () => {
    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Todo');
  });

  it('returns empty array for status with no matches', async () => {
    taskService._reset();
    await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
    const res = await request(app).get('/tasks?status=done');
    expect(res.body).toEqual([]);
  });

  /**
   * BUG via getByStatus: uses .includes() so partial match works
   * "in" matches "in_progress" — this is a bug, not a feature
   */
  it('BUG: partial status match returns results due to .includes()', async () => {
    const res = await request(app).get('/tasks?status=in');
    // "in" is substring of "in_progress" so it matches (bug)
    expect(res.body).toHaveLength(1);
  });
});

// ─── GET /tasks?page=&limit= ────────────────────────────────────────────────

describe('GET /tasks?page=&limit=', () => {
  beforeEach(async () => {
    for (let i = 1; i <= 12; i++) {
      await request(app).post('/tasks').send({ title: `Task ${i}` });
    }
  });

  it('FIXED: page 1 returns first items', async () => {
    const res = await request(app).get('/tasks?page=1&limit=5');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
    expect(res.body[0].title).toBe('Task 1');
  });

  it('returns remaining items on last page', async () => {
    // page=3, limit=5 → offset=10, items 11-12
    const res = await request(app).get('/tasks?page=3&limit=5');
    expect(res.body).toHaveLength(2);
  });

  it('defaults page to 1 and limit to 10 when not provided as numbers', async () => {
    const res = await request(app).get('/tasks?page=abc&limit=xyz');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
  });
});

// ─── GET /tasks/:id (via PUT to verify) ──────────────────────────────────────

// Note: there's no GET /tasks/:id route, so we test findById indirectly

// ─── PUT /tasks/:id ──────────────────────────────────────────────────────────

describe('PUT /tasks/:id', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app).post('/tasks').send({ title: 'Original' });
    taskId = res.body.id;
  });

  it('updates a task and returns the updated version', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ title: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .put('/tasks/nonexistent')
      .send({ title: 'X' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when title is set to empty string', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });

  /**
   * BUG: the PUT route doesn't strip id/createdAt from the body
   * before passing to taskService.update(), allowing clients to
   * overwrite protected fields.
   */
  it('BUG: allows overwriting id via PUT body', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ id: 'injected-id' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('injected-id'); // BUG: id should be immutable
  });
});

// ─── DELETE /tasks/:id ───────────────────────────────────────────────────────

describe('DELETE /tasks/:id', () => {
  it('deletes a task and returns 204', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Bye' });
    const res = await request(app).delete(`/tasks/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app).delete('/tasks/nonexistent');
    expect(res.status).toBe(404);
  });

  it('task is actually removed after deletion', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Gone' });
    await request(app).delete(`/tasks/${created.body.id}`);
    const list = await request(app).get('/tasks');
    expect(list.body).toHaveLength(0);
  });
});

// ─── PATCH /tasks/:id/complete ───────────────────────────────────────────────

describe('PATCH /tasks/:id/complete', () => {
  it('marks a task as done', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Do it' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).toBeDefined();
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app).patch('/tasks/nonexistent/complete');
    expect(res.status).toBe(404);
  });

  /**
   * BUG: completing a high-priority task resets its priority to 'medium'.
   */
  it('BUG: priority is reset to medium after completion', async () => {
    const created = await request(app)
      .post('/tasks')
      .send({ title: 'Important', priority: 'high' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.body.priority).toBe('medium'); // BUG: should stay 'high'
  });
});

// ─── GET /tasks/stats ────────────────────────────────────────────────────────

describe('GET /tasks/stats', () => {
  it('returns zero counts when empty', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('counts tasks correctly', async () => {
    await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'B', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'C', status: 'in_progress' });
    await request(app).post('/tasks').send({ title: 'D', status: 'done' });

    const res = await request(app).get('/tasks/stats');
    expect(res.body.todo).toBe(2);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.done).toBe(1);
  });

  it('counts overdue tasks correctly', async () => {
    await request(app).post('/tasks').send({
      title: 'Overdue',
      status: 'todo',
      dueDate: '2000-01-01T00:00:00.000Z',
    });
    await request(app).post('/tasks').send({
      title: 'Done past due',
      status: 'done',
      dueDate: '2000-01-01T00:00:00.000Z',
    });
    await request(app).post('/tasks').send({
      title: 'Future',
      status: 'todo',
      dueDate: '2099-01-01T00:00:00.000Z',
    });

    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(1);
  });
});

// ─── PATCH /tasks/:id/assign ──────────────────────────────────────────────────

describe('PATCH /tasks/:id/assign', () => {
  it('assigns a task and returns the updated task', async () => {
    const created = await request(app).post('/tasks').send({ title: 'New Task' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Alice' });
      
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });
  
  it('returns 400 if assignee is missing or empty string', async () => {
    const created = await request(app).post('/tasks').send({ title: 'New Task' });
    let res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({});
    expect(res.status).toBe(400);

    res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '   ' });
    expect(res.status).toBe(400);
  });
  
  it('returns 404 for non-existent id', async () => {
    const res = await request(app).patch('/tasks/nonexistent/assign').send({ assignee: 'Alice' });
    expect(res.status).toBe(404);
  });
});

// ─── Validators edge cases ──────────────────────────────────────────────────

describe('Validator edge cases', () => {
  it('POST: title as number is rejected', async () => {
    const res = await request(app).post('/tasks').send({ title: 123 });
    expect(res.status).toBe(400);
  });

  it('PUT: can send update with no fields (no-op)', async () => {
    const created = await request(app).post('/tasks').send({ title: 'A' });
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('A');
  });
});
