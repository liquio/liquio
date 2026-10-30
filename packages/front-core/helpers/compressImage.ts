import Compressor from 'compressorjs';

interface CompressImageParams {
  attach: File | Blob;
  outputQuality?: number;
}

async function compressImage({ attach, outputQuality }: CompressImageParams): Promise<File | Blob> {
  return new Promise((resolve) => {
    new Compressor(attach, {
      quality: outputQuality,
      success: (result) => {
        return resolve(result);
      },
      error: (err) => {
        console.error(err.message);
      }
    });
  });
}

export default compressImage;
