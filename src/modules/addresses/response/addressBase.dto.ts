import { ApiResponseProperty } from '@nestjs/swagger';
import { BaseResponse } from '../../../shared/response/baseResponse.dto';
import { AddressResponse } from './address.dto';

export class AddressBase extends BaseResponse {
  @ApiResponseProperty({
    type: AddressResponse,
  })
  data: AddressResponse;
}
