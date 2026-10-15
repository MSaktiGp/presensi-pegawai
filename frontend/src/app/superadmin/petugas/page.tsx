'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRoleGuard } from '@/lib/permissions';
import Modal from '@/components/Modal';
import { HiPlus, HiPencilSquare, HiKey, HiPower, HiEye, HiEyeSlash } from 'react-icons/hi2';

interface Petugas {
  id: number;
  nama: string;
  username: string;
  departemen: string | null;
  user_type: string;
  sub_type: string | null;
  gerai_id: number | null;
  kode_gerai: string | null;
  nama_gerai: string | null;
  nama_shift: string | null;
  jam_masuk: string | null;
  jam_keluar: string | null;
  is_active: boolean;
  shift_config_id: number | null;
}
interface Gerai { id: number; kode_gerai: string; nama_gerai: string; is_active: boolean }
interface Shift { id: number; nama_shift: string; user_type: string; jam_masuk: string; jam_keluar: string; }

const TYPE_LABELS: Record<string, string> = {
  pegawai_gerai: 'Pegawai Gerai',
  satpam: 'Satpam',
  cs: 'Cleaning Service',
  resepsionis: 'Resepsionis',
  admin: 'Admin',
};

const TYPES = [
  { value: '', label: 'Semua' },
  { value: 'pegawai_gerai', label: 'Pegawai Gerai' },
  { value: 'satpam', label: 'Satpam' },
  { value: 'cs', label: 'Cleaning Service' },
  { value: 'resepsionis', label: 'Resepsionis' },
];
const FORM_TYPES = [
  { value: 'pegawai_gerai', label: 'Pegawai Gerai' },
  { value: 'satpam', label: 'Satpam' },
  { value: 'cs', label: 'Cleaning Service' },
  { value: 'resepsionis', label: 'Resepsionis' },
];
const typeLabel = (t: string) => TYPE_LABELS[t] ?? t;

const EMPTY_FORM = { nama: '', username: '', password: '', user_type: 'pegawai_gerai', gerai_id: '', shift_config_id: '' };

