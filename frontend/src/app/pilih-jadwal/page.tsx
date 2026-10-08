'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SubHeader from '@/components/SubHeader';
import { HiDocumentText, HiChevronRight } from 'react-icons/hi2';

function PilihJadwalContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'checkin';
  const title = type === 'checkout' ? 'Presensi Pulang' : 'Presensi Datang';

  const [currentHour, setCurrentHour] = useState<number | null>(null);

  useEffect(() => {
    setCurrentHour(new Date().getHours());
  }, []);

  const checkActive = (hour: number, shiftId: number, type: string) => {
    if (type === 'checkin') {
      if (shiftId === 1) return hour >= 5 && hour < 13;
      if (shiftId === 2) return hour >= 13 && hour < 21;
      if (shiftId === 3) return hour >= 21 || hour < 5;
    } else {
      // checkout
      if (shiftId === 1) return hour >= 14 && hour < 22;
      if (shiftId === 2) return hour >= 22 || hour < 6;
      if (shiftId === 3) return hour >= 6 && hour < 14;
    }
    return true;
  };

  const shifts = [
    { id: 1, name: 'Shift Pagi', time: '07.00-15.00' },
    { id: 2, name: 'Shift Siang', time: '15.00-23.00' },
    { id: 3, name: 'Shift Malam', time: '23.00-07.00' },
  ];

  return (
    <div className="min-h-screen bg-white pb-8">
      <SubHeader title={title} />
      
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="text-[#1B6CA8] mt-1 bg-[#F0F7FA] p-2 rounded-lg">
            <HiDocumentText size={20} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg leading-tight">Jadwal Shift Presensi</h2>
            <p className="text-gray-500 text-sm mt-0.5">Pilih sesuai shift yang sedang aktif.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {shifts.map((shift) => {
            const isActive = currentHour !== null ? checkActive(currentHour, shift.id, type) : true;
            
            return isActive ? (
              <Link
                key={shift.id}
                href={`/presensi?type=${type}`}
                className="bg-[#1B6CA8] text-white rounded-xl p-5 flex items-center justify-between shadow-sm hover:bg-[#165a8c] transition-colors active:scale-[0.98]"
              >
                <div className="flex flex-col flex-1 items-center justify-center">
                  <span className="font-bold text-xl tracking-wide">{shift.name}</span>
                  <span className="text-sm font-medium mt-1 opacity-90">{shift.time}</span>
                </div>
                <HiChevronRight size={24} className="text-white/80 absolute right-8" />
              </Link>
            ) : (
              <div
                key={shift.id}
                className="bg-gray-200 text-gray-400 rounded-xl p-5 flex items-center justify-between shadow-sm cursor-not-allowed"
              >
                <div className="flex flex-col flex-1 items-center justify-center">
                  <span className="font-bold text-xl tracking-wide">{shift.name}</span>
                  <span className="text-sm font-medium mt-1 opacity-70">{shift.time}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PilihJadwalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="spinner !w-10 !h-10" />
      </div>
    }>
      <PilihJadwalContent />
    </Suspense>
  );
}
