import axios from 'axios';

import { getConfig, getLog } from './context';

const ALLOWED_OPTION_KEYS = ['timeout', 'format', 'orientation', 'border', 'width', 'height'];
const ALLOWED_BORDER_KEYS = ['top', 'right', 'bottom', 'left'];
const MAX_BODY_SIZE = 60 * 1024 * 1024;
const DEFAULT_TIMEOUT = 120000;

/**
 * Convert template PDF options to the options accepted by pdf-generator.
 * @param {object} input Template PDF options.
 * @returns {{ options: object, dropped: string[] }} Allowed options and names of dropped keys.
 */
export function toPdfGeneratorOptions(input: Record<string, any>): { options: Record<string, any>; dropped: string[] } {
  const source = input || {};
  const options: Record<string, any> = {};
  const dropped = Object.keys(source).filter((key) => !ALLOWED_OPTION_KEYS.includes(key));

  if (source.timeout !== undefined) {
    const timeout = Number(source.timeout);
    if (!isNaN(timeout)) {
      options.timeout = timeout;
    }
  }

  for (const key of ['format', 'orientation', 'width', 'height']) {
    if (typeof source[key] === 'string') {
      options[key] = source[key];
    }
  }

  if (source.border && typeof source.border === 'object') {
    const border: Record<string, string> = {};
    for (const key of ALLOWED_BORDER_KEYS) {
      if (typeof source.border[key] === 'string') {
        border[key] = source.border[key];
      }
    }
    if (Object.keys(border).length) {
      options.border = border;
    }
  }

  return { options, dropped };
}

/**
 * Render HTML to PDF using pdf-generator.
 * @param {string} html HTML.
 * @param {object} input Template PDF options.
 * @returns {Promise<Buffer>}
 */
export async function renderPdf(html: string, input: Record<string, any>): Promise<Buffer> {
  const { url, basicAuthToken, requestTimeout } = getConfig().pdf_generator || {};
  if (!url || !basicAuthToken) {
    throw new Error('PDF generator config is missing url or basicAuthToken');
  }

  const { options, dropped } = toPdfGeneratorOptions(input);
  if (dropped.length) {
    getLog().save('pdf-generator-options-dropped', { keys: dropped });
  }

  const response = await axios.post(
    url,
    { html, options },
    {
      headers: { Authorization: basicAuthToken, 'Content-Type': 'application/json' },
      responseType: 'arraybuffer',
      timeout: requestTimeout || DEFAULT_TIMEOUT,
      maxBodyLength: MAX_BODY_SIZE,
      maxContentLength: MAX_BODY_SIZE,
      validateStatus: (status) => status === 200,
    },
  );

  return Buffer.from(response.data);
}
