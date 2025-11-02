# Build Instructions

## ⚠️ PENTING: Frontend-Only Deployment

**Project ini adalah Frontend-Only:**
- **Frontend:** Next.js (ini yang di-deploy)
- **Backend:** Laravel (terpisah, di folder `backend/`, harus sudah running di server lain atau domain lain)

**Konsep Deployment:**
- Next.js **hanya frontend** yang akan call API ke backend Laravel
- Backend Laravel **TIDAK** ikut di-deploy bersama frontend
- Frontend memanggil API backend via `NEXT_PUBLIC_API_URL`
- Pastikan backend Laravel **sudah running** dan **accessible** sebelum build frontend

## Console Log Removal

Build production Next.js **otomatis menghapus semua console.log** dari code production. Konfigurasi sudah ditambahkan di `next.config.ts`:
- `console.log`, `console.debug`, `console.info` akan dihapus
- `console.error` dan `console.warn` tetap dipertahankan untuk debugging production

## API URL Configuration

### Development (Lokal)
Default API URL sudah di-set ke `http://127.0.0.1:8000/api` di `next.config.ts`.

**Catatan:** Pastikan backend Laravel sudah running di port 8000 sebelum development.

### Production Build

Untuk build production dengan API URL dinamis, gunakan environment variable:

#### Windows (PowerShell):
```powershell
$env:NEXT_PUBLIC_API_URL="https://your-api-domain.com/api"; npm run build:prod
```

#### Windows (Command Prompt):
```cmd
set NEXT_PUBLIC_API_URL=https://your-api-domain.com/api && npm run build:prod
```

#### Linux/Mac:
```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api npm run build:prod
```

### Alternatif: Buat File .env.local

Buat file `.env.local` di root project (untuk local development):
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

Atau `.env.production` untuk production:
```
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
```

Lalu build dengan:
```bash
npm run build:prod
```

### Cara Pakai di Server Production

1. **Set environment variable sebelum build:**
   ```bash
   export NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
   npm run build:prod
   ```

2. **Atau gunakan .env.production:**
   - Buat file `.env.production` di root project
   - Isi dengan: `NEXT_PUBLIC_API_URL=https://your-api-domain.com/api`
   - Run: `npm run build:prod`

3. **Start production server:**
   ```bash
   npm start
   ```

### Cara Deploy ke VPS

**Arsitektur Deployment:**
```
Internet 
   ↓
Nginx (port 80/443)
   ↓
Next.js Frontend (localhost:3800)
```

**Cara Deploy:**

1. **Upload project ke VPS** (jangan upload `.next/`, `node_modules/`, `.git`)
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set environment variable** dan **build:**
   ```bash
   # PASTIKAN BACKEND LARAVEL SUDAH RUNNING DAN ACCESSIBLE!
   # Ganti dengan URL backend Laravel yang sudah di-deploy
   export NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
   # atau jika backend di domain sama tapi beda path:
   # export NEXT_PUBLIC_API_URL=https://your-domain.com/api
   npm run build:prod
   ```
   
   **PENTING:** 
   - Environment variable ini **harus di-set sebelum build** karena Next.js embed ke bundle saat build time. Setelah build, tidak bisa diubah tanpa rebuild.
   - **Pastikan backend Laravel sudah running** dan URL API sudah benar sebelum build!
4. **Start production server:**
   ```bash
   npm start
   ```
5. **Setup PM2** (recommended untuk production):
   
   **Install PM2:**
   ```bash
   sudo npm install -g pm2
   ```
   
   **Start Next.js dengan PM2:**
   ```bash
   pm2 start npm --name "newemp" -- start
   ```
   
   **Setup PM2 auto-start setelah reboot:**
   ```bash
   pm2 save
   pm2 startup
   # Jalankan command yang muncul (biasanya sudo env PATH=...)
   ```
   
   **PM2 Commands:**
   ```bash
   pm2 list              # Lihat proses yang running
   pm2 logs newemp       # Lihat logs
   pm2 restart newemp    # Restart aplikasi
   pm2 stop newemp       # Stop aplikasi
   pm2 delete newemp     # Hapus dari PM2
   ```
   
   **Alternatif dengan systemd** (kalau tidak pakai PM2):
   
   **Cara mudah:** Kalau sudah punya systemd untuk Node.js app lain, tinggal edit file yang sudah ada:
   ```bash
   sudo nano /etc/systemd/system/newemp.service
   # atau edit file service yang sudah ada
   ```
   
   ```ini
   [Unit]
   Description=Next.js NewEmp App
   After=network.target
   
   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/empkanwil
   ExecStart=/usr/bin/npm start
   Restart=always
   RestartSec=10
   Environment=NODE_ENV=production
   
   [Install]
   WantedBy=multi-user.target
   ```
   
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart newemp
   sudo systemctl status newemp
   ```
   
   **Perbedaan dengan JS biasa:**
   - JS biasa: `ExecStart=node server.js` atau `ExecStart=node app.js`
   - Next.js: `ExecStart=/usr/bin/npm start` (next start)
   - WorkingDirectory harus di root project (bukan di folder `dist` atau `build`)
6. **Setup Nginx reverse proxy** (penting untuk HTTPS):
   
   **Next.js berbeda dengan static HTML!** Nginx tidak pointing ke folder, tapi ke **process Node.js** yang berjalan di port 3800.
   
   Buat file `/etc/nginx/sites-available/newemp`:
   ```nginx
   server {
       listen 80;
       sdm.rivaldev.site;
       
       # Proxy all requests ke Next.js process di localhost:3800
       location / {
           proxy_pass http://localhost:3800;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
       
       # Optional: serve static files directly dari .next/static untuk performance
       location /_next/static {
           alias /var/www/empkanwil/.next/static;
           add_header Cache-Control "public, max-age=31536000, immutable";
       }
   }
   ```
   
   Enable dan restart:
   ```bash
   sudo ln -s /etc/nginx/sites-available/newemp /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## Catatan Penting

### Perbedaan Next.js vs Static JS/HTML:

| Aspek | Static HTML/JS | Next.js |
|-------|----------------|---------|
| Build output | `dist/` folder | `.next/` folder |
| Server | Web server (Nginx/Apache) | Node.js process |
| Nginx pointing | `root /var/www/html/dist;` | `proxy_pass http://localhost:3800;` |
| Cara jalankan | Web server auto serve | Harus run `npm start` |
| Type | Static files | Dynamic app |

### Poin Penting:

- **Frontend-Only:** Next.js ini hanya frontend, backend Laravel terpisah
- Next.js tidak punya folder `dist/` seperti JS biasa
- Build output ada di `.next/` yang sudah di-generate setelah `npm run build`
- Nginx **TIDAK** pointing ke folder, tapi **proxy ke process Node.js** di port 3800
- Next.js adalah **Node.js application** yang harus **running** (dengan PM2 atau systemd)
- `NEXT_PUBLIC_API_URL` harus di-set **sebelum** build karena Next.js embed environment variables ke bundle saat build time
- Setelah build, tidak bisa mengubah API URL tanpa rebuild
- **Pastikan backend Laravel sudah running dan accessible** sebelum build production
- **Pastikan URL API sudah benar** sebelum build production
- Wajib setup PM2 atau systemd service agar Next.js auto-restart kalau crash

