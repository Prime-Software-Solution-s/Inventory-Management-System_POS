const notFound = (req, res) => {
  res.status(404);
  throw new Error(`Route not found: ${req.originalUrl}`);
};

const errorHandler = (err, req, res, next) => {
  if (process.env.LOG_ERRORS !== 'false') {
    console.error(err);
  }

  let statusCode =
    err.statusCode ||
    err.status ||
    (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Internal server error';

  if (typeof err.message === 'string' && err.message.startsWith('CORS blocked for origin:')) {
    statusCode = 403;
  }

  // Express JSON body parser errors (malformed JSON, wrong encoding, etc).
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    statusCode = 400;
    message = 'Invalid JSON payload.';
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource id.';
  }

  if (err.code === 11000) {
    statusCode = 409;
    const duplicatedField = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `${duplicatedField} must be unique.`;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join(', ');
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired.';
  }

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = {
  notFound,
  errorHandler,
};
