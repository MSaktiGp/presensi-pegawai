'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRoleGuard } from '@/lib/permissions';
import Modal from '@/components/Modal';
import { HiPlus, HiPencilSquare, HiTrash, HiMoon } from 'react-icons/hi2';

interface Shift {
  id: number;
  nama_shift: string;
  user_type: string;
  jam_masuk: string;
  jam_keluar: string;
  is_cross_midnight: boolean;
  late_threshold_minutes: number;
  allowed_days: string;
}
interface Petugas { id: number; nama: string; username: string; user_type: string; shift_config_id: number | null }

const TYPE_LABEL: Record<string, string> = { pegawai_gerai: 'Pegawai Gerai', satpam: 'Satpam', cs: 'Cleaning Service', resepsionis: 'Resepsionis' };
const EMPTY = { nama_shift: '', user_type: 'satpam', jam_masuk: '07:00', jam_keluar: '15:00', is_cross_midnight: false, late_threshold_minutes: 60, allowed_days: '0,1,2,3,4,5,6' };

export default function JadwalPage() {
  const allowed = useRoleGuard(['superadmin']);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [filterType, setFilterType] = useState('satpam');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  const [editing, setEditing] = useState<Shift | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, p] = await Promise.all([
      api<Shift[]>('/superadmin/shifts'),
      api<Petugas[]>('/superadmin/pegawai?is_active=true'),
    ]);
    if (s.success && s.data) setShifts(s.data);
    if (p.success && p.data) setPetugas(p.data);
    setLoading(false);
  }, []);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  const flash = (ok: boolean, msg: string) => {
    setNotice({ ok, msg });
    setTimeout(() => setNotice(null), 3500);
  };

  const openNew = () => { setForm({ ...EMPTY, user_type: filterType }); setEditing('new'); };
  const openEdit = (s: Shift) => {
    setForm({ ...s, jam_masuk: s.jam_masuk.slice(0, 5), jam_keluar: s.jam_keluar.slice(0, 5) });
    setEditing(s);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const finalForm = { ...form, is_cross_midnight: form.jam_masuk > form.jam_keluar };
    const r = editing === 'new'
      ? await api('/superadmin/shifts', { method: 'POST', body: finalForm })
      : await api(`/superadmin/shifts/${(editing as Shift).id}`, { method: 'PUT', body: finalForm });
    setSaving(false);
    flash(r.success, r.message);
    if (r.success) { setEditing(null); load(); }
  };

  const remove = async (s: Shift) => {
    if (!confirm(`Hapus shift "${s.nama_shift}" (${TYPE_LABEL[s.user_type]})?`)) return;
    const r = await api(`/superadmin/shifts/${s.id}`, { method: 'DELETE' });
    flash(r.success, r.message);
    if (r.success) load();
  };

  const assign = async (p: Petugas, shiftId: number) => {
    const r = await api('/superadmin/shifts/assign', { method: 'POST', body: { pegawai_id: p.id, shift_config_id: shiftId } });
    flash(r.success, r.success ? `Shift ${p.nama} diperbarui.` : r.message);
    if (r.success) setPetugas((list) => list.map((x) => (x.id === p.id ? { ...x, shift_config_id: shiftId } : x)));
  };

  if (!allowed) {
    return <div className="min-h-screen flex items-center justify-center"><div className="spinner !w-10 !h-10" /></div>;
  }

  const shiftsOfType = shifts.filter((s) => s.user_type === filterType);
  const petugasOfType = petugas.filter((p) => p.user_type === filterType);

  return (
    <div className="min-h-screen bg-[var(--bg-gray-light)] pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-[var(--primary-dark)]">Kelola Jadwal</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Atur shift kerja dan penugasan jadwal petugas</p>
          </div>
          <button onClick={openNew} className="btn btn-primary text-sm min-h-[44px]">
            <HiPlus className="w-4 h-4" /> Tambah Shift
          </button>
        </div>

        {notice && (
          <div className={`badge w-full !rounded-xl !py-3 !px-4 animate-fade-in ${notice.ok ? 'badge-success' : 'badge-danger'}`}>{notice.msg}</div>
        )}

        <div className="card p-2 flex gap-1 flex-wrap">
          {Object.entries(TYPE_LABEL).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilterType(value)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${filterType === value ? 'bg-[var(--primary-dark)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--primary-light)]'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="spinner !w-8 !h-8" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Shift definitions */}
            <section className="lg:col-span-2 space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">Daftar Shift</h2>
              {shiftsOfType.length === 0 && <p className="card p-6 text-center text-sm text-[var(--text-muted)]">Belum ada shift untuk tipe ini.</p>}
              {shiftsOfType.map((s) => (
                <div key={s.id} className="card p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold capitalize text-[var(--text-primary)] flex items-center gap-1.5">
                      {s.nama_shift} {s.is_cross_midnight && <HiMoon className="w-4 h-4 text-[var(--primary-medium)]" title="Lintas tengah malam" />}
                    </p>
                    <p className="text-lg font-mono font-bold text-[var(--primary-dark)] tabular-nums">
                      {s.jam_masuk.slice(0, 5)} – {s.jam_keluar.slice(0, 5)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">Toleransi terlambat {s.late_threshold_minutes} menit</p>
                  </div>
                  <button onClick={() => openEdit(s)} aria-label={`Ubah shift ${s.nama_shift}`} className="p-2 rounded-lg text-[var(--primary-dark)] hover:bg-[var(--primary-light)]"><HiPencilSquare className="w-5 h-5" /></button>
                  <button onClick={() => remove(s)} aria-label={`Hapus shift ${s.nama_shift}`} className="p-2 rounded-lg text-[var(--accent-red)] hover:bg-[var(--accent-red-light)]"><HiTrash className="w-5 h-5" /></button>
                </div>
              ))}
            </section>

            {/* Assignment */}
            <section className="lg:col-span-3 space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">Penugasan Petugas ({petugasOfType.length})</h2>
              <div className="card overflow-hidden">
                {petugasOfType.length === 0 ? (
                  <p className="text-center py-10 text-sm text-[var(--text-muted)]">Tidak ada petugas aktif.</p>
                ) : (
                  <ul className="divide-y divide-[var(--border-light)]">
                    {petugasOfType.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--primary-light)]/40 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--text-primary)] truncate">{p.nama}</p>
                          <p className="text-xs text-[var(--text-muted)] font-mono">@{p.username}</p>
                        </div>
                        <select
                          aria-label={`Shift untuk ${p.nama}`}
                          value={p.shift_config_id ?? ''}
                          onChange={(e) => assign(p, Number(e.target.value))}
                          className={`input text-sm !py-2 !w-auto min-w-[150px] ${p.shift_config_id ? '' : '!border-[var(--warning-orange)]'}`}
                        >
                          <option value="" disabled>Belum ada shift</option>
                          {shiftsOfType.map((s) => (
                            <option key={s.id} value={s.id}>{s.nama_shift} ({s.jam_masuk.slice(0, 5)}–{s.jam_keluar.slice(0, 5)})</option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Tambah Shift' : `Ubah Shift ${editing.nama_shift}`} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Nama shift *</span>
                <input required placeholder="pagi / siang / malam" value={form.nama_shift} onChange={(e) => setForm({ ...form, nama_shift: e.target.value })} className="input text-sm" />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Tipe petugas *</span>
                <select value={form.user_type} onChange={(e) => setForm({ ...form, user_type: e.target.value })} className="input text-sm">
                  {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Jam masuk *</span>
                <input required type="time" value={form.jam_masuk} onChange={(e) => setForm({ ...form, jam_masuk: e.target.value })} className="input text-sm" />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Jam keluar *</span>
                <input required type="time" value={form.jam_keluar} onChange={(e) => setForm({ ...form, jam_keluar: e.target.value })} className="input text-sm" />
              </label>
            </div>
            <label className="block">
              <span className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Toleransi terlambat (menit)</span>
              <input type="number" min={0} value={form.late_threshold_minutes} onChange={(e) => setForm({ ...form, late_threshold_minutes: +e.target.value })} className="input text-sm" />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Hari Kerja *</span>
              <div className="flex flex-wrap gap-2">
                {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day, idx) => {
                  const allowed = form.allowed_days ? form.allowed_days.split(',') : [];
                  const isChecked = allowed.includes(String(idx));
                  return (
                    <label key={idx} className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const newAllowed = e.target.checked
                            ? [...allowed, String(idx)].sort()
                            : allowed.filter((d) => d !== String(idx));
                          setForm({ ...form, allowed_days: newAllowed.join(',') });
                        }}
                        className="w-4 h-4 accent-[var(--primary-dark)]"
                      />
                      {day}
                    </label>
                  );
                })}
              </div>
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input type="checkbox" disabled checked={form.jam_masuk > form.jam_keluar} className="w-4 h-4 accent-[var(--primary-dark)] opacity-70" />
              Shift melewati tengah malam (otomatis)
            </label>
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
