import {
  Controller,
  Post,
  Body,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  Get,
  Headers,
  Query,
  UseInterceptors,
  UploadedFile,
  Param,
  Put,
  DefaultValuePipe,
} from "@nestjs/common";
import { CollectionService } from "./collection.service";
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { BaseResponse } from "src/shared/response/baseResponse.dto";
import { CreateCollectionDTO } from "./request/create.dto";
import { EmptyObject } from "src/shared/response/emptyObject.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { Response } from "express";
import * as path from "path";
import { Collection } from "src/database/entities";
import { CollectionType } from "./request/type.dto";
import { PaginationResponse } from "src/config/rest/paginationResponse";

interface FileParams {
  fileName: string;
}
@ApiTags('collection')
@Controller("collection")
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Post("/create")
  @ApiOperation({
    operationId: "create",
    summary: "create",
    description: "create",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Successful",
    type: BaseResponse,
  })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, cb) => {
          cb(null, `${file.originalname}`);
        },
      }),
    })
  )
  async register(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: CreateCollectionDTO
  ): Promise<BaseResponse | EmptyObject> {
    const collection = await this.collectionService.createCollection({
      ...data,
      fileName: file.originalname,
    });
    return collection;
  }

  // @Get()
  // async findAll(): Promise<Collection[]> {
  //   return await this.collectionService.findAll();
  // }

  @Get(":id")
  async findOne(@Param("id") id: number): Promise<Collection | undefined> {
    return await this.collectionService.findOne(id);
  }

  // @Put(":id")
  // async update(
  //   @Param("id") id: number,
  //   @Body() collection: Collection
  // ): Promise<Collection | undefined> {
  //   return await this.collectionService.update(id, collection);
  // }

  // @Post(":id")
  // async delete(@Param("id") id: number): Promise<boolean> {
  //   return await this.collectionService.delete(id);
  // }

  @Get("")
  @ApiOperation({
    operationId: "getCollections",
    summary: "Get all collections",
    description: "Get all collections",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Successful",
    type: Collection,
  })
  @ApiQuery({
    name: "creator",
    required: false,
    type: String,
  })
  @ApiQuery({
    name: "type",
    required: false,
    enum: [CollectionType.Skin, CollectionType.Weapon, CollectionType.Map, CollectionType.World],
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
  })
  async getAllCollection(
    @Query("creator") creator: string,
    @Query("type") type: CollectionType,
    @Query("page", new DefaultValuePipe(1)) page: string,
    @Query("limit", new DefaultValuePipe(10)) limit: string
  ): Promise<PaginationResponse<Collection>> {
    return this.collectionService.getAllCollection(creator, type, {
      page,
      limit,
    });
  }
}
