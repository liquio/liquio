import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { BasicAuthGuard } from '@common/guards';
import { LoggerMiddleware } from '@common/middlewares';
import { AuthModule } from '@modules/auth/auth.module';
import { PdfModule } from '@modules/pdf/pdf.module';
import { PingModule } from '@modules/ping/ping.module';

@Module({
  imports: [AuthModule, PingModule, PdfModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: BasicAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
