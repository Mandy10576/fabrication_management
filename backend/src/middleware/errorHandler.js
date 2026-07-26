const errorHandler = (err, req, res, next) => {
  console.error('API Error:', err);
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'The requested record was not found or has already been deleted.';
  } else if (err.code === 'P2003') {
    statusCode = 400;
    message = 'Cannot delete this record because it is referenced by active invoices or quotations.';
  }

  res.status(statusCode).json({
    error: message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = { errorHandler };
