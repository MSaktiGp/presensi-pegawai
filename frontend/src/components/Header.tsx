'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { getGreeting } from '@/lib/utils';

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!isAuthenticated || pathname === '/') return null;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <header className="w-full bg-primary-dark text-white shadow-lg relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 25px 25px, white 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left - Branding */}
          <div className="flex items-center gap-3">
            <img
              src="/LOGO-DPMPTSP-GOLD.png"
              alt="Logo MPP DPMPTSP"
              className="w-14 h-14 object-contain"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                Sistem Presensi
              </h1>
              <p className="text-xs sm:text-sm text-white/70 hidden sm:block">
                DPMPTSP Kota Jambi
              </p>
            </div>
          </div>

          {/* Right - User + Actions */}
          <div className="flex items-center gap-3">
            {/* Navigation */}
            {isAdmin && (
              <nav className="hidden sm:flex items-center gap-1 mr-2">
                <button
                  onClick={() => router.push('/presensi')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    pathname === '/presensi' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Presensi
                </button>
                <button
                  onClick={() => router.push('/admin')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    pathname === '/admin' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Dashboard
                </button>
              </nav>
            )}

            {/* User info */}
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-medium">{getGreeting()}, {user?.nama}</span>
              <span className="text-xs text-white/60">{user?.departemen}</span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="btn bg-accent-gold text-primary-dark px-4 py-2 text-sm font-semibold rounded-lg hover:brightness-110 active:scale-95 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
