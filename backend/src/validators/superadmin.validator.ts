import { z } from 'zod';

export const createGeraiSchema = z.object({
  kode_gerai: z.string().min(1, 'Kode gerai wajib diisi').max(20, 'Kode gerai maksimal 20 karakter'),
  nama_gerai: z.string().min(1, 'Nama gerai wajib diisi').max(255, 'Nama gerai maksimal 255 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter').optional(),
});

export const updateGeraiSchema = z.object({
  kode_gerai: z.string().min(1, 'Kode gerai tidak boleh kosong').max(20).optional(),
  nama_gerai: z.string().min(1, 'Nama gerai tidak boleh kosong').max(255).optional(),
});

export const resetPasswordSchema = z.object({
  new_password: z.string().min(6, 'Password baru minimal 6 karakter'),
});

export const createShiftSchema = z.object({
  nama_shift: z.string().min(1, 'Nama shift wajib diisi').max(50),
  user_type: z.string().min(1, 'Tipe petugas wajib diisi'),
  jam_masuk: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'Format jam masuk harus HH:MM atau HH:MM:SS'),
  jam_keluar: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'Format jam keluar harus HH:MM atau HH:MM:SS'),
  is_cross_midnight: z.boolean().optional(),
  late_threshold_minutes: z.number().int().min(0).max(300).optional(),
  allowed_days: z.string().optional(),
});

export const updateShiftSchema = z.object({
  nama_shift: z.string().min(1).max(50).optional(),
  user_type: z.string().min(1).optional(),
  jam_masuk: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/).optional(),
  jam_keluar: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/).optional(),
  is_cross_midnight: z.boolean().optional(),
  late_threshold_minutes: z.number().int().min(0).max(300).optional(),
  allowed_days: z.string().optional(),
});

export const assignShiftSchema = z.object({
  pegawai_id: z.number().int().positive('Pegawai wajib dipilih'),
  shift_config_id: z.number().int().positive('Shift wajib dipilih'),
  tanggal_mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
});
