import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export function useSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Sign Tool')
    .setDescription('A crypto toolkit for signing and verifying messages')
    .setVersion('1.0')
    .addTag('IIT')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
}
