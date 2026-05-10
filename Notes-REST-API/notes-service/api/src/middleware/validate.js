import ApiError from '../utils/ApiError.js';

/**
 * Middleware factory that validates req.body / req.params / req.query
 * against a Zod schema.
 */
const validate = (schemas) => (req, res, next) => {
  const errors = [];

  for (const [key, schema] of Object.entries(schemas)) {
    const result = schema.safeParse(req[key]);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        errors.push({ field: issue.path.join('.'), message: issue.message });
      });
    } else {
      req[key] = result.data;
    }
  }

  if (errors.length > 0) {
    return next(new ApiError(422, 'Validation failed', errors));
  }

  next();
};

export default validate;
