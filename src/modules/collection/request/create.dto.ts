import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
} from "class-validator";
import { CollectionType } from "./type.dto";

export class CreateCollectionDTO {
  @ApiProperty({
    type: String,
    example: "ApplePencil",
  })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({
    type: String,
    example: "APP",
  })
  @IsString()
  @MaxLength(50)
  symbol: string;

  @ApiProperty({
    type: String,
    example: "ApplePencil",
  })
  description: string;

  @ApiProperty({ enum: CollectionType, required: true, example: CollectionType.Skin })
  type: CollectionType;

  @ApiProperty({
    type: String,
    example: "0x90892498",
  })
  @IsString()
  creator: string;

  @ApiProperty({ type: 'string', format: 'binary', required: true })
  file: Express.Multer.File
}
