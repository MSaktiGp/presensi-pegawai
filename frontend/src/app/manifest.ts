import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sistem Presensi MPP Kota Jambi',
    short_name: 'Presensi MPP',
    description: 'Sistem Presensi Kehadiran Pegawai MPP Kota Jambi',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F7FA',
    theme_color: '#1B5E7D',
    icons: [
      {
        src: '/logo-mpp-no-text.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo-mpp-no-text.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
