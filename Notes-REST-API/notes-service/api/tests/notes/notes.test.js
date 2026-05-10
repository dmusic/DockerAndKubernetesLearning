import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';

let token;
let createdNoteId;

beforeAll(async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME,
  });

  // Register and login to get a token
  await request(app)
    .post('/api/v1/auth/register')
    .send({ email: 'notes-test@example.com', password: 'password1234' });

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'notes-test@example.com', password: 'password1234' });

  token = loginRes.body.data.token;
});

afterAll(async () => {
  await mongoose.connection.db.collection('notes').deleteMany({});
  await mongoose.connection.db.collection('users').deleteMany({});
  await mongoose.connection.close();
});

describe('GET /health', () => {
  it('returns 200 plain text "up" without auth', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.text).toBe('up');
  });
});

describe('POST /api/v1/notes', () => {
  it('creates a note (no notebookId) and returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'My Note', content: 'Hello world' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('My Note');
    createdNoteId = res.body.data.id;
  });

  it('returns 422 when title is missing', async () => {
    const res = await request(app)
      .post('/api/v1/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'No title here' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('returns 422 when content is missing', async () => {
    const res = await request(app)
      .post('/api/v1/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'No Content' });

    expect(res.status).toBe(422);
  });

  it('returns 401 when no auth token is provided', async () => {
    const res = await request(app)
      .post('/api/v1/notes')
      .send({ title: 'Unauth', content: 'Test' });

    expect(res.status).toBe(401);
  });

  it('returns 201 with notebookId when notebooks-service is unreachable (graceful degradation)', async () => {
    // NOTEBOOKS_SERVICE_URL points to http://localhost:9999 (unreachable) in test setup
    const fakeNotebookId = '507f1f77bcf86cd799439011';
    const res = await request(app)
      .post('/api/v1/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Degraded Note', content: 'Saved anyway', notebookId: fakeNotebookId });

    expect(res.status).toBe(201);
    expect(res.body.data.notebookId).toBe(fakeNotebookId);
  });
});

describe('GET /api/v1/notes', () => {
  it('returns 200 with paginated array', async () => {
    const res = await request(app)
      .get('/api/v1/notes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  it('filters notes by notebookId', async () => {
    const notebookId = '507f1f77bcf86cd799439011';
    const res = await request(app)
      .get(`/api/v1/notes?notebookId=${notebookId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    res.body.data.forEach((note) => expect(note.notebookId).toBe(notebookId));
  });
});

describe('GET /api/v1/notes/:id', () => {
  it('returns 200 for a valid existing note', async () => {
    const res = await request(app)
      .get(`/api/v1/notes/${createdNoteId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdNoteId);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .get('/api/v1/notes/000000000000000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 422 for a malformed id', async () => {
    const res = await request(app)
      .get('/api/v1/notes/not-valid')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(422);
  });
});

describe('PUT /api/v1/notes/:id', () => {
  it('updates title and returns 200', async () => {
    const res = await request(app)
      .put(`/api/v1/notes/${createdNoteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Title');
  });

  it('ignores notebookId in PUT body', async () => {
    const newNotebookId = '507f191e810c19729de860ea';
    const res = await request(app)
      .put(`/api/v1/notes/${createdNoteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Updated content', notebookId: newNotebookId });

    expect(res.status).toBe(200);
    // notebookId should not have changed to the new value
    expect(res.body.data.notebookId).not.toBe(newNotebookId);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/api/v1/notes/000000000000000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Ghost' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/notes/:id', () => {
  it('deletes a note and returns 204', async () => {
    const res = await request(app)
      .delete(`/api/v1/notes/${createdNoteId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .delete('/api/v1/notes/000000000000000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
