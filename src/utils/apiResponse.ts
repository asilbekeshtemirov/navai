import { Response } from 'express';

export class ApiResponse {
  static success(res: Response, data: any = null, message: string = 'Success') {
    return res.status(200).json({
      success: true,
      data,
      message,
    });
  }

  static created(res: Response, data: any = null, message: string = 'Created successfully') {
    return res.status(201).json({
      success: true,
      data,
      message,
    });
  }

  static error(res: Response, message: string = 'Internal server error', statusCode: number = 500, error: string | null = null, details: any = null) {
    const response: any = {
      success: false,
      message,
      statusCode,
    };

    if (error) {
      response.error = error;
    }

    if (details) {
      response.details = details;
    }

    return res.status(statusCode).json(response);
  }

  static badRequest(res: Response, message: string = 'Bad request', error: string | null = null, details: any = null) {
    return this.error(res, message, 400, error, details);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized', error: string | null = null, details: any = null) {
    return this.error(res, message, 401, error, details);
  }

  static forbidden(res: Response, message: string = 'Forbidden', error: string | null = null, details: any = null) {
    return this.error(res, message, 403, error, details);
  }

  static notFound(res: Response, message: string = 'Not found', error: string | null = null, details: any = null) {
    return this.error(res, message, 404, error, details);
  }
}