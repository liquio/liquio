import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from 'src/app.module';
import { PDF_GENERATOR_TOKEN } from 'src/modules/pdf/interfaces/pdf-generator.interface';

describe('PdfController (e2e)', () => {
  let app: INestApplication;
  let mockPdfGenerator: { generateFromTemplate: jest.Mock };

  beforeEach(async () => {
    mockPdfGenerator = {
      generateFromTemplate: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PDF_GENERATOR_TOKEN)
      .useValue(mockPdfGenerator)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/pdf (POST)', () => {
    it('should return a PDF file', async () => {
      const mockPdfBuffer = Buffer.from('mock PDF content');
      mockPdfGenerator.generateFromTemplate.mockResolvedValue(mockPdfBuffer);

      const requestBody = {
        html: '<html><body>Test PDF</body></html>',
        options: {
          format: 'A4',
          orientation: 'portrait',
          margin: {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10,
          },
        },
      };

      await request(app.getHttpServer())
        .post('/pdf')
        .auth('username', 'password')
        .send(requestBody)
        .expect(201)
        .expect('Content-Type', 'application/pdf')
        .expect((res) => {
          expect(res.body).toEqual(expect.any(Buffer));
          expect(mockPdfGenerator.generateFromTemplate).toHaveBeenCalledWith(
            requestBody.html,
            requestBody.options,
          );
        });
    });

    it('should validate request body without html', async () => {
      const invalidRequestBody = {
        options: {
          format: 'A4',
        },
      };

      await request(app.getHttpServer())
        .post('/pdf')
        .auth('username', 'password')
        .send(invalidRequestBody)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toEqual(['html should not be empty', 'html must be a string']);
        });
    });

    it('should handle request body without options', () => {
      const mockPdfBuffer = Buffer.from('mock PDF content');
      mockPdfGenerator.generateFromTemplate.mockResolvedValue(mockPdfBuffer);

      const requestBody = {
        html: '<html>Test</html>',
      };

      return request(app.getHttpServer())
        .post('/pdf')
        .auth('username', 'password')
        .send(requestBody)
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual(expect.any(Buffer));
        });
    });

    it('should validate option values', async () => {
      const mockPdfBuffer = Buffer.from('mock PDF content');
      mockPdfGenerator.generateFromTemplate.mockResolvedValue(mockPdfBuffer);

      const invalidRequestBody = {
        html: '<html><body>Test PDF</body></html>',
        options: {
          timeout: '20000',
        },
      };

      await request(app.getHttpServer())
        .post('/pdf')
        .auth('username', 'password')
        .send(invalidRequestBody)
        .expect(400);
    });
  });
});
