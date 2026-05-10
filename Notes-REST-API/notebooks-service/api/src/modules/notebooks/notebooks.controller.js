import asyncHandler from '../../utils/asyncHandler.js';
import * as notebooksService from './notebooks.service.js';

export const createNotebook = asyncHandler(async (req, res) => {
  const notebook = await notebooksService.createNotebook(req.body);
  res.status(201).json({ success: true, data: notebook });
});

export const listNotebooks = asyncHandler(async (req, res) => {
  const { data, pagination } = await notebooksService.listNotebooks(req.query);
  res.status(200).json({ success: true, data, pagination });
});

export const getNotebook = asyncHandler(async (req, res) => {
  const notebook = await notebooksService.getNotebookById(req.params.id);
  res.status(200).json({ success: true, data: notebook });
});

export const updateNotebook = asyncHandler(async (req, res) => {
  const notebook = await notebooksService.updateNotebook(req.params.id, req.body);
  res.status(200).json({ success: true, data: notebook });
});

export const deleteNotebook = asyncHandler(async (req, res) => {
  await notebooksService.deleteNotebook(req.params.id);
  res.status(204).end();
});
