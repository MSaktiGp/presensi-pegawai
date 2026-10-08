const fs = require('fs');
const path = 'e:\\Kuliah\\Semester_7\\Magang\\Proj\\backend\\src\\services\\attendance.service.ts';
let code = fs.readFileSync(path, 'utf8');

const target1 = `const getActiveShift = async (pegawaiId: number): Promise<ShiftInfo | null> => {
  const result = await query(
    \`SELECT sc.id, sc.nama_shift, sc.jam_masuk, sc.jam_keluar,
            sc.is_cross_midnight, sc.late_threshold_minutes, sc.allowed_days
     FROM pegawai_shift_assignment psa
     JOIN shift_config sc ON psa.shift_config_id = sc.id
     WHERE psa.pegawai_id = $1 AND psa.is_active = TRUE
     ORDER BY psa.created_at DESC
     LIMIT 1\`,
    [pegawaiId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    nama_shift: row.nama_shift,
    jam_masuk: row.jam_masuk,
    jam_keluar: row.jam_keluar,
    is_cross_midnight: row.is_cross_midnight,
    late_threshold_minutes: row.late_threshold_minutes,
    allowed_days: row.allowed_days || '0,1,2,3,4,5,6',
  };
};`;

const replacement1 = `const getActiveShift = async (pegawaiId: number, type: 'checkin' | 'checkout'): Promise<ShiftInfo | null> => {
  const userResult = await query(\`SELECT user_type FROM pegawai WHERE id = $1\`, [pegawaiId]);
  if (userResult.rows.length === 0) return null;
  const userType = userResult.rows[0].user_type;

  const shiftResult = await query(
    \`SELECT id, nama_shift, jam_masuk, jam_keluar, is_cross_midnight, late_threshold_minutes, allowed_days
     FROM shift_config WHERE user_type = $1\`,
    [userType]
  );

  if (shiftResult.rows.length === 0) return null;

  if (shiftResult.rows.length === 1) {
    const row = shiftResult.rows[0];
    return { ...row, allowed_days: row.allowed_days || '0,1,2,3,4,5,6' };
  }

  const wib = getWIBParts();
  let targetMinutes = wib.hour * 60 + wib.minute;

  if (type === 'checkout') {
    const today = getWIBDateString();
    const attendance = await query(
      \`SELECT checkin_time FROM attendance WHERE pegawai_id = $1 AND date = $2 AND checkin_time IS NOT NULL\`,
      [pegawaiId, today]
    );
    if (attendance.rows.length > 0) {
      const checkinTime = new Date(attendance.rows[0].checkin_time);
      const checkinWib = getWIBParts(checkinTime);
      targetMinutes = checkinWib.hour * 60 + checkinWib.minute;
    }
  }

  let bestShift = shiftResult.rows[0];
  let minDiff = Infinity;

  for (const row of shiftResult.rows) {
    const masukMins = parseTimeToMinutes(row.jam_masuk);
    let diff = Math.abs(targetMinutes - masukMins);
    if (diff > 12 * 60) diff = 24 * 60 - diff;
    
    if (diff < minDiff) {
      minDiff = diff;
      bestShift = row;
    }
  }

  return {
    id: bestShift.id,
    nama_shift: bestShift.nama_shift,
    jam_masuk: bestShift.jam_masuk,
    jam_keluar: bestShift.jam_keluar,
    is_cross_midnight: bestShift.is_cross_midnight,
    late_threshold_minutes: bestShift.late_threshold_minutes,
    allowed_days: bestShift.allowed_days || '0,1,2,3,4,5,6',
  };
};`;

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
}

const rgx1 = new RegExp(escapeRegExp(target1).replace(/\\n/g, '\\r?\\n'), 'g');
code = code.replace(rgx1, replacement1);

const target2 = `  // 0. Get active shift for this pegawai\n  const shift = await getActiveShift(pegawaiId);`;
const replacement2 = `  // 0. Get active shift for this pegawai\n  const shift = await getActiveShift(pegawaiId, type);`;
const rgx2 = new RegExp(escapeRegExp(target2).replace(/\\n/g, '\\r?\\n'), 'g');
code = code.replace(rgx2, replacement2);

fs.writeFileSync(path, code);
console.log('Done replacement');
