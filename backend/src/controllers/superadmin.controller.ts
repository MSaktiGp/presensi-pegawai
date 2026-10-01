import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { ROLES } from '../config/constants';
import { sendSuccess, sendError } from '../utils/response';
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
    sendSuccess(res, result.rows);
  } catch (error) {
    logger.error('List gerai error', { error });
    sendError(res, 'Gagal mengambil data gerai.', 500);
  }
};

export const createGerai = async (req: Request, res: Response): Promise<void> => {
  try {
    const { kode_gerai, nama_gerai } = req.body;

    if (!kode_gerai || !nama_gerai) {
      sendError(res, 'Kode gerai dan nama gerai wajib diisi.');
      return;
    }

    // Check duplicate
    const existing = await query('SELECT id FROM gerai WHERE LOWER(kode_gerai) = LOWER($1)', [kode_gerai]);
    if (existing.rows.length > 0) {
      sendError(res, `Gerai dengan kode "${kode_gerai}" sudah ada.`);
      return;
    }

    const result = await query(
      'INSERT INTO gerai (kode_gerai, nama_gerai) VALUES ($1, $2) RETURNING *',
      [kode_gerai.toUpperCase(), nama_gerai]
    );

    // Also create a pegawai_gerai account for this gerai
    const defaultPassword = await bcrypt.hash('password123', 10);
    await query(
      `INSERT INTO pegawai (nama, username, nip, departemen, password_hash, role, user_type, gerai_id, is_active)
       VALUES ($1, $2, $3, 'Pelayanan', $4, $5, $6, $7, TRUE)`,
      [
        `Pegawai ${kode_gerai.toUpperCase()}`,
        kode_gerai.toUpperCase(),
        `G-${kode_gerai.toUpperCase()}`,
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
    sendSuccess(res, result.rows[0], 'Gerai berhasil ditambahkan.');
  } catch (error) {
    logger.error('Create gerai error', { error });
    sendError(res, 'Gagal menambahkan gerai.', 500);
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
      sendError(res, 'Gerai tidak ditemukan.', 404);
      return;
    }

    logger.info('Gerai updated', { id, kode_gerai, nama_gerai });
    sendSuccess(res, result.rows[0], 'Gerai berhasil diperbarui.');
  } catch (error) {
    logger.error('Update gerai error', { error });
    sendError(res, 'Gagal memperbarui gerai.', 500);
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
      sendError(res, 'Gerai tidak ditemukan.', 404);
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
    sendSuccess(res, gerai, `Gerai berhasil ${statusText}.`);
  } catch (error) {
    logger.error('Toggle gerai error', { error });
    sendError(res, 'Gagal mengubah status gerai.', 500);
  }
};

// ============================================
// PEGAWAI CRUD (Satpam & CS)
// ============================================

export const listPegawai = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_type, is_active } = req.query;

    let sql = `
      SELECT p.id, p.nama, p.username, p.nip, p.departemen, p.role, p.user_type,
             p.sub_type, p.gerai_id, p.is_active, p.created_at,
             g.kode_gerai, g.nama_gerai,
             sc.nama_shift, sc.jam_masuk, sc.jam_keluar
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
    sendSuccess(res, result.rows);
  } catch (error) {
    logger.error('List pegawai error', { error });
    sendError(res, 'Gagal mengambil data pegawai.', 500);
  }
};

export const createPegawai = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nama, username, nip, departemen, email, password, user_type, sub_type, gerai_id } = req.body;

    if (!nama || !username || !user_type) {
      sendError(res, 'Nama, username, dan tipe user wajib diisi.');
      return;
    }

    // Validate user_type
    const validTypes = ['pegawai_gerai', 'satpam', 'cs'];
    if (!validTypes.includes(user_type)) {
      sendError(res, 'Tipe user tidak valid. Pilih: pegawai_gerai, satpam, atau cs.');
      return;
    }

    // Check duplicate username
    const existing = await query('SELECT id FROM pegawai WHERE LOWER(username) = LOWER($1)', [username]);
    if (existing.rows.length > 0) {
      sendError(res, `Username "${username}" sudah digunakan.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password || 'password123', 10);

    // Map user_type to role
    const role = user_type;

    const result = await query(
      `INSERT INTO pegawai (nama, username, nip, departemen, email, password_hash, role, user_type, sub_type, gerai_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE) RETURNING id, nama, username, user_type, sub_type, role`,
      [nama, username, nip || null, departemen || null, email || null, passwordHash, role, user_type, sub_type || null, gerai_id || null]
    );

    logger.info('Pegawai created', { nama, username, user_type });
    sendSuccess(res, result.rows[0], 'Pegawai berhasil ditambahkan.');
  } catch (error) {
    logger.error('Create pegawai error', { error });
    sendError(res, 'Gagal menambahkan pegawai.', 500);
  }
};

