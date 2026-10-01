'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPost } from '@/lib/api';
import { GeoPosition } from '@/lib/geolocation';
import { formatTime, formatDate, getCurrentPeriod, getGreeting } from '@/lib/utils';
import GeolocationStatus from '@/components/GeolocationStatus';
import CameraCapture from '@/components/CameraCapture';
import StatusBadge from '@/components/StatusBadge';
import { HiHandRaised, HiCheckCircle, HiXCircle, HiArrowRightOnRectangle, HiSparkles, HiClock, HiChartBar } from 'react-icons/hi2';

interface OfficeLocation {
  latitude: number;
  longitude: number;
  max_radius: number;
}

interface TodayStatus {
  checkin: { time: string; status: string; distance: number } | null;
  checkout: { time: string; status: string; distance: number } | null;
}

export default function PresensiPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

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

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch user data and today status
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      setPageLoading(true);
      const [userData, statusData] = await Promise.all([
        apiGet('/attendance/user-data'),
        apiGet('/attendance/today-status'),
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

    const response = await apiPost(`/attendance/${type}`, {
      latitude: currentPosition.latitude,
      longitude: currentPosition.longitude,
      photo: capturedPhoto,
    });

    setSubmitResult({
      success: response.success,
      message: response.message || response.data?.message || 'Terjadi kesalahan.',
      type,
    });

    if (response.success) {
      // Refresh today's status
      const statusData = await apiGet('/attendance/today-status');
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
  const isWithinRadius = currentDistance !== null && currentDistance <= (officeLocation?.max_radius || 100);
  const canSubmit = capturedPhoto && currentPosition && isWithinRadius && !isSubmitting;

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner !w-10 !h-10" />
      </div>
    );
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-gray-light)]">
        <div className="text-center animate-fade-in">
          <div className="spinner !w-10 !h-10 mx-auto mb-4" />
          <p className="text-sm text-[var(--text-secondary)]">Memuat data presensi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-gray-light)] pb-8">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Greeting */}
        <div className="animate-fade-in">
          <h2 className="text-2xl font-bold text-[var(--primary-dark)]">
            {getGreeting()} <HiHandRaised className="inline" />
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {formatDate(new Date())}
          </p>
        </div>

        {/* Pegawai Info Card (locked) */}
        <div className="card p-5 border-l-4 border-l-[var(--primary-dark)] animate-slide-up">
          <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
            Data Pegawai
          </h3>
          <div className="grid grid-cols-1 gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Nama</span>
              <span className="text-sm font-semibold">{user?.nama}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Username</span>
              <span className="text-sm font-mono font-semibold">{user?.username}</span>
            </div>
            {user?.nip && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">NIP</span>
                <span className="text-sm font-mono font-semibold">{user?.nip}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Tipe</span>
              <span className="text-sm font-semibold capitalize">
                {user?.user_type === 'pegawai_gerai' ? 'Pegawai Gerai' :
                 user?.user_type === 'satpam' ? 'Satpam' :
                 user?.user_type === 'cs' ? (user?.sub_type === 'resepsionis' ? 'CS - Resepsionis' : 'CS - Cleaning Service') :
                 user?.user_type}
              </span>
            </div>
            {user?.gerai && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Gerai</span>
                <span className="text-sm font-semibold">{user.gerai.kode} — {user.gerai.nama}</span>
              </div>
            )}
            {user?.shift && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Shift</span>
                <span className="text-sm font-semibold capitalize">
                  {user.shift.nama} ({user.shift.jam_masuk?.substring(0, 5)} - {user.shift.jam_keluar?.substring(0, 5)})
                </span>
              </div>
            )}
            {user?.departemen && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Departemen</span>
                <span className="text-sm font-semibold">{user?.departemen}</span>
              </div>
            )}
          </div>
        </div>

        {/* Today's Status */}
        {(todayStatus.checkin || todayStatus.checkout) && (
          <div className="card p-5 animate-slide-up">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Status Hari Ini
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-[var(--border-light)]">
                <span className="text-sm text-[var(--text-secondary)]">Presensi Masuk</span>
                <div className="flex items-center gap-2">
                  {todayStatus.checkin ? (
                    <>
                      <span className="text-sm font-mono font-medium">
                        {formatTime(todayStatus.checkin.time)}
                      </span>
                      <StatusBadge status={todayStatus.checkin.status} />
                    </>
                  ) : (
                    <StatusBadge status={null} />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[var(--text-secondary)]">Presensi Keluar</span>
                <div className="flex items-center gap-2">
                  {todayStatus.checkout ? (
                    <>
                      <span className="text-sm font-mono font-medium">
                        {formatTime(todayStatus.checkout.time)}
                      </span>
                      <StatusBadge status={todayStatus.checkout.status} />
                    </>
                  ) : (
                    <StatusBadge status={null} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
        {(canCheckin || canCheckout) && (
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
              {canCheckin && (
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

              {canCheckout && (
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
        {!canCheckin && !canCheckout && (
          <div className="card p-6 text-center animate-slide-up">
            <div className="block mb-3">
              {todayStatus.checkin && todayStatus.checkout ? <HiSparkles className="text-4xl mx-auto" /> : <HiClock className="text-4xl mx-auto" />}
            </div>
            <h3 className="font-bold text-lg text-[var(--primary-dark)] mb-1">
              {todayStatus.checkin && todayStatus.checkout
                ? 'Presensi Hari Ini Selesai!'
                : 'Menunggu Jam Keluar'}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {todayStatus.checkin && todayStatus.checkout
                ? 'Terima kasih atas kehadirannya hari ini.'
                : `Presensi keluar tersedia mulai jam ${new Date().getDay() === 5 ? '11:00' : '16:30'}.`}
            </p>
          </div>
        )}

        {/* Admin link for admin users */}
        {user?.role === 'admin' && (
          <button
            onClick={() => router.push('/admin')}
            className="btn btn-outline w-full sm:hidden"
          >
            <HiChartBar className="inline" /> Buka Dashboard Admin
          </button>
        )}
      </div>
    </div>
  );
}
