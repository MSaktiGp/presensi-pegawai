'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { getGreeting } from '@/lib/utils';

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

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
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src="/LOGO-DPMPTSP-GOLD.png"
              alt="Logo MPP DPMPTSP"
              className="w-10 h-10 sm:w-14 sm:h-14 object-contain flex-shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl font-bold tracking-tight leading-tight">
                Sistem Presensi
              </h1>
              <p className="text-[10px] sm:text-sm text-white/70 leading-tight">
                DPMPTSP Kota Jambi
              </p>
            </div>
          </div>

          {/* Right - User + Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop Navigation */}
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

            {/* User info (desktop) */}
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-medium">{getGreeting()}, {user?.nama}</span>
              <span className="text-xs text-white/60">{user?.departemen}</span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="btn bg-accent-gold text-primary-dark px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg hover:brightness-110 active:scale-95 transition-all"
            >
              Logout
            </button>

            {/* Hamburger menu (mobile, admin only) */}
            {isAdmin && (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="sm:hidden flex flex-col gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Menu navigasi"
              >
                <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                <span className={`block w-5 h-0.5 bg-white transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Mobile dropdown menu (admin only) */}
        {isAdmin && menuOpen && (
          <div className="sm:hidden mt-3 pt-3 border-t border-white/15 animate-fade-in">
            {/* User info mobile */}
            <div className="mb-3 px-1">
              <span className="text-sm font-medium">{getGreeting()}, {user?.nama}</span>
              <span className="block text-xs text-white/60">{user?.departemen}</span>
            </div>
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => { router.push('/presensi'); setMenuOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  pathname === '/presensi' 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                📋 Presensi
              </button>
              <button
                onClick={() => { router.push('/admin'); setMenuOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  pathname === '/admin' 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                📊 Dashboard Admin
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
