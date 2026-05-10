import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from './user.model.js';
import ApiError from '../../utils/ApiError.js';
import { env } from '../../config/env.js';

export const register = async ({ email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'Email already in use');
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await User.create({ email, password: hash });

  const token = jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return { user, token };
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const token = jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return { user, token };
};
