import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { ROLES } from '../config/constants';
import { logger } from '../utils/logger';

// ============================================
// GERAI CRUD
// ============================================

export const listGerai = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT g.*, 
              (SELECT COUNT(*) FROM pegawai p WHERE p.gerai_id = g.id AND p.is_active = TRUE) as jumlah_pegawai
       FROM gerai g
       ORDER BY g.kode_gerai ASC`
    );
    res.json({ success: true, message: "Success", data: result.rows });
  } catch (error) {
    logger.error('List gerai error', { error });
    res.status(500).json({ success: false, message: 'Gagal mengambil data gerai.' });
  }
};

export const createGerai = async (req: Request, res: Response): Promise<void> => {
  try {
    const { kode_gerai, nama_gerai } = req.body;

    if (!kode_gerai || !nama_gerai) {
      res.status(400).json({ success: false, message: 'Kode gerai dan nama gerai wajib diisi.' });
      return;
    }

    // Check duplicate
    const existing = await query('SELECT id FROM gerai WHERE LOWER(kode_gerai) = LOWER($1)', [kode_gerai]);
    if (existing.rows.length > 0) {
      res.status(400).json({ success: false, message: `Gerai dengan kode "${kode_gerai}" sudah ada.` });
      return;
    }

    const result = await query(
      'INSERT INTO gerai (kode_gerai, nama_gerai) VALUES ($1, $2) RETURNING *',
      [kode_gerai.toUpperCase(), nama_gerai]
    );

    // Also create a pegawai_gerai account for this gerai
    const defaultPassword = await bcrypt.hash('password123', 10);
    await query(
      `INSERT INTO pegawai (nama, username, departemen, password_hash, role, user_type, gerai_id, is_active)
       VALUES ($1, $2, 'Pelayanan', $3, $4, $5, $6, TRUE)`,
      [
        `Pegawai ${kode_gerai.toUpperCase()}`,
        kode_gerai.toUpperCase(),
        defaultPassword,
        ROLES.PEGAWAI_GERAI,
        'pegawai_gerai',
        result.rows[0].id,
      ]
    );

    // Assign default reguler shift
    const shiftResult = await query(
      `SELECT id FROM shift_config WHERE nama_shift = 'reguler' AND user_type = 'pegawai_gerai' LIMIT 1`
    );
    if (shiftResult.rows.length > 0) {
      const pegawaiResult = await query(
        `SELECT id FROM pegawai WHERE username = $1`, [kode_gerai.toUpperCase()]
      );
      if (pegawaiResult.rows.length > 0) {
        await query(
          `INSERT INTO pegawai_shift_assignment (pegawai_id, shift_config_id, tanggal_mulai, is_active)
           VALUES ($1, $2, CURRENT_DATE, TRUE)`,
          [pegawaiResult.rows[0].id, shiftResult.rows[0].id]
        );
      }
    }

    logger.info('Gerai created', { kode_gerai, nama_gerai });
    res.json({ success: true, message: 'Gerai berhasil ditambahkan.', data: result.rows[0] });
  } catch (error) {
    logger.error('Create gerai error', { error });
    res.status(500).json({ success: false, message: 'Gagal menambahkan gerai.' });
  }
};

export const updateGerai = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { kode_gerai, nama_gerai } = req.body;

    const result = await query(
      'UPDATE gerai SET kode_gerai = COALESCE($1, kode_gerai), nama_gerai = COALESCE($2, nama_gerai), updated_at = NOW() WHERE id = $3 RETURNING *',
      [kode_gerai, nama_gerai, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Gerai tidak ditemukan.' });
      return;
    }

    logger.info('Gerai updated', { id, kode_gerai, nama_gerai });
    res.json({ success: true, message: 'Gerai berhasil diperbarui.', data: result.rows[0] });
  } catch (error) {
    logger.error('Update gerai error', { error });
    res.status(500).json({ success: false, message: 'Gagal memperbarui gerai.' });
  }
};

export const toggleGerai = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE gerai SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Gerai tidak ditemukan.' });
      return;
    }

    const gerai = result.rows[0];

    // Also toggle the associated pegawai
    await query(
      'UPDATE pegawai SET is_active = $1, updated_at = NOW() WHERE gerai_id = $2',
      [gerai.is_active, id]
    );

    const statusText = gerai.is_active ? 'diaktifkan' : 'dinonaktifkan';
    logger.info(`Gerai ${statusText}`, { id, kode_gerai: gerai.kode_gerai });
    res.json({ success: true, message: `Gerai berhasil ${statusText}.`, data: gerai });
  } catch (error) {
    logger.error('Toggle gerai error', { error });
    res.status(500).json({ success: false, message: 'Gagal mengubah status gerai.' });
  }
};

// ============================================
// PEGAWAI CRUD (Satpam & CS)
// ============================================

export const listPegawai = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_type, is_active } = req.query;

    let sql = `
      SELECT p.id, p.nama, p.username, p.departemen, p.role, p.user_type,
             p.sub_type, p.gerai_id, p.is_active, p.created_at,
             g.kode_gerai, g.nama_gerai,
             sc.id as shift_config_id, sc.nama_shift, sc.jam_masuk, sc.jam_keluar
      FROM pegawai p
      LEFT JOIN gerai g ON p.gerai_id = g.id
      LEFT JOIN pegawai_shift_assignment psa ON p.id = psa.pegawai_id AND psa.is_active = TRUE
      LEFT JOIN shift_config sc ON psa.shift_config_id = sc.id
      WHERE p.role NOT IN ('admin', 'superadmin')
    `;
    const params: any[] = [];

    if (user_type) {
      params.push(String(user_type));
      sql += ` AND p.user_type = $${params.length}`;
    }

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      sql += ` AND p.is_active = $${params.length}`;
    }

    sql += ' ORDER BY p.user_type, p.nama ASC';

    const result = await query(sql, params);
    res.json({ success: true, message: "Success", data: result.rows });
  } catch (error) {
    logger.error('List pegawai error', { error });
    res.status(500).json({ success: false, message: 'Gagal mengambil data pegawai.' });
  }
};

export const createPegawai = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nama, username, departemen, email, password, user_type, sub_type, gerai_id, shift_config_id } = req.body;

    if (!nama || !username || !user_type) {
      res.status(400).json({ success: false, message: 'Nama, username, dan tipe user wajib diisi.' });
      return;
    }

    // Validate user_type
    const validTypes = ['pegawai_gerai', 'satpam', 'cs', 'resepsionis'];
    if (!validTypes.includes(user_type)) {
      res.status(400).json({ success: false, message: 'Tipe user tidak valid. Pilih: pegawai_gerai, satpam, cs, atau resepsionis.' });
      return;
    }

    // Check duplicate username
    const existing = await query('SELECT id FROM pegawai WHERE LOWER(username) = LOWER($1)', [username]);
    if (existing.rows.length > 0) {
      res.status(400).json({ success: false, message: `Username "${username}" sudah digunakan.` });
      return;
    }

    const passwordHash = await bcrypt.hash(password || 'password123', 10);

    // Map user_type to role
    const role = user_type;

    const result = await query(
      `INSERT INTO pegawai (nama, username, departemen, email, password_hash, role, user_type, sub_type, gerai_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE) RETURNING id, nama, username, user_type, sub_type, role`,
      [nama, username, departemen || null, email || null, passwordHash, role, user_type, sub_type || null, gerai_id || null]
    );

    if (shift_config_id) {
      await query(
        `INSERT INTO pegawai_shift_assignment (pegawai_id, shift_config_id, tanggal_mulai, is_active)
         VALUES ($1, $2, CURRENT_DATE, TRUE)`,
        [result.rows[0].id, shift_config_id]
      );
    }

    logger.info('Pegawai created', { nama, username, user_type });
    res.json({ success: true, message: 'Pegawai berhasil ditambahkan.', data: result.rows[0] });
  } catch (error) {
    logger.error('Create pegawai error', { error });
    res.status(500).json({ success: false, message: 'Gagal menambahkan pegawai.' });
  }
};

export const updatePegawai = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nama, username, departemen, email, sub_type, shift_config_id } = req.body;

    const result = await query(
      `UPDATE pegawai SET 
        nama = COALESCE($1, nama),
        username = COALESCE($2, username),
        departemen = COALESCE($3, departemen),
        email = COALESCE($4, email),
        sub_type = COALESCE($5, sub_type),
        updated_at = NOW()
       WHERE id = $6 RETURNING id, nama, username, user_type, sub_type, role`,
      [nama, username, departemen, email, sub_type, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Pegawai tidak ditemukan.' });
      return;
    }

    if (shift_config_id !== undefined) {
      const currentShift = await query(
        `SELECT shift_config_id FROM pegawai_shift_assignment WHERE pegawai_id = $1 AND is_active = TRUE`,
        [id]
      );
      const currentShiftId = currentShift.rows.length > 0 ? currentShift.rows[0].shift_config_id : null;
      
      if (shift_config_id && String(currentShiftId) !== String(shift_config_id)) {
        await query(`UPDATE pegawai_shift_assignment SET is_active = FALSE WHERE pegawai_id = $1 AND is_active = TRUE`, [id]);
        await query(
          `INSERT INTO pegawai_shift_assignment (pegawai_id, shift_config_id, tanggal_mulai, is_active)
           VALUES ($1, $2, CURRENT_DATE, TRUE)`,
          [id, shift_config_id]
        );
      } else if (!shift_config_id && currentShiftId) {
        await query(`UPDATE pegawai_shift_assignment SET is_active = FALSE WHERE pegawai_id = $1 AND is_active = TRUE`, [id]);
      }
    }

    logger.info('Pegawai updated', { id });
    res.json({ success: true, message: 'Data pegawai berhasil diperbarui.', data: result.rows[0] });
  } catch (error) {
    logger.error('Update pegawai error', { error });
    res.status(500).json({ success: false, message: 'Gagal memperbarui data pegawai.' });
  }
};

export const togglePegawai = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE pegawai SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, nama, username, is_active',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Pegawai tidak ditemukan.' });
      return;
    }

    const pegawai = result.rows[0];
    const statusText = pegawai.is_active ? 'diaktifkan' : 'dinonaktifkan';
    logger.info(`Pegawai ${statusText}`, { id, nama: pegawai.nama });
    res.json({ success: true, message: `Pegawai berhasil ${statusText}.`, data: pegawai });
  } catch (error) {
    logger.error('Toggle pegawai error', { error });
    res.status(500).json({ success: false, message: 'Gagal mengubah status pegawai.' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    const password = new_password || 'password123';
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      'UPDATE pegawai SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, nama, username',
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Pegawai tidak ditemukan.' });
      return;
    }

    logger.info('Password reset', { id, nama: result.rows[0].nama });
    res.json({ success: true, message: 'Password berhasil direset.', data: { id: result.rows[0].id } });
  } catch (error) {
    logger.error('Reset password error', { error });
    res.status(500).json({ success: false, message: 'Gagal mereset password.' });
  }
};

// ============================================
// SHIFT MANAGEMENT
// ============================================

export const listShifts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query('SELECT * FROM shift_config ORDER BY user_type, nama_shift');
    res.json({ success: true, message: "Success", data: result.rows });
  } catch (error) {
    logger.error('List shifts error', { error });
    res.status(500).json({ success: false, message: 'Gagal mengambil data shift.' });
  }
};

export const createShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nama_shift, user_type, jam_masuk, jam_keluar, is_cross_midnight, late_threshold_minutes, allowed_days } = req.body;

    if (!nama_shift || !user_type || !jam_masuk || !jam_keluar) {
      res.status(400).json({ success: false, message: 'Nama shift, tipe petugas, jam masuk, dan jam keluar wajib diisi.' });
      return;
    }

    const result = await query(
      `INSERT INTO shift_config (nama_shift, user_type, jam_masuk, jam_keluar, is_cross_midnight, late_threshold_minutes, allowed_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nama_shift, user_type, jam_masuk, jam_keluar, !!is_cross_midnight, late_threshold_minutes ?? 60, allowed_days || '0,1,2,3,4,5,6']
    );

    logger.info('Shift created', { nama_shift, user_type });
    res.json({ success: true, message: 'Shift berhasil ditambahkan.', data: result.rows[0] });
  } catch (error) {
    logger.error('Create shift error', { error });
    res.status(500).json({ success: false, message: 'Gagal menambahkan shift.' });
  }
};