export const updatePegawai = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nama, username, nip, departemen, email, sub_type } = req.body;

    const result = await query(
      `UPDATE pegawai SET 
        nama = COALESCE($1, nama),
        username = COALESCE($2, username),
        nip = COALESCE($3, nip),
        departemen = COALESCE($4, departemen),
        email = COALESCE($5, email),
        sub_type = COALESCE($6, sub_type),
        updated_at = NOW()
       WHERE id = $7 RETURNING id, nama, username, user_type, sub_type, role`,
      [nama, username, nip, departemen, email, sub_type, id]
    );

    if (result.rows.length === 0) {
      sendError(res, 'Pegawai tidak ditemukan.', 404);
      return;
    }

    logger.info('Pegawai updated', { id });
    sendSuccess(res, result.rows[0], 'Data pegawai berhasil diperbarui.');
  } catch (error) {
    logger.error('Update pegawai error', { error });
    sendError(res, 'Gagal memperbarui data pegawai.', 500);
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
      sendError(res, 'Pegawai tidak ditemukan.', 404);
      return;
    }

    const pegawai = result.rows[0];
    const statusText = pegawai.is_active ? 'diaktifkan' : 'dinonaktifkan';
    logger.info(`Pegawai ${statusText}`, { id, nama: pegawai.nama });
    sendSuccess(res, pegawai, `Pegawai berhasil ${statusText}.`);
  } catch (error) {
    logger.error('Toggle pegawai error', { error });
    sendError(res, 'Gagal mengubah status pegawai.', 500);
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
      sendError(res, 'Pegawai tidak ditemukan.', 404);
      return;
    }

    logger.info('Password reset', { id, nama: result.rows[0].nama });
    sendSuccess(res, { id: result.rows[0].id }, 'Password berhasil direset.');
  } catch (error) {
    logger.error('Reset password error', { error });
    sendError(res, 'Gagal mereset password.', 500);
  }
};

// ============================================
// SHIFT MANAGEMENT
// ============================================

export const listShifts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query('SELECT * FROM shift_config ORDER BY user_type, nama_shift');
    sendSuccess(res, result.rows);
  } catch (error) {
    logger.error('List shifts error', { error });
    sendError(res, 'Gagal mengambil data shift.', 500);
  }
};

export const assignShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pegawai_id, shift_config_id, tanggal_mulai } = req.body;

    if (!pegawai_id || !shift_config_id) {
      sendError(res, 'Pegawai dan shift wajib dipilih.');
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
    sendSuccess(res, result.rows[0], 'Shift berhasil diassign.');
  } catch (error) {
    logger.error('Assign shift error', { error });
    sendError(res, 'Gagal mengassign shift.', 500);
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

    sendSuccess(res, stats.rows[0]);
  } catch (error) {
    logger.error('Dashboard stats error', { error });
    sendError(res, 'Gagal mengambil statistik dashboard.', 500);
  }
};
