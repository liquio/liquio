import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PdfGenerationOptions } from '@modules/pdf/pdf.types';

import { Cluster } from './cluster/cluster';
import { PlaywrightAdapter } from './playwright.adapter';

jest.mock('@lib/config', () => ({
  Config: {
    get: jest.fn().mockReturnValue({
      concurrency: 2,
      maxConcurrency: 5,
      timeout: 30000,
    }),
  },
}));
jest.mock('./cluster/cluster');
jest.mock('@lib/log', () => ({
  log: {
    save: jest.fn(),
  },
}));

describe('PlaywrightAdapter', () => {
  let adapter: PlaywrightAdapter;
  let mockCluster: jest.Mocked<Cluster>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockCluster = {
      init: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn(),
      on: jest.fn(),
    } as unknown as jest.Mocked<Cluster>;

    (Cluster as unknown as jest.Mock).mockImplementation(() => mockCluster);

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlaywrightAdapter],
    }).compile();

    adapter = module.get<PlaywrightAdapter>(PlaywrightAdapter);
  });

  describe('onModuleInit', () => {
    it('should initialize the cluster', async () => {
      await adapter.onModuleInit();
      expect(jest.spyOn(mockCluster, 'init')).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close the cluster', async () => {
      await adapter.onModuleDestroy();
      expect(jest.spyOn(mockCluster, 'close')).toHaveBeenCalled();
    });
  });

  describe('generateFromTemplate', () => {
    const mockHtml = '<html><body>Test PDF</body></html>';
    const mockPdfBuffer = Buffer.from('mock PDF content');

    beforeEach(() => {
      mockCluster.execute.mockResolvedValue(mockPdfBuffer);
    });

    it('should generate PDF with default options when no options provided', async () => {
      const result = await adapter.generateFromTemplate(mockHtml, {});

      expect(jest.spyOn(mockCluster, 'execute')).toHaveBeenCalledWith({
        html: mockHtml,
        options: expect.objectContaining({
          format: 'A4',
          landscape: false,
          printBackground: true,
          displayHeaderFooter: false,
          margin: expect.any(Object),
        }),
      });
      expect(result).toBe(mockPdfBuffer);
    });

    it('should override default options with provided options', async () => {
      const options: PdfGenerationOptions = {
        format: 'A5',
        orientation: 'landscape',
        timeout: 60000,
        border: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      };

      const result = await adapter.generateFromTemplate(mockHtml, options);

      expect(jest.spyOn(mockCluster, 'execute')).toHaveBeenCalledWith({
        html: mockHtml,
        options: expect.objectContaining({
          format: 'A5',
          landscape: true,
          timeout: 60000,
          margin: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px',
          },
        }),
      });
      expect(result).toBe(mockPdfBuffer);
    });

    it('should throw InternalServerErrorException when cluster.execute fails', async () => {
      const error = new Error('Cluster execution failed');
      mockCluster.execute.mockRejectedValue(error);

      await expect(adapter.generateFromTemplate(mockHtml, {})).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should partially update margin options when only some values provided', async () => {
      const options = {
        border: {
          top: '20px',
          left: '20px',
        },
      };

      await adapter.generateFromTemplate(mockHtml, options);

      expect(jest.spyOn(mockCluster, 'execute')).toHaveBeenCalledWith({
        html: mockHtml,
        options: expect.objectContaining({
          margin: expect.objectContaining({
            top: '20px',
            left: '20px',
          }),
        }),
      });
    });
  });
});
