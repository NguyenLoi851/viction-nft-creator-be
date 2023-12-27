import {
  ArgumentsHost,
  Catch,
  ExceptionFilter as ExceptionFilterBase,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { EmptyObject } from '../../shared/response/emptyObject.dto';
import { getLogger } from '../../shared/logger';
const logger = getLogger('Exceptionfilter');

@Catch()
export class ExceptionFilter<T> implements ExceptionFilterBase {
  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // log data
    logger.error(`Body: ${JSON.stringify(request.body)}`);
    logger.error(`Query: ${JSON.stringify(request.query)}`);
    logger.error(`Params: ${JSON.stringify(request.params)}`);
    logger.error(exception);

    let message: any =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    if (typeof message == 'object') {
      message = message.message ? message.message : message.error || message;
    }

    response.status(status).json({
      meta: {
        code: status,
        message,
      },
      data: new EmptyObject(),
    });
  }
}
