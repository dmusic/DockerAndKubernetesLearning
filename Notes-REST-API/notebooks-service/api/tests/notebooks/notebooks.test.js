import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';

let token;
let createdId;

beforeAll(async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME,
  });

  // Register a test user and get a token
  await request(app)
    .post('/api/v1/auth/register')
    .send({ email: 'notebooks-test@example.com', password: 'password1234' });

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'notebooks-test@example.com', password: 'password1234' });

  token = loginRes.body.data.token;
});

afterAll(async () => {
  await mongoose.connection.db.collection('notebooks').deleteMany({});
  await mongoose.connection.db.collection('users').deleteMany({});
  await mongoose.connection.close();
});

describe('GET /api/v1/notebooks/health', () => {
  it('returns 200 without auth token', async () => {
    const res = await request(app).get('/api/v1/notebooks/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('notebooks');
  });
});

describe('POST /api/v1/notebooks', () => {
  it('creates a notebook and returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/notebooks')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Notebook', description: 'A test notebook' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('My Notebook');
    expect(res.body.data.id).toBeDefined();
    createdId = res.body.data.id;
  });

  it('returns 422 when name is missing', async () => {
    const res = await request(app)
      .post('/api/v1/notebooks')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'No name' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when no auth token is provided', async () => {
    const res = await request(app)
      .post('/api/v1/notebooks')
      .send({ name: 'Unauthorized' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/v1/notebooks', () => {
  it('returns 200 with array and pagination', async () => {
    const res = await request(app)
      .get('/api/v1/notebooks')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/v1/notebooks/:id', () => {
  it('returns 200 for a valid existing id', async () => {
    const res = await request(app)
      .get(`/api/v1/notebooks/${createdId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdId);
  });

  it('returns 404 for a valid but unknown id', async () => {
    const fakeId = '000000000000000000000000';
    const res = await request(app)
      .get(`/api/v1/notebooks/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 422 for a malformed id', async () => {
    const res = await request(app)
      .get('/api/v1/notebooks/not-valid')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(422);
  });
});

describe('PUT /api/v1/notebooks/:id', () => {
  it('updates a notebook and returns 200', async () => {
    const res = await request(app)
      .put(`/api/v1/notebooks/${createdId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Notebook' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Notebook');
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .put('/api/v1/notebooks/000000000000000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ghost' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/notebooks/:id', () => {
  it('deletes a notebook and returns 204', async () => {
    const res = await request(app)
      .delete(`/api/v1/notebooks/${createdId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .delete('/api/v1/notebooks/000000000000000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
