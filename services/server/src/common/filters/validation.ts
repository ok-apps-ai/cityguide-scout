import { BaseExceptionFilter } from "@nestjs/core";
import { ArgumentsHost, BadRequestException, Catch } from "@nestjs/common";
import { ValidationError } from "class-validator";

@Catch(Array<ValidationError>)
export class ValidationExceptionFilter extends BaseExceptionFilter {
  catch(exception: Array<ValidationError>, host: ArgumentsHost): any {
    // eslint-disable-next-line promise/valid-params
    return super.catch(new BadRequestException(exception), host);
  }
}
