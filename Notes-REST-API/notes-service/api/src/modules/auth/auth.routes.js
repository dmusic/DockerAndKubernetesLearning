import { Router } from 'express';
import validate from '../../middleware/validate.js';
import { registerSchema, loginSchema } from './auth.schema.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post('/register', validate({ body: registerSchema }), authController.register);
router.post('/login', validate({ body: loginSchema }), authController.login);

export default router;
