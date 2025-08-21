// Image compression utility using Canvas API
export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export async function compressImage(
  file: File, 
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    format = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress image
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas conversion failed'));
            return;
          }

          // Create new File object
          const compressedFile = new File(
            [blob], 
            file.name.replace(/\.[^/.]+$/, '') + getExtension(format),
            { 
              type: format,
              lastModified: Date.now()
            }
          );

          console.log(`Image compressed: ${formatFileSize(file.size)} → ${formatFileSize(compressedFile.size)} (${Math.round((1 - compressedFile.size / file.size) * 100)}% reduction)`);
          
          resolve(compressedFile);
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Image loading failed'));
    };

    // Load image
    img.src = URL.createObjectURL(file);
  });
}

function getExtension(format: string): string {
  switch (format) {
    case 'image/jpeg': return '.jpg';
    case 'image/webp': return '.webp';
    case 'image/png': return '.png';
    default: return '.jpg';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Preset compression options
export const COMPRESSION_PRESETS = {
  high: { maxWidth: 1920, maxHeight: 1080, quality: 0.9, format: 'image/jpeg' as const },
  medium: { maxWidth: 1440, maxHeight: 810, quality: 0.85, format: 'image/jpeg' as const },
  low: { maxWidth: 1080, maxHeight: 720, quality: 0.8, format: 'image/jpeg' as const },
  webp: { maxWidth: 1920, maxHeight: 1080, quality: 0.85, format: 'image/webp' as const }
};