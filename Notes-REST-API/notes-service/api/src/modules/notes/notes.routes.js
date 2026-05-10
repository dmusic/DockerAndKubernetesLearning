import { Router } from 'express';
import mongoose from 'mongoose';
import auth from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  createNoteSchema,
  updateNoteSchema,
  noteIdParamSchema,
  paginationSchema,
} from './notes.schema.js';
import * as notesController from './notes.controller.js';

const router = Router();

// Health check — public, no auth required
router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  if (dbState !== 1) {
    return res.status(503).send('down');
  }
  res.status(200).send('up');
});

// All remaining routes require authentication
router.use(auth);

router.post('/', validate({ body: createNoteSchema }), notesController.createNote);

router.get('/', validate({ query: paginationSchema }), notesController.listNotes);

router.get(
  '/:id',
  validate({ params: noteIdParamSchema }),
  notesController.getNote
);

router.put(
  '/:id',
  validate({ params: noteIdParamSchema, body: updateNoteSchema }),
  notesController.updateNote
);

router.delete(
  '/:id',
  validate({ params: noteIdParamSchema }),
  notesController.deleteNote
);

export default router;
