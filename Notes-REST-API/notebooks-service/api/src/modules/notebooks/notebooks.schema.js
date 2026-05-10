import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createNotebookSchema = z.object({
  name: z
    .string({ required_error: 'name is required' })
    .trim()
    .min(1, 'name must not be empty')
    .max(200, 'name must be at most 200 characters'),
  description: z
    .string()
    .trim()
    .max(1000, 'description must be at most 1000 characters')
    .optional(),
});

export const updateNotebookSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'name must not be empty')
      .max(200, 'name must be at most 200 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, 'description must be at most 1000 characters')
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field (name or description) must be provided',
  });

export const notebookIdParamSchema = z.object({
  id: z
    .string()
    .regex(objectIdRegex, 'id must be a valid 24-character MongoDB ObjectId'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
