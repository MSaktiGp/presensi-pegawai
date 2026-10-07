'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRoleGuard } from '@/lib/permissions';
import Modal from '@/components/Modal';
import { HiPlus, HiPencilSquare, HiKey, HiPower } from 'react-icons/hi2';

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
}
interface Gerai { id: number; kode_gerai: string; nama_gerai: string; is_active: boolean }

const TYPES = [
  { value: '', label: 'Semua' },
  { value: 'pegawai_gerai', label: 'Pegawai Gerai' },
  { value: 'satpam', label: 'Satpam' },
  { value: 'cs', label: 'Cleaning Service' },
  { value: 'resepsionis', label: 'Resepsionis' },
];
const typeLabel = (t: string) => TYPES.find((x) => x.value === t)?.label ?? t;

const EMPTY_FORM = { nama: '', username: '', departemen: '', password: '', user_type: 'satpam', gerai_id: '' };

export default function PetugasPage() {
  const allowed = useRoleGuard(['superadmin']);

  const [list, setList] = useState<Petugas[]>([]);
  const [gerai, setGerai] = useState<Gerai[]>([]);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  const [editing, setEditing] = useState<Petugas | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api<Petugas[]>(`/superadmin/pegawai${filterType ? `?user_type=${filterType}` : ''}`);
    if (r.success && r.data) setList(r.data);
    setLoading(false);
  }, [filterType]);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);
  useEffect(() => {
    if (allowed) api<Gerai[]>('/superadmin/gerai').then((r) => r.success && r.data && setGerai(r.data));
  }, [allowed]);

  const flash = (ok: boolean, msg: string) => {
    setNotice({ ok, msg });
    setTimeout(() => setNotice(null), 3500);
  };

  const openNew = () => { setForm(EMPTY_FORM); setEditing('new'); };
  const openEdit = (p: Petugas) => {
    setForm({
      nama: p.nama, username: p.username, departemen: p.departemen ?? '', password: '',
      user_type: p.user_type, gerai_id: p.gerai_id ? String(p.gerai_id) : '',
    });
    setEditing(p);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const isNew = editing === 'new';
    const body = isNew
      ? { ...form, gerai_id: form.gerai_id ? Number(form.gerai_id) : null }
      : { nama: form.nama, username: form.username, departemen: form.departemen };
    const r = isNew
      ? await api('/superadmin/pegawai', { method: 'POST', body })
      : await api(`/superadmin/pegawai/${(editing as Petugas).id}`, { method: 'PUT', body });
    setSaving(false);
    flash(r.success, r.message);
    if (r.success) { setEditing(null); load(); }
  };

  const toggle = async (p: Petugas) => {
    if (!confirm(`${p.is_active ? 'Nonaktifkan' : 'Aktifkan'} akun ${p.nama}?`)) return;
    const r = await api(`/superadmin/pegawai/${p.id}/toggle`, { method: 'PATCH' });
    flash(r.success, r.message);
    if (r.success) load();
  };

  const resetPw = async (p: Petugas) => {
    const pw = prompt(`Password baru untuk ${p.nama} (kosongkan = "password123"):`, '');
    if (pw === null) return;
    const r = await api(`/superadmin/pegawai/${p.id}/reset-password`, { method: 'PATCH', body: { new_password: pw || undefined } });
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
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-[var(--primary-dark)]">Manajemen Petugas</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Kelola akun pegawai gerai, satpam, dan cleaning service</p>
          </div>
          <button onClick={openNew} className="btn btn-primary text-sm min-h-[44px]">
            <HiPlus className="w-4 h-4" /> Tambah Petugas
          </button>
        </div>

        {notice && (
          <div className={`badge w-full !rounded-xl !py-3 !px-4 animate-fade-in ${notice.ok ? 'badge-success' : 'badge-danger'}`}>{notice.msg}</div>
        )}

        <div className="card p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 flex-wrap">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setFilterType(t.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${filterType === t.value ? 'bg-[var(--primary-dark)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--primary-light)]'}`}
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
                    <th className="py-3 px-4 font-semibold hidden md:table-cell">Gerai / Sub</th>
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
                      <td className="py-3 px-4 hidden md:table-cell text-[var(--text-secondary)]">{p.kode_gerai ?? p.departemen ?? '-'}</td>
                      <td className="py-3 px-4 hidden md:table-cell text-[var(--text-secondary)]">
                        {p.nama_shift ? <span className="capitalize">{p.nama_shift} <span className="text-xs font-mono text-[var(--text-muted)]">{p.jam_masuk?.slice(0, 5)}–{p.jam_keluar?.slice(0, 5)}</span></span> : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`badge ${p.is_active ? 'badge-success' : 'badge-neutral'}`}>{p.is_active ? 'Aktif' : 'Nonaktif'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => openEdit(p)} title="Ubah" aria-label={`Ubah ${p.nama}`} className="p-2 rounded-lg text-[var(--primary-dark)] hover:bg-[var(--primary-light)]"><HiPencilSquare className="w-5 h-5" /></button>
                          <button onClick={() => resetPw(p)} title="Reset password" aria-label={`Reset password ${p.nama}`} className="p-2 rounded-lg text-[var(--warning-orange)] hover:bg-[var(--warning-orange-light)]"><HiKey className="w-5 h-5" /></button>
                          <button onClick={() => toggle(p)} title={p.is_active ? 'Nonaktifkan' : 'Aktifkan'} aria-label={`${p.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${p.nama}`} className={`p-2 rounded-lg ${p.is_active ? 'text-[var(--accent-red)] hover:bg-[var(--accent-red-light)]' : 'text-[var(--success-green)] hover:bg-[var(--success-green-light)]'}`}><HiPower className="w-5 h-5" /></button>
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="Username / Nama Login *"><input required value={form.username} onChange={set('username')} className="input text-sm" /></Field>
              <Field label="Departemen"><input value={form.departemen} onChange={set('departemen')} className="input text-sm" /></Field>
            </div>

            {editing === 'new' && (
              <>
                <Field label="Tipe petugas *">
                  <select value={form.user_type} onChange={set('user_type')} className="input text-sm">
                    {TYPES.slice(1).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                {form.user_type === 'pegawai_gerai' && (
                  <Field label="Gerai *">
                    <select required value={form.gerai_id} onChange={set('gerai_id')} className="input text-sm">
                      <option value="">Pilih gerai...</option>
                      {gerai.filter((g) => g.is_active).map((g) => <option key={g.id} value={g.id}>{g.kode_gerai} — {g.nama_gerai}</option>)}
                    </select>
                  </Field>
                )}
                <Field label="Password (kosongkan = password123)"><input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} className="input text-sm" /></Field>
              </>
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
