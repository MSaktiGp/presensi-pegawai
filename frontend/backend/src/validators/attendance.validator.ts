import { z } from 'zod';

export const attendanceSchema = z.object({
  latitude: z.number()
    .min(-90, 'Latitude tidak valid')
    .max(90, 'Latitude tidak valid'),
  longitude: z.number()
    .min(-180, 'Longitude tidak valid')
    .max(180, 'Longitude tidak valid'),
  photo: z.string()
    .min(1, 'Foto presensi wajib diambil'),
});

export type AttendanceInput = z.infer<typeof attendanceSchema>;
