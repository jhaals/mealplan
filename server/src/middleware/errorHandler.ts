import { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class AppError extends Error {
  constructor(
    public statusCode: ContentfulStatusCode,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (err: Error, c: Context) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return c.json(
      {
        error: {
          message: err.message,
          statusCode: err.statusCode,
        },
      },
      err.statusCode
    );
  }

  return c.json(
    {
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    },
    500
  );
};
