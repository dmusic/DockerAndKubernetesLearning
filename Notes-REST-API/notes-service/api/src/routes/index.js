import { Router } from 'express';
import mongoose from 'mongoose';
import authRouter from '../modules/auth/auth.routes.js';
import notesRouter from '../modules/notes/notes.routes.js';

const router = Router();

// Standalone health endpoint — used by Docker health check: wget http://localhost:3000/health
router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  if (dbState !== 1) return res.status(503).send('down');
  res.status(200).send('up');
});

router.use('/api/v1/auth', authRouter);
router.use('/api/v1/notes', notesRouter);

export default router;
