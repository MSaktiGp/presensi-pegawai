'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { getGreeting } from '@/lib/utils';
import { navFor } from '@/lib/permissions';
import { HiArrowRightOnRectangle } from 'react-icons/hi2';

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const hiddenPaths = ['/presensi', '/pilih-jadwal', '/riwayat-presensi'];
  if (!isAuthenticated || pathname === '/' || hiddenPaths.includes(pathname)) return null;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navItems = navFor(user?.role);
  const hasNav = navItems.length > 0;

  const go = (href: string) => {
    router.push(href);
    setMenuOpen(false);
  };

  const itemClass = (href: string) =>
    pathname === href ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10';

  return (
    <header className="w-full bg-primary-dark text-white shadow-lg relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 25px 25px, white 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 my-2 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left - Branding */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src="/LOGO-MPP-PUTIH.png"
              alt="Logo MPP"
              className="w-24 h-10 sm:w-24 sm:h-14 object-contain flex-shrink-0"
            />
          </div>

          {/* Right - User + Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop Navigation */}
            {hasNav && (
              <nav className="hidden lg:flex items-center gap-1 mr-2">
                {navItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => go(item.href)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${itemClass(item.href)}`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            )}

            {/* User info (desktop) */}
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-medium">{getGreeting()}, {user?.nama}</span>
              <span className="text-xs text-white/60">{user?.departemen}</span>
            </div>

            {/* Logout button (hidden on mobile if hasNav) */}
            <div className={hasNav ? 'hidden lg:flex' : 'flex'}>
              <button
                onClick={handleLogout}
                title="Logout"
                aria-label="Logout"
                className="btn bg-accent-gold text-primary-light text-xs sm:text-sm font-semibold rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center"
              >
                <HiArrowRightOnRectangle size={24} />
              </button>
            </div>

            {/* Hamburger menu (admin & superadmin) */}
            {hasNav && (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden flex flex-col gap-1 min-w-[44px] min-h-[44px] items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Menu navigasi"
                aria-expanded={menuOpen}
              >
                <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                <span className={`block w-5 h-0.5 bg-white transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {hasNav && menuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-white/15 animate-fade-in">
            {/* User info mobile */}
            {/* <div className="mb-3 px-1 md:hidden">
              <span className="text-sm font-medium">{getGreeting()}, {user?.nama}</span>
              <span className="block text-xs text-white/60">{user?.departemen}</span>
            </div> */}
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => go(item.href)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${itemClass(item.href)}`}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2.5 mt-1 rounded-lg text-sm font-medium transition-all text-white/70 hover:text-white hover:bg-white/10"
              >
                Logout
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
