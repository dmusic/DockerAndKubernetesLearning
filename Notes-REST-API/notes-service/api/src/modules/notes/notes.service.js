import Note from './notes.model.js';
import ApiError from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';
import { checkNotebookExists } from '../../utils/notebooksClient.js';

export const createNote = async (data) => {
  if (data.notebookId) {
    try {
      const exists = await checkNotebookExists(data.notebookId);
      if (!exists) {
        throw new ApiError(404, `Notebook ${data.notebookId} not found`);
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      // Notebooks service is unavailable — degrade gracefully
      logger.warn('Notebooks service unreachable; saving note with unverified notebookId', {
        notebookId: data.notebookId,
        error: err.message,
      });
    }
  }

  return Note.create(data);
};

export const listNotes = async ({ page, limit, notebookId }) => {
  const filter = notebookId ? { notebookId } : {};
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Note.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Note.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getNoteById = async (id) => {
  const note = await Note.findById(id);
  if (!note) {
    throw new ApiError(404, `Note ${id} not found`);
  }
  return note;
};

export const updateNote = async (id, data) => {
  // notebookId must never be updated — strip it regardless of input
  const { notebookId: _ignored, ...updateData } = data;

  const note = await Note.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!note) {
    throw new ApiError(404, `Note ${id} not found`);
  }

  return note;
};

export const deleteNote = async (id) => {
  const note = await Note.findByIdAndDelete(id);
  if (!note) {
    throw new ApiError(404, `Note ${id} not found`);
  }
};
