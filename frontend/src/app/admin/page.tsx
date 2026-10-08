'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_ROLES, useRoleGuard } from '@/lib/permissions';
import { HiOutlineCalendar, HiOutlineChartBar } from 'react-icons/hi2';

interface ChartItem { label: string; hadir: number }
interface ChartData {
  month: number;
  year: number;
  total_pegawai: number;
  stats_by_type?: {
    pegawai_gerai: ChartItem[];
    satpam: ChartItem[];
    cs: ChartItem[];
  };
}

export default function DashboardPage() {
  const allowed = useRoleGuard(ADMIN_ROLES);
  const { user } = useAuth();
  const router = useRouter();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [chart, setChart] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!allowed) return;
    setIsLoading(true);
    api(`/admin/monthly-chart?month=${month}&year=${year}`).then((r) => {
      if (r.success) setChart(r.data);
      setIsLoading(false);
    });
  }, [allowed, month, year]);

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner !w-10 !h-10" />
      </div>
    );
  }

  const roleLabel = user?.role === 'superadmin' ? 'Superadmin SIPP' : 'Admin SIPP';

  return (
    <div className="min-h-screen bg-[var(--bg-gray-light)] pb-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 space-y-6">
        
        {/* Header Section */}
        <div className="animate-fade-in space-y-1">
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">Selamat Datang!</h1>
          <h2 className="text-xl font-medium text-[var(--text-primary)]">{roleLabel}</h2>
          <div className="flex items-center gap-1.5 text-sm text-[#3b82f6] font-medium pt-1">
            <HiOutlineCalendar className="w-4 h-4" />
            <span>{now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Total Card */}
        <div className="card px-5 py-3 flex items-center justify-between border border-[var(--border-light)] shadow-sm animate-slide-up">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-[var(--text-primary)]">Total Petugas</span>
            <span className="text-sm text-[var(--text-secondary)]">MPP KOTA JAMBI</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-[1px] h-10 bg-[var(--border-light)]"></div>
            <div className="flex flex-col items-center justify-center min-w-[3rem]">
              <span className="text-4xl font-bold text-[#3b82f6] leading-none">
                {chart?.total_pegawai ?? 0}
              </span>
              <span className="text-xs font-medium text-[#3b82f6] mt-1">Orang</span>
            </div>
          </div>
        </div>

        {/* Charts Header */}
        <div className="flex items-center justify-between pt-2 animate-slide-up">
          <div className="flex items-center gap-2">
            <HiOutlineChartBar className="w-6 h-6 text-[#3b82f6]" />
            <h3 className="font-bold text-[var(--text-primary)] shrink-0">Grafik Kehadiran</h3>
          </div>
          
          <select 
            aria-label="Bulan dan Tahun" 
            value={`${year}-${month}`} 
            onChange={(e) => {
              const [y, m] = e.target.value.split('-');
              setYear(+y);
              setMonth(+m);
            }} 
            className="input text-xs !py-1.5 !px-2 ms-3 min-h-0 bg-white border border-[var(--border-light)] rounded-lg shadow-sm flex-1"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const m = i + 1;
              const date = new Date(2000, i);
              return (
                <option key={m} value={`${year}-${m}`}>
                  {date.toLocaleDateString('id-ID', { month: 'long' })} {year}
                </option>
              );
            })}
          </select>
        </div>

        {/* Charts Container */}
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="spinner !w-8 !h-8" /></div>
        ) : (
          <div className="space-y-4">
            <BarChart title="Petugas Gerai" data={chart?.stats_by_type?.pegawai_gerai || []} />
            <BarChart title="Satpam" data={chart?.stats_by_type?.satpam || []} />
            <BarChart title="Cleaning Service" data={chart?.stats_by_type?.cs || []} />
          </div>
        )}

        {/* Admin Navigation (Optional, keeping it below for utility) */}
        {user?.role === 'admin' && (
          <div className="pt-4 text-center">
            <button onClick={() => router.push('/admin/rekap')} className="text-sm font-medium text-[#3b82f6] hover:underline">
              Lihat Rekap Lengkap →
            </button>
          </div>
        )}
        
        {user?.role === 'superadmin' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-4">
            <button onClick={() => router.push('/superadmin/petugas')} className="card p-4 text-left hover:border-[var(--primary-dark)] transition-colors">
              <p className="font-semibold text-[var(--primary-dark)]">Manajemen Petugas →</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Tambah, ubah, nonaktifkan akun petugas</p>
            </button>
            <button onClick={() => router.push('/superadmin/jadwal')} className="card p-4 text-left hover:border-[var(--primary-dark)] transition-colors">
              <p className="font-semibold text-[var(--primary-dark)]">Kelola Jadwal →</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Atur shift jadwal petugas</p>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function BarChart({ title, data }: { title: string; data: ChartItem[] }) {
  if (!data || data.length === 0) return null;
  
  const maxVal = Math.max(10, ...data.map(d => d.hadir));
  const tickStep = Math.ceil(maxVal / 5);
  const realMax = tickStep * 5;
  const ticks = Array.from({length: 6}, (_, i) => realMax - (i * tickStep));

  return (
    <div className="card p-5 animate-slide-up shadow-sm border border-[var(--border-light)]">
      <h3 className="font-bold text-[var(--text-primary)] mb-4">{title}</h3>
      <div className="flex h-[180px] pl-4 relative">
        
        {/* Y Axis Label (Rotated) */}
        <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-[8px] text-[var(--text-muted)] whitespace-nowrap tracking-wide">
          Jumlah Hari Hadir
        </div>
        
        {/* Y Axis Ticks */}
        <div className="flex flex-col justify-between items-end pr-2 h-full text-[10px] text-[var(--text-primary)] font-medium">
          {ticks.map((t, i) => <span key={i} className="leading-none">{t}</span>)}
        </div>

        {/* Chart Area */}
        <div className="flex-1 relative flex items-end justify-around px-2 pb-[1px]">
          
          {/* Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between z-0 pointer-events-none">
            {ticks.map((_, i) => (
              <div key={i} className={`w-full border-t ${i === ticks.length - 1 ? 'border-[#3b82f6]' : 'border-[var(--border-light)]/50'}`} />
            ))}
            {/* Left border for chart area */}
            <div className="absolute top-0 bottom-0 left-0 border-l border-[#3b82f6]" />
          </div>

          {/* Bars */}
          {data.map((d, i) => {
            const visualHadir = d.hadir;
            return (
              <div key={i} className="relative z-10 flex flex-col items-center flex-1 h-full justify-end group">
                <div 
                  className="w-full max-w-[20px] bg-[#1d70b8] group-hover:bg-[#115085] transition-colors rounded-none"
                  style={{ height: `${(visualHadir / realMax) * 100}%` }}
                  title={`${d.label}: ${d.hadir} hari`}
                />
                
                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none transition-opacity whitespace-nowrap z-20">
                  {d.hadir} hari
                </div>
                
                {/* X Axis Label */}
                <div className="absolute -bottom-[2.5rem] w-12 flex items-center justify-center">
                  <span className="text-[9px] text-[var(--text-primary)] leading-tight text-center whitespace-normal break-words">
                    {d.label.split(' ').map((word, j) => <span key={j} className="block">{word}</span>)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Spacer for X axis labels */}
      <div className="h-10"></div>
    </div>
  );
}