export const updateShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nama_shift, user_type, jam_masuk, jam_keluar, is_cross_midnight, late_threshold_minutes, allowed_days } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (nama_shift !== undefined) { updates.push(`nama_shift = $${idx++}`); values.push(nama_shift); }
    if (user_type !== undefined) { updates.push(`user_type = $${idx++}`); values.push(user_type); }
    if (jam_masuk !== undefined) { updates.push(`jam_masuk = $${idx++}`); values.push(jam_masuk); }
    if (jam_keluar !== undefined) { updates.push(`jam_keluar = $${idx++}`); values.push(jam_keluar); }
    if (is_cross_midnight !== undefined) { updates.push(`is_cross_midnight = $${idx++}`); values.push(is_cross_midnight); }
    if (late_threshold_minutes !== undefined) { updates.push(`late_threshold_minutes = $${idx++}`); values.push(late_threshold_minutes); }
    if (allowed_days !== undefined) { updates.push(`allowed_days = $${idx++}`); values.push(allowed_days); }

    if (updates.length === 0) {
      res.status(400).json({ success: false, message: 'Tidak ada data yang diperbarui.' });
      return;
    }

    values.push(id);
    const result = await query(
      `UPDATE shift_config SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Shift tidak ditemukan.' });
      return;
    }

    logger.info('Shift updated', { id });
    res.json({ success: true, message: 'Shift berhasil diperbarui.', data: result.rows[0] });
  } catch (error) {
    logger.error('Update shift error', { error });
    res.status(500).json({ success: false, message: 'Gagal memperbarui shift.' });
  }
};

export const deleteShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Assignments (incl. history) reference shift_config via FK, so block deletion while in use.
    const used = await query('SELECT 1 FROM pegawai_shift_assignment WHERE shift_config_id = $1 LIMIT 1', [id]);
    if (used.rows.length > 0) {
      res.status(400).json({ success: false, message: 'Shift sudah pernah dipakai petugas sehingga tidak bisa dihapus.' });
      return;
    }

    const result = await query('DELETE FROM shift_config WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Shift tidak ditemukan.' });
      return;
    }

    logger.info('Shift deleted', { id });
    res.json({ success: true, message: 'Shift berhasil dihapus.', data: result.rows[0] });
  } catch (error) {
    logger.error('Delete shift error', { error });
    res.status(500).json({ success: false, message: 'Gagal menghapus shift.' });
  }
};

export const assignShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pegawai_id, shift_config_id, tanggal_mulai } = req.body;

    if (!pegawai_id || !shift_config_id) {
      res.status(400).json({ success: false, message: 'Pegawai dan shift wajib dipilih.' });
      return;
    }

    // Deactivate existing assignment
    await query(
      'UPDATE pegawai_shift_assignment SET is_active = FALSE WHERE pegawai_id = $1 AND is_active = TRUE',
      [pegawai_id]
    );

    // Create new assignment
    const result = await query(
      `INSERT INTO pegawai_shift_assignment (pegawai_id, shift_config_id, tanggal_mulai, is_active)
       VALUES ($1, $2, $3, TRUE) RETURNING *`,
      [pegawai_id, shift_config_id, tanggal_mulai || new Date().toISOString().split('T')[0]]
    );

    logger.info('Shift assigned', { pegawai_id, shift_config_id });
    res.json({ success: true, message: 'Shift berhasil diassign.', data: result.rows[0] });
  } catch (error) {
    logger.error('Assign shift error', { error });
    res.status(500).json({ success: false, message: 'Gagal mengassign shift.' });
  }
};

// ============================================
// DASHBOARD STATS
// ============================================

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM pegawai WHERE is_active = TRUE AND role NOT IN ('admin', 'superadmin')) as total_pegawai_aktif,
        (SELECT COUNT(*) FROM pegawai WHERE user_type = 'pegawai_gerai' AND is_active = TRUE) as total_gerai,
        (SELECT COUNT(*) FROM pegawai WHERE user_type = 'satpam' AND is_active = TRUE) as total_satpam,
        (SELECT COUNT(*) FROM pegawai WHERE user_type = 'cs' AND is_active = TRUE) as total_cs,
        (SELECT COUNT(*) FROM gerai WHERE is_active = TRUE) as total_gerai_aktif,
        (SELECT COUNT(*) FROM gerai WHERE is_active = FALSE) as total_gerai_nonaktif
    `);

    res.json({ success: true, message: "Success", data: stats.rows[0] });
  } catch (error) {
    logger.error('Dashboard stats error', { error });
    res.status(500).json({ success: false, message: 'Gagal mengambil statistik dashboard.' });
  }
};
