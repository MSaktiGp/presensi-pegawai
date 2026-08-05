'use client';

import { HiCheckCircle, HiExclamationTriangle, HiXCircle, HiArrowPath, HiClock } from 'react-icons/hi2';
import { ReactNode } from 'react';

interface StatusBadgeProps {
  status: string | null;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string; icon: ReactNode }> = {
  success: {
    label: 'Tepat Waktu',
    className: 'badge-success',
    icon: <HiCheckCircle />,
  },
  late: {
    label: 'Terlambat',
    className: 'badge-warning',
    icon: <HiExclamationTriangle />,
  },
  out_of_radius: {
    label: 'Diluar Radius',
    className: 'badge-danger',
    icon: <HiXCircle />,
  },
  failed: {
    label: 'Gagal',
    className: 'badge-danger',
    icon: <HiXCircle />,
  },
  duplicate: {
    label: 'Duplikat',
    className: 'badge-warning',
    icon: <HiArrowPath />,
  },
  outside_hours: {
    label: 'Diluar Jam',
    className: 'badge-warning',
    icon: <HiClock />,
  },
  pending: {
    label: 'Belum',
    className: 'badge-neutral',
    icon: <HiClock />,
  },
};

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  if (!status) {
    return <span className={`badge badge-neutral ${className}`}><HiClock /> Belum</span>;
  }

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`badge ${config.className} ${className}`}>
      {config.icon} {config.label}
    </span>
  );
}