export default function PetugasPage() {
  const allowed = useRoleGuard(['superadmin']);

  const [list, setList] = useState<Petugas[]>([]);
  const [gerai, setGerai] = useState<Gerai[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  const [editing, setEditing] = useState<Petugas | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api<Petugas[]>(`/superadmin/pegawai${filterType ? `?user_type=${filterType}` : ''}`);
    if (r.success && r.data) setList(r.data);
    setLoading(false);
  }, [filterType]);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);
  useEffect(() => {
    if (allowed) {
      api<Gerai[]>('/superadmin/gerai').then((r) => r.success && r.data && setGerai(r.data));
      api<Shift[]>('/superadmin/shifts').then((r) => r.success && r.data && setShifts(r.data));
    }
  }, [allowed]);

  const flash = (ok: boolean, msg: string) => {
    setNotice({ ok, msg });
    setTimeout(() => setNotice(null), 3500);
  };

  const openNew = () => { setForm(EMPTY_FORM); setShowPassword(false); setEditing('new'); };
  const openEdit = (p: Petugas) => {
    setForm({
      nama: p.nama, username: p.username, password: '',
      user_type: p.user_type, gerai_id: p.kode_gerai ?? p.nama_gerai ?? '',
      shift_config_id: p.shift_config_id ? String(p.shift_config_id) : ''
    });
    setShowPassword(false);
    setEditing(p);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = editing === 'new';
    if (isNew && (!form.password || form.password.trim().length < 6)) {
      flash(false, 'Password minimal 6 karakter.');
      return;
    }
    setSaving(true);
    const body = isNew
      ? { ...form, password: form.password.trim(), gerai_id: form.gerai_id || null, shift_config_id: form.shift_config_id ? Number(form.shift_config_id) : null }
      : {
        nama: form.nama,
        username: form.username,
        gerai_id: (editing as Petugas).user_type === 'pegawai_gerai' ? (form.gerai_id || null) : undefined,
        shift_config_id: form.shift_config_id ? Number(form.shift_config_id) : null
      };
    const r = isNew
      ? await api('/superadmin/pegawai', { method: 'POST', body })
      : await api(`/superadmin/pegawai/${(editing as Petugas).id}`, { method: 'PUT', body });
    setSaving(false);
    flash(r.success, r.message);
    if (r.success) {
      setEditing(null);
      load();
      api<Gerai[]>('/superadmin/gerai').then((res) => res.success && res.data && setGerai(res.data));
    }
  };

  const toggle = async (p: Petugas) => {
    if (!confirm(`${p.is_active ? 'Nonaktifkan' : 'Aktifkan'} akun ${p.nama}?`)) return;
    const r = await api(`/superadmin/pegawai/${p.id}/toggle`, { method: 'PATCH' });
    flash(r.success, r.message);
    if (r.success) load();
  };

  const resetPw = async (p: Petugas) => {
    const pw = prompt(`Masukkan password baru untuk ${p.nama} (minimal 6 karakter):`, '');
    if (pw === null) return;
    if (!pw.trim()) {
      flash(false, 'Password baru wajib diisi.');
      return;
    }
    if (pw.trim().length < 6) {
      flash(false, 'Password minimal 6 karakter.');
      return;
    }
    const r = await api(`/superadmin/pegawai/${p.id}/reset-password`, { method: 'PATCH', body: { new_password: pw.trim() } });
    flash(r.success, r.message);
  };

  if (!allowed) {
    return <div className="min-h-screen flex items-center justify-center"><div className="spinner !w-10 !h-10" /></div>;
  }

  const q = search.toLowerCase();
  const shown = list.filter((p) => !q || p.nama.toLowerCase().includes(q) || p.username.toLowerCase().includes(q));
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen bg-[var(--bg-gray-light)] pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* ========================================================================= */}
        {/* SETUP BARU: flex-col di mobile (tombol di bawah kanan), bersebelahan di desktop */}
        {/* ========================================================================= */}
        {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--primary-dark)] truncate">Manajemen Data</h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 sm:mt-1 truncate">Petugas MPP Kota Jambi</p>
          </div> */}
          {/* Tombol: di mobile berada di baris bawah kanan (self-end), di desktop sejajar (sm:self-auto) */}
          {/* <button 
            onClick={openNew} 
            className="btn btn-primary text-sm shadow-sm min-h-[44px] self-end sm:self-auto"
          >
            <HiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Tambah Petugas
          </button>
        </div> */}

        {/* ========================================================================= */}
        {/* SETUP LAMA / ALTERNATIF (SEBELUM PERUBAHAN):  
        1. Setup awal: Bersebelahan di semua layar */}
        <div className="flex items-center justify-between gap-3 animate-fade-in">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--primary-dark)] truncate">Manajemen Data</h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 sm:mt-1 truncate">Petugas MPP Kota Jambi</p>
          </div>
          <button onClick={openNew} className="btn btn-primary text-sm shadow-sm min-h-[22px]">
            <HiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Tambah Petugas
          </button>
        </div>

         {/* 2. Setup murni flex-col di semua layar (selalu di baris bawah kanan): */}
        {/* <div className="flex flex-col gap-3 animate-fade-in">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--primary-dark)] truncate">Manajemen Data</h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 sm:mt-1 truncate">Petugas MPP Kota Jambi</p>
          </div>
          <button onClick={openNew} className="btn btn-primary text-sm shadow-sm min-h-[44px] self-end">
            <HiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Tambah Petugas
          </button>
        </div>
        */}
        {/* ========================================================================= */}

        {notice && (
          <div className={`badge w-full !rounded-xl !py-3 !px-4 animate-fade-in ${notice.ok ? 'badge-success' : 'badge-danger'}`}>{notice.msg}</div>
        )}

        <div className="card p-3 sm:p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setFilterType(t.value)}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-all ${
                  filterType === t.value
                    ? 'bg-[var(--primary-dark)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--primary-light)] bg-gray-50/80 sm:bg-transparent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            aria-label="Cari petugas"
            placeholder="Cari nama / username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input text-sm sm:ml-auto sm:max-w-xs min-h-[44px]"
          />
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><div className="spinner !w-8 !h-8" /></div>
          ) : shown.length === 0 ? (
            <p className="text-center py-16 text-[var(--text-muted)]">Tidak ada petugas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary-dark text-white text-left">
                    <th className="py-3 px-4 font-semibold">Nama</th>
                    <th className="py-3 px-4 font-semibold">Tipe</th>
                    <th className="py-3 px-4 font-semibold hidden md:table-cell">Gerai/Sub</th>
                    <th className="py-3 px-4 font-semibold hidden md:table-cell">Shift</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                    <th className="py-3 px-4 font-semibold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p, i) => (
                    <tr key={p.id} className={`border-b border-[var(--border-light)] hover:bg-[var(--primary-light)]/50 transition-colors ${i % 2 ? 'bg-[var(--bg-gray-light)]' : 'bg-white'} ${p.is_active ? '' : 'opacity-60'}`}>
                      <td className="py-3 px-4">
                        <p className="font-medium text-[var(--text-primary)]">{p.nama}</p>
                        <p className="text-xs text-[var(--text-muted)] font-mono">@{p.username}</p>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">{typeLabel(p.user_type)}</td>
                      <td className="py-3 px-4 hidden md:table-cell text-[var(--text-secondary)]">
                        {p.user_type === 'pegawai_gerai' ? (
                          <span className="px-2 py-0.5 text-sm">
                            {p.kode_gerai || '-'}
                          </span>
                        ) : p.sub_type ? (
                          <span className="capitalize">{p.sub_type.replace('_', ' ')}</span>
                        ) : (
                          <span className="text-[var(--text-muted)]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-[var(--text-secondary)]">
                        {p.user_type === 'admin' ? (
                          <span className="text-xs text-[var(--text-muted)] italic">Tidak Perlu Shift</span>
                        ) : p.user_type === 'satpam' ? (
                          <span className="text-sm text-[var(--text-muted)] px-2 py-0.5 rounded-full">
                            Dinamis (3 Shift)
                          </span>
                        ) : p.nama_shift ? (
                          <span className="capitalize">{p.nama_shift} <span className="text-xs font-mono text-[var(--text-muted)]">{p.jam_masuk?.slice(0, 5)}–{p.jam_keluar?.slice(0, 5)}</span></span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`badge ${p.is_active ? 'badge-success' : 'badge-neutral'}`}>{p.is_active ? 'Aktif' : 'Nonaktif'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            disabled={!p.is_active}
                            title={p.is_active ? 'Ubah' : 'Aktifkan akun terlebih dahulu untuk mengubah data'}
                            aria-label={`Ubah ${p.nama}`}
                            className={`p-2 rounded-lg transition-colors ${p.is_active ? 'text-[var(--primary-dark)] hover:bg-[var(--primary-light)]' : 'text-gray-300 cursor-not-allowed'}`}
                          >
                            <HiPencilSquare className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => resetPw(p)}
                            disabled={!p.is_active}
                            title={p.is_active ? 'Reset password' : 'Aktifkan akun terlebih dahulu untuk mereset password'}
                            aria-label={`Reset password ${p.nama}`}
                            className={`p-2 rounded-lg transition-colors ${p.is_active ? 'text-[var(--warning-orange)] hover:bg-[var(--warning-orange-light)]' : 'text-gray-300 cursor-not-allowed'}`}
                          >
                            <HiKey className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => toggle(p)}
                            title={p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            aria-label={`${p.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${p.nama}`}
                            className={`p-2 rounded-lg transition-colors ${p.is_active ? 'text-[var(--accent-red)] hover:bg-[var(--accent-red-light)]' : 'text-[var(--success-green)] hover:bg-[var(--success-green-light)]'}`}
                          >
                            <HiPower className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Tambah Petugas' : `Ubah ${editing.nama}`} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Nama lengkap *"><input required value={form.nama} onChange={set('nama')} className="input text-sm" /></Field>
            <Field label="Username / Nama Login *"><input required value={form.username} onChange={set('username')} className="input text-sm" /></Field>

            {editing === 'new' && (
              <Field label="Posisi *">
                <select value={form.user_type} onChange={set('user_type')} className="input text-sm">
                  {FORM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
            )}

            {((editing === 'new' ? form.user_type : (editing as Petugas).user_type) === 'pegawai_gerai') && (
              <Field label="Kode Gerai *">
                <div className="relative">
                  <input
                    required
                    value={form.gerai_id}
                    onChange={set('gerai_id')}
                    className="input text-sm w-full"
                    placeholder="Contoh: 61A"
                    list="gerai-options"
                  />
                  <datalist id="gerai-options">
                    {gerai.filter((g) => g.is_active).map((g) => (
                      <option key={g.id} value={g.kode_gerai}>{g.kode_gerai} — {g.nama_gerai}</option>
                    ))}
                  </datalist>
                </div>
              </Field>
            )}

            {editing === 'new' && (
              <Field label="Password *">
                <div className="relative">
                  <input
                    required
                    minLength={6}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Minimal 6 karakter"
                    value={form.password}
                    onChange={set('password')}
                    className="input text-sm w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? <HiEyeSlash className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
            )}

            {(editing === 'new' ? form.user_type : (editing as Petugas).user_type) === 'satpam' ? (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-800">
                <p className="font-semibold mb-0.5">Shift Dinamis (Otomatis)</p>
                <p>Satpam tidak perlu di-assign shift tetap. Sistem secara otomatis menentukan Shift Pagi (07:00), Siang (15:00), atau Malam (23:00) saat satpam melakukan presensi datang.</p>
              </div>
            ) : (editing !== 'new' && (editing as Petugas).user_type === 'admin') ? null : (
              <Field label="Template Jadwal (Shift)">
                <select value={form.shift_config_id} onChange={set('shift_config_id')} className="input text-sm">
                  <option value="">Tidak ada jadwal (bebas)</option>
                  {shifts.filter(s => s.user_type === (editing === 'new' ? form.user_type : (editing as Petugas).user_type)).map((s) => (
                    <option key={s.id} value={s.id}>{s.nama_shift} ({s.jam_masuk.slice(0, 5)} - {s.jam_keluar.slice(0, 5)})</option>
                  ))}
                </select>
              </Field>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="btn btn-outline text-sm">Batal</button>
              <button type="submit" disabled={saving} className="btn btn-primary text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-[var(--text-muted)] mb-1">{label}</span>
      {children}
    </label>
  );
}
