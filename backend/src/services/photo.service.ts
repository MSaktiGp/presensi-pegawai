import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { CONFIG } from '../config/constants';
import { getSupabase, STORAGE_BUCKET } from '../config/supabase';
import { logger } from '../utils/logger';

/**
 * Process and save photo.
 * - Production (Vercel): uploads to Supabase Storage
 * - Development (local): saves to local filesystem
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

    // Compress image using sharp
    const compressedBuffer = await sharp(imageBuffer)
      .resize(CONFIG.PHOTO_MAX_WIDTH, null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .jpeg({ quality: CONFIG.PHOTO_QUALITY })
      .toBuffer();

    // Generate file path
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timestamp = Date.now();
    const filename = `${pegawaiId}-${type}-${timestamp}.jpg`;
    const storagePath = `${dateStr}/${filename}`;

    const supabase = getSupabase();

    if (supabase) {
      // ===== SUPABASE STORAGE (Production / Cloud) =====
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, compressedBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        logger.error('Supabase Storage upload failed', { error: error.message });
        throw new Error('Gagal mengupload foto ke cloud storage.');
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      const fileSizeKB = Math.round(compressedBuffer.length / 1024);
      logger.info(`Photo uploaded to Supabase: ${storagePath} (${fileSizeKB}KB)`, {
        pegawaiId,
        type,
        sizeKB: fileSizeKB,
        url: publicUrl,
      });

      return publicUrl;
    } else {
      // ===== LOCAL FILESYSTEM (Development) =====
      const dirPath = path.join(CONFIG.UPLOAD_DIR, dateStr);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const filePath = path.join(dirPath, filename);
      fs.writeFileSync(filePath, compressedBuffer);

      const fileSizeKB = Math.round(compressedBuffer.length / 1024);
      logger.info(`Photo saved locally: ${filePath} (${fileSizeKB}KB)`, {
        pegawaiId,
        type,
        sizeKB: fileSizeKB,
      });

      return filePath;
    }
  } catch (error) {
    logger.error('Failed to save photo', { error, pegawaiId, type });
    throw new Error('Gagal menyimpan foto. Silakan coba lagi.');
  }
};

