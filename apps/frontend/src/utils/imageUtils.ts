/**
 * Image upload and compression utilities for DomusFlow
 * Uses browser-image-compression with graceful fallback for jsdom/testing environments
 */

import imageCompression from 'browser-image-compression';

export interface ImageUploadResult {
  dataUrl: string;
  fileName: string;
  sizeKb: number;
}

/**
 * Converts a File or Blob directly to base64 Data URL
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image file and converts to base64 Data URL
 * Suitable for local Dexie.js persistence and offline demo mode
 */
export async function compressAndEncodeImage(
  file: File,
  maxSizeMB: number = 0.8,
  maxWidthOrHeight: number = 1280
): Promise<ImageUploadResult> {
  try {
    const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    const hasCanvasContext = canvas && !!canvas.getContext && typeof Worker !== 'undefined';

    if (!hasCanvasContext) {
      const dataUrl = await fileToDataUrl(file);
      return {
        dataUrl,
        fileName: file.name,
        sizeKb: Math.round(file.size / 1024),
      };
    }

    const options = {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      initialQuality: 0.8,
    };

    const compressPromise = imageCompression(file, options);
    const timeoutPromise = new Promise<File>((_, reject) =>
      setTimeout(() => reject(new Error('Compression timeout')), 2000)
    );

    const compressedFile = await Promise.race([compressPromise, timeoutPromise]);
    const dataUrl = await fileToDataUrl(compressedFile);
    return {
      dataUrl,
      fileName: file.name,
      sizeKb: Math.round(compressedFile.size / 1024),
    };
  } catch (err) {
    // Fallback directly to file reading in case compression encounters unsupported canvas or timeouts
    console.warn('Image compression fallback used:', err);
    const dataUrl = await fileToDataUrl(file);
    return {
      dataUrl,
      fileName: file.name,
      sizeKb: Math.round(file.size / 1024),
    };
  }
}
