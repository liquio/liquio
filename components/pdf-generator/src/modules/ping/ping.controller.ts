import { Controller, Get } from '@nestjs/common';

import { Public } from '@common/decorators';
@Controller('test')
@Public()
export class PingController {
  constructor() {}

  @Get('ping')
  ping() {
    return { processPid: process.pid, message: 'pong' };
  }
}
