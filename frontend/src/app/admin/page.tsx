'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';
import { formatTime, formatDate, formatDateAPI } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import { HiChartBar, HiClipboardDocumentList } from 'react-icons/hi2';

interface AttendanceRecord {
  pegawai_id: number;
  nama: string;
  nip: string;
  departemen: string;
  checkin: { time: string; status: string; distance: number; photo: string } | null;
  checkout: { time: string; status: string; distance: number; photo: string } | null;
}

interface ReportData {
  date: string;
  summary: {
    total_pegawai: number;
    hadir: number;
    tidak_hadir: number;
    terlambat: number;
    sudah_pulang: number;
  };
  report: AttendanceRecord[];
}

export default function AdminPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<string>(formatDateAPI(new Date()));
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [filterDept, setFilterDept] = useState<string>('');
  const [searchName, setSearchName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || (user && user.role !== 'admin'))) {
      router.push(isAuthenticated ? '/presensi' : '/');
    }
  }, [isAuthenticated, authLoading, user, router]);

  // Fetch report data
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return;

    const fetchReport = async () => {
      setIsLoading(true);
      const response = await apiGet(`/admin/attendance-report?date=${selectedDate}`);
      if (response.success && response.data) {
        setReportData(response.data);
      }
      setIsLoading(false);
    };

    fetchReport();
  }, [selectedDate, isAuthenticated, user]);

  // Filter records
  const filteredRecords = reportData?.report.filter((record) => {
    const matchDept = !filterDept || record.departemen === filterDept;
    const matchName = !searchName || record.nama.toLowerCase().includes(searchName.toLowerCase());
    return matchDept && matchName;
  }) || [];

  // Get unique departments
  const departments = [...new Set(reportData?.report.map((r) => r.departemen) || [])];

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner !w-10 !h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-gray-light)] pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Page Header */}
        <div className="animate-fade-in">
          <h2 className="text-2xl font-bold text-[var(--primary-dark)]">
            <HiChartBar className="inline" /> Dashboard Admin
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Laporan presensi kehadiran pegawai
          </p>
        </div>

        {/* Summary Cards */}
        {reportData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 animate-slide-up">
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold text-[var(--primary-dark)]">
                {reportData.summary.total_pegawai}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">Total Pegawai</p>
            </div>
            <div className="card p-4 text-center border-l-4 border-l-[var(--success-green)]">
              <p className="text-3xl font-bold text-[var(--success-green)]">
                {reportData.summary.hadir}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">Hadir</p>
            </div>
            <div className="card p-4 text-center border-l-4 border-l-[var(--accent-red)]">
              <p className="text-3xl font-bold text-[var(--accent-red)]">
                {reportData.summary.tidak_hadir}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">Tidak Hadir</p>
            </div>
            <div className="card p-4 text-center border-l-4 border-l-[var(--warning-orange)]">
              <p className="text-3xl font-bold text-[var(--warning-orange)]">
                {reportData.summary.terlambat}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">Terlambat</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card p-4 animate-slide-up">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Date picker */}
            <div className="flex-1">
              <label htmlFor="date-filter" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Tanggal
              </label>
              <input
                id="date-filter"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input text-sm"
              />
            </div>

            {/* Department filter */}
            <div className="flex-1">
              <label htmlFor="dept-filter" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Departemen
              </label>
              <select
                id="dept-filter"
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="input text-sm"
              >
                <option value="">Semua Departemen</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Name search */}
            <div className="flex-1">
              <label htmlFor="name-search" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Cari Nama
              </label>
              <input
                id="name-search"
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Cari pegawai..."
                className="input text-sm"
              />
            </div>
          </div>
        </div>

        {/* Date display */}
        <div className="text-sm text-[var(--text-secondary)] font-medium">
          Menampilkan data: <span className="text-[var(--primary-dark)] font-bold">{formatDate(selectedDate + 'T00:00:00')}</span>
          <span className="text-[var(--text-muted)] ml-2">
            ({filteredRecords.length} pegawai)
          </span>
        </div>

        {/* Table */}
        <div className="card overflow-hidden animate-slide-up">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="spinner !w-8 !h-8 mx-auto mb-3" />
                <p className="text-sm text-[var(--text-muted)]">Memuat laporan...</p>
              </div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-16">
              <HiClipboardDocumentList className="text-4xl block mb-3" />
              <p className="text-[var(--text-secondary)] font-medium">Tidak ada data presensi</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {searchName || filterDept ? 'Coba ubah filter pencarian.' : 'Belum ada pegawai yang presensi pada tanggal ini.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary-dark text-white">
                    <th className="text-left py-3 px-4 font-semibold">Nama</th>
                    <th className="text-left py-3 px-4 font-semibold hidden sm:table-cell">Departemen</th>
                    <th className="text-center py-3 px-4 font-semibold">Masuk</th>
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                    <th className="text-center py-3 px-4 font-semibold">Keluar</th>
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, index) => (
                    <tr
                      key={record.pegawai_id || record.nip || index}
                      className={`border-b border-[var(--border-light)] transition-colors hover:bg-[var(--primary-light)]/50 ${index % 2 === 0 ? 'bg-white' : 'bg-[var(--bg-gray-light)]'
                        }`}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{record.nama}</p>
                          <p className="text-xs text-[var(--text-muted)] sm:hidden">{record.departemen}</p>
                          <p className="text-xs text-[var(--text-muted)] font-mono">{record.nip}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell text-[var(--text-secondary)]">
                        {record.departemen}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {record.checkin ? formatTime(record.checkin.time) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={record.checkin?.status || null} />
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {record.checkout ? formatTime(record.checkout.time) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={record.checkout?.status || null} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
