import asyncHandler from '../../utils/asyncHandler.js';
import * as notesService from './notes.service.js';

export const createNote = asyncHandler(async (req, res) => {
  const note = await notesService.createNote(req.body);
  res.status(201).json({ success: true, data: note });
});

export const listNotes = asyncHandler(async (req, res) => {
  const { data, pagination } = await notesService.listNotes(req.query);
  res.status(200).json({ success: true, data, pagination });
});

export const getNote = asyncHandler(async (req, res) => {
  const note = await notesService.getNoteById(req.params.id);
  res.status(200).json({ success: true, data: note });
});

export const updateNote = asyncHandler(async (req, res) => {
  const note = await notesService.updateNote(req.params.id, req.body);
  res.status(200).json({ success: true, data: note });
});

export const deleteNote = asyncHandler(async (req, res) => {
  await notesService.deleteNote(req.params.id);
  res.status(204).end();
});
