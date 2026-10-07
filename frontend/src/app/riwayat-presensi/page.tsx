'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useRoleGuard, PETUGAS_ROLES } from '@/lib/permissions';
import SubHeader from '@/components/SubHeader';
import { HiDocumentText } from 'react-icons/hi2';

interface HistoryItem {
  date: string;
  checkin_time: string | null;
  checkout_time: string | null;
}

export default function RiwayatPresensiPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isAuthorized = useRoleGuard(PETUGAS_ROLES);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (!isAuthenticated || !isAuthorized) return;

    const fetchHistory = async () => {
      setPageLoading(true);
      const res = await api('/attendance/history', { method: 'GET' });
      if (res.success && res.data) {
        setHistory(res.data);
      }
      setPageLoading(false);
    };

    fetchHistory();
  }, [isAuthenticated, isAuthorized]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatMonthYear = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    const date = new Date(timeString);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(':', '.');
  };

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="spinner !w-10 !h-10" />
      </div>
    );
  }

  if (!isAuthenticated || !isAuthorized) return null;

  const filteredHistory = history.filter(item => item.date.startsWith(selectedMonth));
  const totalKehadiran = filteredHistory.filter(item => item.checkin_time && item.checkout_time).length;

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-8">
      <SubHeader title="Riwayat Presensi" />
      
      <div className="max-w-lg mx-auto px-4 py-6">
        
        {/* Summary Box */}
        <div className="bg-white rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.05)] border border-gray-100 p-5 px-6 mb-6 flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-gray-900 font-bold text-lg mb-0.5">Total Kehadiran</h3>
            <p className="text-gray-700 text-sm">{formatMonthYear(selectedMonth)}</p>
          </div>
          <div className="h-12 w-px bg-gray-300 mx-2"></div>
          <div className="flex flex-col items-center justify-center min-w-[60px]">
            <span className="text-4xl font-semibold text-[#2984c6] leading-none">{totalKehadiran}</span>
            <span className="text-[#2984c6] text-sm mt-1">Hari</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.05)] border border-gray-100 p-5 overflow-hidden">
          {/* Title */}
          <div className="flex items-center gap-2 mb-3">
             <div className="bg-[#2984c6] text-white p-1 rounded text-xs">
               <HiDocumentText size={16} />
             </div>
             <h2 className="font-bold text-gray-900 text-[15px]">Daftar Riwayat Presensi</h2>
          </div>
          
          {/* Filter */}
          <div className="mb-4">
            <label htmlFor="month-filter" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Bulan
            </label>
            <input 
              id="month-filter"
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input text-sm min-h-[44px] text-[var(--text-primary)] font-medium"
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-[#1B6CA8]">
            <table className="w-full text-sm text-center">
              <thead className="bg-[#1B6CA8] text-white">
                <tr>
                  <th className="py-2.5 px-3 font-semibold border-r border-white/20">Tanggal</th>
                  <th className="py-2.5 px-3 font-semibold border-r border-white/20">Masuk</th>
                  <th className="py-2.5 px-3 font-semibold">Keluar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B6CA8]">
                {filteredHistory.map((item, index) => (
                  <tr key={index} className="bg-white text-gray-800">
                    <td className="py-2.5 px-3 border-r border-[#1B6CA8]">{formatDate(item.date)}</td>
                    <td className="py-2.5 px-3 border-r border-[#1B6CA8]">{formatTime(item.checkin_time)}</td>
                    <td className="py-2.5 px-3">{formatTime(item.checkout_time)}</td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-gray-500 italic text-center">Belum ada riwayat presensi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
