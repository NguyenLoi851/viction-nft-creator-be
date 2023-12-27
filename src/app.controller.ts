import { Controller, Get, StreamableFile } from '@nestjs/common';
import { AppService } from './app.service';
import { createReadStream } from 'fs';
import { join } from 'path';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/.well-known/pki-validation/02893816EB3C65DC3B400EA172376674.txt')
  getVerifySslFile() {
    const file = createReadStream(join(process.cwd(), '02893816EB3C65DC3B400EA172376674.txt'));
    return new StreamableFile(file);
  }
}
