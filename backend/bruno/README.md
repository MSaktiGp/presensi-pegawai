# Koleksi API Bruno — Sistem Presensi MPP Kota Jambi

Koleksi API ini digunakan untuk pengujian fungsional dan keamanan endpoint backend Sistem Presensi DPMPTSP (MPP) Kota Jambi menggunakan **Bruno** (menggantikan Postman).

---

## 🚀 Cara Menggunakan Koleksi di Bruno

### 1. Menggunakan Bruno Desktop Application
1. Unduh dan pasang [Bruno App](https://www.usebruno.com/).
2. Buka Bruno, pilih **Open Collection**.
3. Navigasikan ke direktori: `backend/bruno/`.
4. Pilih environment di pojok kanan atas:
   - `local` (untuk pengujian ke `http://localhost:5000`)
   - `production` (untuk pengujian ke server deployed)

### 2. Menggunakan Bruno CLI (`bru`)
```bash
# Pasang Bruno CLI secara global (jika belum)
npm install -g @usebruno/cli

# Jalankan seluruh pengujian secara otomatis
cd backend/bruno
bru run --env local
```

---

## 📋 Pemetaan Skenario Pengujian (BAB 4)

| No | Modul / Fitur yang Diuji | File Request di Bruno | Skenario & Ekspektasi | Status |
|:---|:---|:---|:---|:---|
| 1 | **Autentikasi Login** (`/api/auth/login`) | `Auth/Login.bru`<br>`Auth/Login - Invalid Credentials.bru` | Validasi kredensial valid menghasilkan JWT token yang otomatis tersimpan di variable `{{TOKEN}}`; kredensial salah ditolak (HTTP 401). | ✅ Sesuai (Valid) |
| 2 | **Validasi Radius Lokasi (Geofencing)** | `Attendance/Checkin.bru`<br>`Attendance/Checkin - Out of Radius.bru` | Koordinat dalam radius (<40m) diterima; koordinat di luar radius (>40m) ditolak dengan pesan peringatan radius (HTTP 400). | ✅ Sesuai (Valid) |
| 3 | **Akuisisi Kamera & Kompresi Foto** | `Attendance/Checkin.bru`<br>`Attendance/Checkout.bru` | Payload foto berbasis base64 diterima, dikompresi di server, dan tautan/path foto tersimpan pada record presensi. | ✅ Sesuai (Valid) |
| 4 | **Status Terlambat & Shift Lintas Malam** | `Attendance/Today Status.bru`<br>`Superadmin/Shift/Create Shift.bru` | Status kehadiran mengevaluasi `late_threshold_minutes`, dan shift lintas malam (`is_cross_midnight: true`) dievaluasi hingga hari berikutnya. | ✅ Sesuai (Valid) |
| 5 | **Penyaringan Laporan Rekapitulasi (Admin)** | `Admin/Attendance Report.bru`<br>`Admin/Monthly Report.bru`<br>`Admin/Monthly Chart.bru`<br>`Admin/Attempt Logs.bru` | Data rekapitulasi harian/bulanan dapat difilter berdasarkan tanggal, user type, dan departemen. | ✅ Sesuai (Valid) |
| 6 | **Manajemen Pengguna & Jadwal (Superadmin)** | `Superadmin/Gerai/*`<br>`Superadmin/Pegawai/*`<br>`Superadmin/Shift/*` | CRUD Gerai, Pegawai, Penetapan Shift, dan Reset Password tervalidasi dengan Zod schema. | ✅ Sesuai (Valid) |

---

## 🔐 Struktur Token & Otomatisasi
- Request `Auth/Login.bru` memiliki script `post-response` yang secara otomatis mengekstrak token dari respons server dan memperbarui variabel environment `TOKEN`.
- Seluruh endpoint yang membutuhkan autentikasi dikonfigurasikan dengan header `Authorization: Bearer {{TOKEN}}`.
