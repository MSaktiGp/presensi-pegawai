'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatDateAPI } from '@/lib/utils';
import { ADMIN_ROLES, useRoleGuard } from '@/lib/permissions';
import StatusBadge from '@/components/StatusBadge';
import { HiXMark, HiBars3BottomLeft, HiChartPie, HiDocumentArrowDown, HiMagnifyingGlass, HiChevronDown } from 'react-icons/hi2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface AttendanceRecord {
  pegawai_id: number;
  nama: string;
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

export default function RekapPage() {
  const allowed = useRoleGuard(ADMIN_ROLES);

  const [selectedDate, setSelectedDate] = useState<string>(formatDateAPI(new Date()));
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [filterDept, setFilterDept] = useState<string>('');
  const [searchName, setSearchName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; nama: string; type: string } | null>(null);
  const [isExcelDropdownOpen, setIsExcelDropdownOpen] = useState(false);

  // Fetch report data
  useEffect(() => {
    if (!allowed) return;

    const fetchReport = async () => {
      setIsLoading(true);
      const response = await api(`/admin/attendance-report?date=${selectedDate}`, { method: 'GET' });
      if (response.success && response.data) {
        setReportData(response.data);
      }
      setIsLoading(false);
    };

    fetchReport();
  }, [selectedDate, allowed]);

  // Filter records
  const filteredRecords = reportData?.report.filter((record) => {
    const matchDept = !filterDept || record.departemen === filterDept;
    const matchName = !searchName || record.nama.toLowerCase().includes(searchName.toLowerCase());
    return matchDept && matchName;
  }) || [];

  // Get unique departments
  const departments = [...new Set(reportData?.report.map((r) => r.departemen) || [])];

  const getStatusLabel = (status: string | null) => {
    if (!status) return 'Belum';
    const labels: Record<string, string> = {
      success: 'Tepat Waktu',
      late: 'Terlambat',
      out_of_radius: 'Diluar Radius',
      failed: 'Gagal',
      duplicate: 'Duplikat',
      outside_hours: 'Diluar Jam',
      pending: 'Belum',
    };
    return labels[status] || 'Belum';
  };

  const getExportData = () => {
    return filteredRecords.map((r, i) => ({
      'No': i + 1,
      'Nama': r.nama,
      'Masuk': r.checkin ? new Date(r.checkin.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
      'Status Masuk': getStatusLabel(r.checkin?.status || null),
      'Keluar': r.checkout ? new Date(r.checkout.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
      'Status Keluar': getStatusLabel(r.checkout?.status || null)
    }));
  };

  const exportExcel = (format: 'csv' | 'xlsx') => {
    if (!filteredRecords.length) return;
    const data = getExportData();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Presensi");
    XLSX.writeFile(workbook, `rekap_presensi_${selectedDate}.${format}`);
  };

  const exportPDF = () => {
    if (!filteredRecords.length) return;
    const doc = new jsPDF();
    
    doc.text(`Rekap Presensi Petugas MPP Kota Jambi`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Tanggal: ${selectedDate} | Petugas: ${filterDept || 'Semua Petugas'}`, 14, 22);

    const head = [['No', 'Nama', 'Masuk', 'Status Masuk', 'Keluar', 'Status Keluar']];
    const data = getExportData();
    const body = data.map(r => [
      r['No'], r['Nama'], r['Masuk'], r['Status Masuk'], r['Keluar'], r['Status Keluar']
    ]);

    autoTable(doc, {
      startY: 28,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] },
    });

    doc.save(`rekap_presensi_${selectedDate}.pdf`);
  };

  if (!allowed) {
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
        <div className="animate-fade-in print:hidden">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] text-balance">
            Rekap Data
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1 text-pretty">
            Presensi Petugas MPP Kota Jambi
          </p>
        </div>

        {/* Summary Cards */}
        {reportData && (
          <div className="hidden sm:grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 animate-slide-up print:hidden">
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
        <div className="card p-4 animate-slide-up print:hidden">
          <div className="flex items-center gap-2 mb-4">
            <HiBars3BottomLeft className="w-5 h-5 text-[var(--primary-dark)]" />
            <h3 className="font-bold text-[var(--text-primary)] text-base">Filter Data</h3>
          </div>
          <div className="flex flex-col gap-3">
            {/* Date picker */}
            <div>
              <label htmlFor="date-filter" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Tanggal
              </label>
              <input
                id="date-filter"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input text-sm min-h-[44px] text-[var(--text-primary)] font-medium"
              />
            </div>

            {/* Department filter */}
            <div>
              <label htmlFor="dept-filter" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Posisi Petugas
              </label>
              <select
                id="dept-filter"
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="input text-sm min-h-[44px] text-[var(--text-primary)] font-medium"
              >
                <option value="">Semua Petugas</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Name search */}
            <div>
              <label htmlFor="name-search" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Nama Petugas
              </label>
              <div className="relative">
                <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  id="name-search"
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Cari Nama Petugas.."
                  className="input text-sm min-h-[44px] pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Data Table Header */}
        <div className="animate-slide-up print:hidden">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-[var(--primary-dark)]">
              <HiChartPie className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] text-base">Data Presensi Petugas</h3>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} . {filterDept || 'Semua Petugas'}
          </p>
          <div className="flex gap-2 mb-4 relative">
            <button onClick={exportPDF} className="btn bg-[#e11d48] hover:bg-[#be123c] text-white !py-2 !px-3 text-sm font-semibold rounded-lg border-none flex items-center gap-2">
              <HiDocumentArrowDown className="w-4 h-4" />
              Unduh PDF
            </button>
            <div className="relative">
              <button 
                onClick={() => setIsExcelDropdownOpen(!isExcelDropdownOpen)}
                className="btn bg-[#27ae60] hover:bg-[#219653] text-white !py-2 !px-3 text-sm font-semibold rounded-lg border-none flex items-center gap-2"
              >
                <HiDocumentArrowDown className="w-4 h-4" />
                Unduh Excel
                <HiChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExcelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isExcelDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsExcelDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-36 bg-white rounded-lg shadow-xl z-20 border border-[var(--border-light)] overflow-hidden animate-fade-in">
                    <button 
                      onClick={() => {
                        exportExcel('xlsx');
                        setIsExcelDropdownOpen(false);
                      }} 
                      className="w-full text-left px-4 py-3 text-sm active:bg-[var(--primary-light)] sm:hover:bg-[var(--primary-light)] text-[var(--text-primary)] font-medium border-b border-[var(--border-light)]"
                    >
                      Format XLSX
                    </button>
                    <button 
                      onClick={() => {
                        exportExcel('csv');
                        setIsExcelDropdownOpen(false);
                      }} 
                      className="w-full text-left px-4 py-3 text-sm active:bg-[var(--primary-light)] sm:hover:bg-[var(--primary-light)] text-[var(--text-primary)] font-medium"
                    >
                      Format CSV
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
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
                    <th className="text-left py-3 px-4 font-semibold">Petugas</th>
                    <th className="text-left py-3 px-4 font-semibold hidden sm:table-cell">Departemen</th>
                    <th className="text-center py-3 px-4 font-semibold">Masuk</th>
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                    <th className="text-center py-3 px-4 font-semibold">Foto Masuk</th>
                    <th className="text-center py-3 px-4 font-semibold">Keluar</th>
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                    <th className="text-center py-3 px-4 font-semibold">Foto Keluar</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, index) => (
                    <tr
                      key={record.pegawai_id || index}
                      className={`border-b border-[var(--border-light)] transition-colors hover:bg-[var(--primary-light)]/50 ${index % 2 === 0 ? 'bg-white' : 'bg-[var(--bg-gray-light)]'
                        }`}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{record.nama}</p>
                          <p className="text-xs text-[var(--text-muted)] sm:hidden">{record.departemen}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell text-[var(--text-secondary)]">
                        {record.departemen}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {record.checkin ? new Date(record.checkin.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={record.checkin?.status || null} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {record.checkin?.photo ? (
                          <button
                            onClick={() => setPreviewPhoto({ url: record.checkin!.photo, nama: record.nama, type: 'Masuk' })}
                            className="inline-block group"
                            title="Lihat foto masuk"
                          >
                            <img
                              src={record.checkin.photo}
                              alt={`Foto masuk ${record.nama}`}
                              className="w-10 h-10 rounded-lg object-cover border-2 border-[var(--border-light)] group-hover:border-[var(--primary-dark)] transition-all group-hover:scale-110 cursor-pointer"
                            />
                          </button>
                        ) : (
                          <span className="text-[var(--text-muted)]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {record.checkout ? new Date(record.checkout.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={record.checkout?.status || null} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {record.checkout?.photo ? (
                          <button
                            onClick={() => setPreviewPhoto({ url: record.checkout!.photo, nama: record.nama, type: 'Keluar' })}
                            className="inline-block group"
                            title="Lihat foto keluar"
                          >
                            <img
                              src={record.checkout.photo}
                              alt={`Foto keluar ${record.nama}`}
                              className="w-10 h-10 rounded-lg object-cover border-2 border-[var(--border-light)] group-hover:border-[var(--primary-dark)] transition-all group-hover:scale-110 cursor-pointer"
                            />
                          </button>
                        ) : (
                          <span className="text-[var(--text-muted)]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--primary-dark)] text-white">
              <div>
                <p className="font-semibold text-sm">{previewPhoto.nama}</p>
                <p className="text-xs text-white/70">Foto Presensi {previewPhoto.type}</p>
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Photo */}
            <div className="bg-black">
              <img
                src={previewPhoto.url}
                alt={`Foto presensi ${previewPhoto.nama}`}
                className="w-full max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


