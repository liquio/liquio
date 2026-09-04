import { Test, TestingModule } from '@nestjs/testing';

import { HealthcheckController } from './healthcheck.controller';
import { HealthcheckService } from './healthcheck.service';

describe('HealthcheckController', () => {
  let controller: HealthcheckController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthcheckController],
      providers: [HealthcheckService],
    }).compile();

    controller = module.get<HealthcheckController>(HealthcheckController);
  });

  describe('ping', () => {
    it('should return an object with "message" property', () => {
      const result = controller.ping();
      expect(result).toEqual({
        data: { message: 'pong', processPid: expect.any(Number) },
      });
    });
  });
});
