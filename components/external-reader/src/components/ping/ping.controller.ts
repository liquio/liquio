import { Controller, Get } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { Public } from '@common/decorators';

import { PingDtoResponse } from './ping.dto';

@Controller('test')
@Public()
export class PingController {
  @Get('ping')
  @ApiResponse({
    status: 200,
    description: 'Ping response',
    type: PingDtoResponse,
  })
  ping(): PingDtoResponse {
    return { processPid: process.pid, message: 'pong' };
  }
}
