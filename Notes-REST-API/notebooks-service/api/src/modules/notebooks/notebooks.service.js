import Notebook from './notebooks.model.js';
import ApiError from '../../utils/ApiError.js';

export const createNotebook = async (data) => {
  return Notebook.create(data);
};

export const listNotebooks = async ({ page, limit }) => {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Notebook.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
    Notebook.countDocuments(),
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

export const getNotebookById = async (id) => {
  const notebook = await Notebook.findById(id);
  if (!notebook) {
    throw new ApiError(404, `Notebook ${id} not found`);
  }
  return notebook;
};

export const updateNotebook = async (id, data) => {
  const notebook = await Notebook.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!notebook) {
    throw new ApiError(404, `Notebook ${id} not found`);
  }
  return notebook;
};

export const deleteNotebook = async (id) => {
  const notebook = await Notebook.findByIdAndDelete(id);
  if (!notebook) {
    throw new ApiError(404, `Notebook ${id} not found`);
  }
};
