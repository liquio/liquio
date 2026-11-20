import { join } from 'node:path';

import { Config as ConfigLoader } from '@liquio/back-core';

import type { PdfGeneratorConfig } from '../common/types/config.types';
import { pdfGeneratorConfigSchema } from './config.schema';

const CONFIG_PATH = process.env.CONFIG_PATH || join(__dirname, '..', '..', 'config');
const SECRET_PATH = process.env.SECRET_PATH;

export class Config {
  private constructor() {}

  static get<T>(path: string): T {
    return ConfigLoader.load<PdfGeneratorConfig>({
      configPath: CONFIG_PATH,
      secretPath: SECRET_PATH ?? null,
      envPrefix: 'KITSOFT_PDF_GENERATOR_',
      schema: pdfGeneratorConfigSchema,
    }).get(path) as T;
  }
}
