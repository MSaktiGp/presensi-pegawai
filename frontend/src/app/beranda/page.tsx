'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useRoleGuard, PETUGAS_ROLES } from '@/lib/permissions';
import { HiUserCircle, HiBriefcase, HiClock } from 'react-icons/hi2';
import Link from 'next/link';

interface HistoryItem {
  date: string;
  checkin_time: string | null;
  checkout_time: string | null;
}

export default function BerandaPage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const isAuthorized = useRoleGuard(PETUGAS_ROLES);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !isAuthorized) return;

    const fetchHistory = async () => {
      setPageLoading(true);
      const res = await api('/attendance/history?limit=4', { method: 'GET' });
      if (res.success && res.data) {
        setHistory(res.data);
      }
      setPageLoading(false);
    };

    fetchHistory();
  }, [isAuthenticated, isAuthorized]);



  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const getRoleDisplayName = (userType?: string, subType?: string) => {
    if (userType === 'satpam') return 'Security';
    if (userType === 'cs') return subType === 'resepsionis' ? 'Resepsionis' : 'Cleaning Service';
    if (userType === 'pegawai_gerai') return 'Petugas Gerai';
    return userType || '-';
  };

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-gray-light)]">
        <div className="spinner !w-10 !h-10" />
      </div>
    );
  }

  if (!isAuthenticated || !isAuthorized) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">


      {/* Main Content */}
      <main className="flex-1 p-5 pb-10 max-w-lg mx-auto w-full">
        {/* Welcome Section */}
        <div className="mb-6 animate-slide-up">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Selamat Datang!</h1>
          <h2 className="text-xl font-medium text-gray-800">{user?.nama}</h2>
          <div className="flex items-center gap-2 mt-2 text-[#4FA5D6]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="font-medium">{today}</span>
          </div>
        </div>

        {/* Data Petugas Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-4 font-bold text-gray-800">
            <HiUserCircle className="text-[#1B6CA8] text-xl" />
            <h3>Data Petugas</h3>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600 text-sm">Nama</span>
            <span className="font-medium text-gray-900 text-sm text-right">{user?.nama}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">
              {user?.user_type === 'pegawai_gerai' ? 'Nomor Gerai' : 'Posisi'}
            </span>
            <span className="font-medium text-gray-900 text-sm">
              {user?.user_type === 'pegawai_gerai' ? user?.username : getRoleDisplayName(user?.user_type, user?.sub_type)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <Link href={user?.user_type === 'satpam' ? '/pilih-jadwal?type=checkin' : '/presensi?type=checkin'} className="bg-[#1B6CA8] rounded-xl p-5 text-white flex flex-col items-center justify-center gap-3 hover:bg-[#155A8F] transition-colors relative group">
            <div className="relative">
              <HiUserCircle size={48} />
              <div className="absolute -bottom-1 -right-1 bg-white text-[#1B6CA8] rounded-full p-0.5">
                <HiClock size={16} />
              </div>
            </div>
            <span className="font-bold text-center leading-tight">Presensi<br/>Datang</span>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </div>
          </Link>
          
          <Link href={user?.user_type === 'satpam' ? '/pilih-jadwal?type=checkout' : '/presensi?type=checkout'} className="bg-[#1B6CA8] rounded-xl p-5 text-white flex flex-col items-center justify-center gap-3 hover:bg-[#155A8F] transition-colors relative group">
            <div className="relative">
              <HiUserCircle size={48} />
              <div className="absolute -bottom-1 -right-1 bg-white text-[#1B6CA8] rounded-full p-0.5">
                <HiBriefcase size={16} />
              </div>
            </div>
            <span className="font-bold text-center leading-tight">Presensi<br/>Pulang</span>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </div>
          </Link>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-2 mb-4 font-bold text-gray-800">
            <svg className="w-5 h-5 text-[#1B6CA8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <h3>Riwayat Presensi</h3>
          </div>
          
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm text-center">
              <thead className="bg-[#1B6CA8] text-white">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Tanggal</th>
                  <th className="py-2.5 px-3 font-semibold border-l border-white/20">Masuk</th>
                  <th className="py-2.5 px-3 font-semibold border-l border-white/20">Keluar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((item, index) => (
                  <tr key={index} className="bg-white">
                    <td className="py-2.5 px-3">{formatDate(item.date)}</td>
                    <td className="py-2.5 px-3 border-l border-gray-200">{formatTime(item.checkin_time)}</td>
                    <td className="py-2.5 px-3 border-l border-gray-200">{formatTime(item.checkout_time)}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-gray-500 italic">Belum ada riwayat</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-3 text-right">
            <Link href="/riwayat-presensi" className="text-[#1B6CA8] text-xs font-semibold hover:underline flex items-center justify-end gap-1">
              Lihat Riwayat Lengkap <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
