import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CollectionService } from "./collection.service";
import { CollectionController } from "./collection.controller";
import { Collection } from "src/database/entities";

@Module({
  imports: [TypeOrmModule.forFeature([Collection])],
  providers: [CollectionService],
  controllers: [CollectionController],
})
export class CollectionModule {}
