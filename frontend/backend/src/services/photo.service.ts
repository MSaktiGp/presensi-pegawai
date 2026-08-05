import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { CONFIG } from '../config/constants';
import { logger } from '../utils/logger';

/**
 * Process and save photo from base64 input.
 * Compresses to ~400-500KB with quality 60%.
 */
export const savePhoto = async (
  base64Data: string,
  pegawaiId: number,
  type: 'checkin' | 'checkout'
): Promise<string> => {
  try {
    // Remove base64 header if present
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Clean, 'base64');

    // Create date-based directory
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const dirPath = path.join(CONFIG.UPLOAD_DIR, dateStr);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Generate filename
    const timestamp = Date.now();
    const filename = `${pegawaiId}-${type}-${timestamp}.jpg`;
    const filePath = path.join(dirPath, filename);

    // Compress and save using sharp
    await sharp(imageBuffer)
      .resize(CONFIG.PHOTO_MAX_WIDTH, null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .jpeg({ quality: CONFIG.PHOTO_QUALITY })
      .toFile(filePath);

    // Get file size for logging
    const stats = fs.statSync(filePath);
    const fileSizeKB = Math.round(stats.size / 1024);
    logger.info(`Photo saved: ${filePath} (${fileSizeKB}KB)`, {
      pegawaiId,
      type,
      sizeKB: fileSizeKB,
    });

    return filePath;
  } catch (error) {
    logger.error('Failed to save photo', { error, pegawaiId, type });
    throw new Error('Gagal menyimpan foto. Silakan coba lagi.');
  }
};
