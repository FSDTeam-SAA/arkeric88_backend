import { HttpException } from '@nestjs/common';
import { TErrorSource } from '../middlewares/globalErrors.filter';

export function handleHttpException(err: HttpException): {
  statusCode: number;
  message: string;
  errorSources: TErrorSource[];
} {
  const statusCode = err.getStatus();
  const response = err.getResponse() as
    | string
    | {
        message: string | string[];
        error?: string;
        detail?: Array<{ loc?: Array<string | number>; msg?: string }> | string;
      };

  if (typeof response === 'object' && Array.isArray(response.detail)) {
    return {
      statusCode,
      message:
        typeof response.message === 'string'
          ? response.message
          : 'Validation Error',
      errorSources: response.detail.map((issue) => ({
        path: issue.loc?.join('.') || 'request',
        message: issue.msg || 'Invalid value',
      })),
    };
  }

  if (typeof response === 'object' && typeof response.detail === 'string') {
    return {
      statusCode,
      message:
        typeof response.message === 'string'
          ? response.message
          : 'External Service Error',
      errorSources: [{ path: 'request', message: response.detail }],
    };
  }

  if (
    typeof response === 'object' &&
    Array.isArray((response as any).message)
  ) {
    const messages: string[] = (response as any).message;
    return {
      statusCode,
      message: 'Validation Error',
      errorSources: messages.map((msg) => ({ path: '', message: msg })),
    };
  }

  const message =
    typeof response === 'string'
      ? response
      : ((response as any).message ?? err.message);

  return { statusCode, message, errorSources: [{ path: '', message }] };
}
