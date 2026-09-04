import { ApiProperty } from '@nestjs/swagger';

export class PingDtoResponse {
  @ApiProperty({
    description: 'Process ID of the application',
  })
  processPid: number;

  @ApiProperty({
    description: 'Ping response message',
  })
  message: string;
}
