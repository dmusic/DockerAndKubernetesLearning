import asyncHandler from '../../utils/asyncHandler.js';
import * as authService from './auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body);
  res.status(201).json({
    success: true,
    data: { user, token },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body);
  res.status(200).json({
    success: true,
    data: { user, token },
  });
});
