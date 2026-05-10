import { Router } from 'express';
import authRouter from '../modules/auth/auth.routes.js';
import notebooksRouter from '../modules/notebooks/notebooks.routes.js';

const router = Router();

router.use('/api/v1/auth', authRouter);
router.use('/api/v1/notebooks', notebooksRouter);

export default router;
