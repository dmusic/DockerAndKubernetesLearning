import { Router } from 'express';
import mongoose from 'mongoose';
import auth from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  createNotebookSchema,
  updateNotebookSchema,
  notebookIdParamSchema,
  paginationSchema,
} from './notebooks.schema.js';
import * as notebooksController from './notebooks.controller.js';

const router = Router();

// Health check — public, no auth required
router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  if (dbState !== 1) {
    return res
      .status(503)
      .json({ status: 'degraded', service: 'notebooks', reason: 'database unavailable' });
  }
  res.status(200).json({ status: 'ok', service: 'notebooks' });
});

// All remaining routes require authentication
router.use(auth);

router.post('/', validate({ body: createNotebookSchema }), notebooksController.createNotebook);

router.get('/', validate({ query: paginationSchema }), notebooksController.listNotebooks);

router.get(
  '/:id',
  validate({ params: notebookIdParamSchema }),
  notebooksController.getNotebook
);

router.put(
  '/:id',
  validate({ params: notebookIdParamSchema, body: updateNotebookSchema }),
  notebooksController.updateNotebook
);

router.delete(
  '/:id',
  validate({ params: notebookIdParamSchema }),
  notebooksController.deleteNotebook
);

export default router;
