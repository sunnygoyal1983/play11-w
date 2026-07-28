import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export const handleError = (error: unknown): NextResponse => {
  console.error('Error:', error);

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          statusCode: error.statusCode,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Validation error',
          statusCode: 400,
          details: error.errors,
        },
      },
      { status: 400 }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Unique constraint violation',
              statusCode: 409,
              details: error.meta,
            },
          },
          { status: 409 }
        );
      case 'P2025':
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Record not found',
              statusCode: 404,
            },
          },
          { status: 404 }
        );
      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Database error',
              statusCode: 500,
              details: error.message,
            },
          },
          { status: 500 }
        );
    }
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : error.message,
          statusCode: 500,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        message: 'An unknown error occurred',
        statusCode: 500,
      },
    },
    { status: 500 }
  );
};

export const asyncHandler = (fn: Function) => {
  return async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      return handleError(error);
    }
  };
};