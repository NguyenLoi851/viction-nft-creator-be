import { BaseResponse } from './baseResponse.dto';
import { EmptyObject } from './emptyObject.dto';
import { ApiProperty, ApiResponseProperty } from '@nestjs/swagger';

export class EmptyObjectBase extends BaseResponse {
  @ApiResponseProperty({
    type: EmptyObject,
  })
  data: EmptyObject;
}
