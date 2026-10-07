'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { GeoPosition } from '@/lib/geolocation';
import { getCurrentPeriod, getGreeting } from '@/lib/utils';
import GeolocationStatus from '@/components/GeolocationStatus';
import CameraCapture from '@/components/CameraCapture';
import StatusBadge from '@/components/StatusBadge';
import SubHeader from '@/components/SubHeader';
import { HiHandRaised, HiCheckCircle, HiXCircle, HiArrowRightOnRectangle, HiSparkles, HiClock, HiChevronLeft, HiCalendar } from 'react-icons/hi2';
import { useRoleGuard, PETUGAS_ROLES } from '@/lib/permissions';

interface OfficeLocation {
  latitude: number;
  longitude: number;
  max_radius: number;
}

interface TodayStatus {
  checkin: { time: string; status: string; distance: number } | null;
  checkout: { time: string; status: string; distance: number } | null;
}

function PresensiPageContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCheckin = searchParams.get('type') !== 'checkout';
  const isAuthorized = useRoleGuard(PETUGAS_ROLES);

  const [officeLocation, setOfficeLocation] = useState<OfficeLocation | null>(null);
  const [todayStatus, setTodayStatus] = useState<TodayStatus>({ checkin: null, checkout: null });
  const [currentPosition, setCurrentPosition] = useState<GeoPosition | null>(null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
    type?: 'checkin' | 'checkout';
  } | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  // Fetch user data and today status
  useEffect(() => {
    if (!isAuthenticated || !isAuthorized) return;

    const fetchData = async () => {
      setPageLoading(true);
      const [userData, statusData] = await Promise.all([
        api('/attendance/user-data', { method: 'GET' }),
        api('/attendance/today-status', { method: 'GET' }),
      ]);

      if (userData.success && userData.data) {
        setOfficeLocation(userData.data.office_location);
      }
      if (statusData.success && statusData.data) {
        setTodayStatus(statusData.data);
      }
      setPageLoading(false);
    };

    fetchData();
  }, [isAuthenticated]);

  const handleLocationUpdate = useCallback((position: GeoPosition, distance: number) => {
    setCurrentPosition(position);
    setCurrentDistance(distance);
  }, []);

  const handlePhotoCapture = useCallback((photoBase64: string) => {
    setCapturedPhoto(photoBase64);
  }, []);

  const handlePhotoRetake = useCallback(() => {
    setCapturedPhoto(null);
  }, []);

  const handleSubmitPresensi = async (type: 'checkin' | 'checkout') => {
    if (!currentPosition || !capturedPhoto) return;

    setIsSubmitting(true);
    setSubmitResult(null);

    const response = await api(`/attendance/${type}`, {
      method: 'POST',
      body: {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        photo: capturedPhoto,
      }
    });

    setSubmitResult({
      success: response.success,
      message: response.message || response.data?.message || 'Terjadi kesalahan.',
      type,
    });

    if (response.success) {
      // Refresh today's status
      const statusData = await api('/attendance/today-status', { method: 'GET' });
      if (statusData.success && statusData.data) {
        setTodayStatus(statusData.data);
      }
      setCapturedPhoto(null);
    }

    setIsSubmitting(false);
  };

  const period = getCurrentPeriod();
  const canCheckin = !todayStatus.checkin;
  const canCheckout = todayStatus.checkin && !todayStatus.checkout && (period === 'both' || period === 'checkout');
  // Radius sebenarnya (menggunakan radius dari database, default 100 meter)
  // const isWithinRadius = currentDistance !== null && currentDistance <= (officeLocation?.max_radius || 100);
  
  // Radius pengetesan: 10 km (10000 meter)
  const isWithinRadius = currentDistance !== null && currentDistance <= 10000;
  const canSubmit = capturedPhoto && currentPosition && isWithinRadius && !isSubmitting;

  if (authLoading || !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-gray-light)]">
        <div className="spinner !w-10 !h-10 mb-4" />
        <p className="text-[var(--text-secondary)] font-medium">Memuat data presensi...</p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[var(--bg-gray-light)] pb-8">
      <SubHeader title={isCheckin ? 'Presensi Datang' : 'Presensi Pulang'} />
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm animate-fade-in -mt-2 mb-2">
          <HiCalendar size={20} className="text-[#1B6CA8]" />
          <span>{today}</span>
        </div>

        {/* Submit Result */}
        {submitResult && (
          <div
            className={`card p-5 animate-slide-up border-l-4 ${
              submitResult.success
                ? 'border-l-[var(--success-green)] bg-[var(--success-green-light)]'
                : 'border-l-[var(--accent-red)] bg-[var(--accent-red-light)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{submitResult.success ? <HiCheckCircle /> : <HiXCircle />}</span>
              <div>
                <h3 className={`font-bold text-base ${
                  submitResult.success ? 'text-[var(--success-green)]' : 'text-[var(--accent-red)]'
                }`}>
                  {submitResult.success
                    ? `Presensi ${submitResult.type === 'checkin' ? 'Masuk' : 'Keluar'} Berhasil`
                    : 'Presensi Gagal'}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {submitResult.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSubmitResult(null)}
              className="btn btn-outline text-xs mt-3 py-1.5"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Presensi Form — only show if there's an action available */}
        {(isCheckin ? canCheckin : canCheckout) && (
          <>
            {/* Geolocation */}
            <div className="card p-5 animate-slide-up">
              <GeolocationStatus
                onLocationUpdate={handleLocationUpdate}
                officeLocation={officeLocation}
              />
            </div>

            {/* Camera */}
            <div className="card p-5 animate-slide-up">
              <CameraCapture
                onCapture={handlePhotoCapture}
                capturedPhoto={capturedPhoto}
                onRetake={handlePhotoRetake}
              />
            </div>

            {/* Submit Buttons */}
            <div className="space-y-3 animate-slide-up">
              {(isCheckin && canCheckin) && (
                <button
                  onClick={() => handleSubmitPresensi('checkin')}
                  disabled={!canSubmit}
                  className="btn btn-primary w-full py-4 text-base"
                  id="btn-checkin"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="spinner !w-5 !h-5 !border-white !border-t-transparent" />
                      Memproses Presensi Masuk...
                    </span>
                  ) : (
                    <><HiCheckCircle className="inline" /> Konfirmasi Presensi Masuk</>
                  )}
                </button>
              )}

              {(!isCheckin && canCheckout) && (
                <button
                  onClick={() => handleSubmitPresensi('checkout')}
                  disabled={!canSubmit}
                  className="btn btn-primary w-full py-4 text-base"
                  id="btn-checkout"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="spinner !w-5 !h-5 !border-white !border-t-transparent" />
                      Memproses Presensi Keluar...
                    </span>
                  ) : (
                    <><HiArrowRightOnRectangle className="inline" /> Konfirmasi Presensi Keluar</>
                  )}
                </button>
              )}

              {/* Hint text */}
              {!capturedPhoto && isWithinRadius && (
                <p className="text-xs text-center text-[var(--text-muted)]">
                  Ambil foto presensi terlebih dahulu untuk mengaktifkan tombol konfirmasi
                </p>
              )}
              {!isWithinRadius && currentPosition && (
                <p className="text-xs text-center text-[var(--accent-red)]">
                  Anda harus berada dalam radius kantor untuk melakukan presensi
                </p>
              )}
            </div>
          </>
        )}

        {/* No action available */}
        {((isCheckin && !canCheckin) || (!isCheckin && !canCheckout)) && (
          <div className="card p-6 text-center animate-slide-up">
            <div className="block mb-3">
              {todayStatus.checkin && todayStatus.checkout ? <HiSparkles className="text-4xl mx-auto text-[#1B6CA8]" /> : <HiClock className="text-4xl mx-auto text-[#1B6CA8]" />}
            </div>
            <h3 className="font-bold text-lg text-[var(--primary-dark)] mb-1">
              {todayStatus.checkin && todayStatus.checkout
                ? 'Presensi Hari Ini Selesai!'
                : isCheckin 
                  ? 'Anda sudah melakukan presensi masuk hari ini.'
                  : 'Belum waktunya presensi keluar atau Anda belum presensi masuk.'}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {todayStatus.checkin && todayStatus.checkout
                ? 'Terima kasih atas kehadirannya hari ini.'
                : isCheckin
                  ? 'Silakan kembali saat jam pulang.'
                  : `Presensi keluar tersedia mulai jam ${new Date().getDay() === 5 ? '11:00' : '16:30'}.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PresensiPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-gray-light)]">
        <div className="spinner !w-10 !h-10" />
      </div>
    }>
      <PresensiPageContent />
    </Suspense>
  );
}
