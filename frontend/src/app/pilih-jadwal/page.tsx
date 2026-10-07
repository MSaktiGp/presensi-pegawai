'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SubHeader from '@/components/SubHeader';
import { HiDocumentText, HiChevronRight } from 'react-icons/hi2';

function PilihJadwalContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'checkin';
  const title = type === 'checkout' ? 'Presensi Pulang' : 'Presensi Datang';

  const shifts = [
    { id: 1, name: 'Shift 1', time: '07.00-15.00' },
    { id: 2, name: 'Shift 2', time: '15.00-23.00' },
    { id: 3, name: 'Shift 3', time: '23.00-07.00' },
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
            <p className="text-gray-500 text-sm mt-0.5">Pilih sesuai shift anda.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {shifts.map((shift) => (
            <Link
              key={shift.id}
              href={`/presensi?type=${type}&shift=${shift.id}`}
              className="bg-[#1B6CA8] text-white rounded-xl p-5 flex items-center justify-between shadow-sm hover:bg-[#165a8c] transition-colors active:scale-[0.98]"
            >
              <div className="flex flex-col flex-1 items-center justify-center">
                <span className="font-bold text-xl tracking-wide">{shift.name}</span>
                <span className="text-sm font-medium mt-1 opacity-90">{shift.time}</span>
              </div>
              <HiChevronRight size={24} className="text-white/80 absolute right-8" />
            </Link>
          ))}
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
