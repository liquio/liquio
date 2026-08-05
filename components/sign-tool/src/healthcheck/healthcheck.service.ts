import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthcheckService {
  ping(): object {
    return { data: { processPid: process.pid, message: 'pong' } };
  }
}
