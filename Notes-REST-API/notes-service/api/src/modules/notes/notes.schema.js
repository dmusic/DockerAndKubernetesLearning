import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createNoteSchema = z.object({
  title: z
    .string({ required_error: 'title is required' })
    .trim()
    .min(1, 'title must not be empty')
    .max(300, 'title must be at most 300 characters'),
  content: z
    .string({ required_error: 'content is required' })
    .min(1, 'content must not be empty')
    .max(50000, 'content must be at most 50 000 characters'),
  notebookId: z
    .string()
    .regex(objectIdRegex, 'notebookId must be a valid 24-character MongoDB ObjectId')
    .optional(),
});

export const updateNoteSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'title must not be empty')
      .max(300, 'title must be at most 300 characters')
      .optional(),
    content: z
      .string()
      .min(1, 'content must not be empty')
      .max(50000, 'content must be at most 50 000 characters')
      .optional(),
    // notebookId is explicitly excluded — cannot be changed via PUT
  })
  .strip() // strip unknown fields including notebookId
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field (title or content) must be provided',
  });

export const noteIdParamSchema = z.object({
  id: z
    .string()
    .regex(objectIdRegex, 'id must be a valid 24-character MongoDB ObjectId'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  notebookId: z
    .string()
    .regex(objectIdRegex, 'notebookId must be a valid 24-character MongoDB ObjectId')
    .optional(),
});
