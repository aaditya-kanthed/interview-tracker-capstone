// Checks request data against a Zod schema (replaces @Valid + Bean Validation)
const { z } = require('zod');
const AppError = require('../utils/AppError');

function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      return next(AppError.badRequest('Invalid input', z.flattenError(result.error).fieldErrors));
    }
    req.validated = result.data; // cleaned + converted data
    return next();
  };
}

module.exports = validate;
