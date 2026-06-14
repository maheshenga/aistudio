import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DomainError, ErrorCode } from '../errors';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private logger = new Logger('Exception');
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    let status = 500; let code: ErrorCode = 'unknown_error'; let message = 'Internal server error';

    if (exception instanceof DomainError) {
      status = exception.status; code = exception.code; message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse() as any;
      message = Array.isArray(r?.message) ? r.message.join('; ') : (r?.message ?? exception.message);
      code = status === 400 ? 'validation_error' : status === 401 ? 'unauthenticated'
           : status === 403 ? 'permission_denied' : status === 404 ? 'not_found'
           : status === 409 ? 'conflict' : 'unknown_error';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') { status = 404; code = 'not_found'; message = 'Resource not found'; }
      else if (exception.code === 'P2002') { status = 409; code = 'conflict'; message = 'Resource already exists'; }
    }

    if (status >= 500) this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(status).json({ error: { code, message } });
  }
}
