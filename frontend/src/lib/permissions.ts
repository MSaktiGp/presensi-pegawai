'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export type Role = 'pegawai_gerai' | 'satpam' | 'cs' | 'admin' | 'superadmin';

export const ADMIN_ROLES: Role[] = ['admin', 'superadmin'];
export const PETUGAS_ROLES: Role[] = ['pegawai_gerai', 'satpam', 'cs'];

export interface NavItem {
  href: string;
  label: string;
  roles: Role[];
}

/** Single source of truth: which menu each role sees AND which page each role may open. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', roles: ADMIN_ROLES },
  { href: '/admin/rekap', label: 'Rekap Presensi', roles: ADMIN_ROLES },
  { href: '/superadmin/petugas', label: 'Manajemen Petugas', roles: ['superadmin'] },
  { href: '/superadmin/jadwal', label: 'Kelola Jadwal', roles: ['superadmin'] },
];

export const navFor = (role?: string) => NAV_ITEMS.filter((i) => i.roles.includes(role as Role));

export const homeFor = (role?: string) => (ADMIN_ROLES.includes(role as Role) ? '/admin' : '/presensi');

/**
 * Redirects away when the logged-in user's role is not allowed.
 * Returns true once the user is confirmed allowed (render page content only then).
 */
export function useRoleGuard(allowed: Role[]) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const ok = isAuthenticated && allowed.includes(user?.role as Role);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace('/');
    else if (!ok) router.replace(homeFor(user?.role));
  }, [isLoading, isAuthenticated, ok, user?.role, router]);

  return !isLoading && ok;
}
