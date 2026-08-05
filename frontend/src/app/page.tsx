'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { HiExclamationTriangle, HiEye, HiEyeSlash } from 'react-icons/hi2';

export default function LoginPage() {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (user?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/presensi');
      }
    }
  }, [isAuthenticated, authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(nip, password);

    if (result.success) {
      // AuthContext will update, useEffect will handle redirect
    } else {
      setError(result.message);
    }

    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-gray-light)]">
        <div className="spinner !w-10 !h-10" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[var(--primary-dark)] via-[#1a6f96] to-[var(--primary-medium)] relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-[var(--accent-gold)]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/3 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-md animate-slide-up">
          {/* Branding Header */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/20 p-3">
              <img
                src="/LOGO-DPMPTSP-GOLD.png"
                alt="Logo MPP DPMPTSP Kota Jambi"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Sistem Presensi
            </h1>
            <p className="text-white/70 mt-2 text-base">
              DPMPTSP Kota Jambi
            </p>
            <div className="w-12 h-1 bg-[var(--accent-gold)] mx-auto mt-3 rounded-full" />
          </div>

          {/* Login Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/30">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[var(--primary-dark)]">
                Masuk ke Akun Anda
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Gunakan NIP dan password untuk login
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-accent-red-light border border-accent-red/20 rounded-xl animate-fade-in" id="login-error">
                <p className="text-sm text-accent-red font-medium flex items-center gap-2">
                  <span><HiExclamationTriangle className="inline" /></span> {error}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* NIP */}
              <div>
                <label htmlFor="nip" className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
                  Nomor Induk Pegawai (NIP)
                </label>
                <div className="relative">
                  <input
                    id="nip"
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Masukkan NIP"
                    className="input pl-11"
                    required
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="input pl-11 pr-12"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors text-sm"
                  >
                    {showPassword ? <HiEyeSlash /> : <HiEye />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !nip || !password}
                className="btn btn-primary w-full py-3.5 text-base mt-2"
                id="btn-login"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="spinner !w-5 !h-5 !border-white !border-t-transparent" />
                    Memproses...
                  </span>
                ) : (
                  'Masuk'
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-white/40 text-xs mt-6">
            © {new Date().getFullYear()} DPMPTSP Kota Jambi — Sistem Presensi Kehadiran
          </p>
        </div>
      </div>
    </div>
  );
}
