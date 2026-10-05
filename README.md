# FitC untuk Netlify

Paket ini memuat halaman leaderboard dan Netlify Function. Google Sheets tetap menjadi database; Apps Script tetap menghitung skor. Tidak memakai iframe. Tidak perlu npm install untuk menjalankan server lokal dan pengujian (Node.js 22+).

## 1. Perbarui Apps Script terlebih dahulu

Salin seluruh isi apps-script/Web.gs yang disertakan dalam paket ini ke Web.gs pada editor Google Apps Script, lalu simpan. File Scoring.gs, Database.gs, Editor.gs dan Leaderboard.html tetap digunakan.

Pilih Deploy > Manage deployments > pilih deployment aktif > Edit > Version: New version > Deploy.
Gunakan Execute as: Me dan Who has access: Anyone seperti deployment yang sudah berhasil diuji.
Salin Web app URL yang berakhiran /exec, tanpa /u/1/.

Uji URL dengan menambahkan ?action=leaderboard di belakang /exec dalam Incognito.
Hasil yang diharapkan adalah JSON dengan "ok":true dan "data", bukan halaman HTML.
Jika "ok":false, cek konfigurasi spreadsheet dan hasil perhitungan. Jalankan configureLeaderboard jika belum dikonfigurasi, serta recalculateFitC untuk memperbarui LBHasil.

Endpoint hanya menyediakan data leaderboard yang sebelumnya sudah ditampilkan ke karyawan. Tidak mengirim berat, BMI aktual, atau Employee ID.

## 2. Coba lokal

Buka terminal di folder netlify-fitc:
    Copy-Item .env.example .env
Edit FITC_APPS_SCRIPT_URL dalam .env bila URL deployment berubah.
    npm start
Buka http://127.0.0.1:8888.
Jika membuka index.html dengan klik dua kali, API tidak berjalan; gunakan server di atas.

Tes:
    npm test

## 3. Deploy Netlify melalui GitHub

Buat repository GitHub dan unggah HANYA isi folder netlify-fitc.
netlify.toml, package.json, public dan netlify harus berada di akar repository.
Jangan unggah folder project utama atau workbook karyawan. .env.example boleh diunggah; .env tidak.

Di Netlify, pilih Add new project / Import an existing project, sambungkan GitHub dan pilih repository tersebut.
Pengaturan:
- Base directory: kosong.
- Build command: kosong.
- Publish directory: public.
- Functions directory: netlify/functions (sudah diatur oleh netlify.toml).

Tambahkan environment variable pada pengaturan project:
- Key: FITC_APPS_SCRIPT_URL
- Value: URL deployment Apps Script /exec terbaru (contoh tersedia di .env.example).
- Jika terdapat pilihan scope, sertakan Functions.

Deploy project. Jika variable ditambahkan setelah deploy, jalankan deploy ulang.
Buka https://NAMA-SITUS.netlify.app/api/leaderboard terlebih dahulu: harus menampilkan JSON "ok":true.
Lalu buka halaman utama https://NAMA-SITUS.netlify.app.

Jangan hanya drag-and-drop folder public atau ZIP ke Netlify Drop: paket ini memerlukan deployment Functions juga. Gunakan alur GitHub di atas.

## Pemakaian

Admin tetap menginput data di Google Sheets dan menjalankan recalculateFitC.
Tombol Muat ulang membaca hasil perhitungan terakhir, bukan menghitung ulang.
Respons skor dapat tersimpan di cache server hingga 60 detik.
Website ini tetap dapat dilihat siapa pun yang memiliki URL; belum ada login khusus karyawan.
URL Apps Script disimpan di environment server, tetapi bukan kata sandi atau pengganti pembatasan akses.

Jika tampilan terbuka tetapi skor gagal:
- HTTP 503: periksa FITC_APPS_SCRIPT_URL dan deploy ulang.
- HTTP 502: periksa endpoint Apps Script ?action=leaderboard, deployment versi terbaru, akses Anyone, dan LBHasil.
- HTTP 404 di /api/leaderboard: pastikan netlify.toml dan direktori Functions ikut deploy.
Jika endpoint masih mengembalikan HTML, Web.gs terbaru belum diterapkan pada deployment tersebut.

Dokumentasi:
https://docs.netlify.com/build/functions/overview/
https://developers.google.com/apps-script/guides/content

