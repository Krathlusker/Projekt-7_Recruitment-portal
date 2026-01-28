# SBS Recruitment App - Deployment Guide

## Quick Start (Produktion)

### 1. Installer dependencies
```bash
npm install
cd server && npm install && cd ..
```

### 2. Konfigurer miljøvariabler
```bash
cp .env.example .env
nano .env  # Rediger HR_PASSWORD og andre indstillinger
```

### 3. Byg og start (én kommando)
```bash
# Linux/Mac
npm run prod

# Windows
npm run prod:win
```

Appen er nu tilgængelig på `http://din-server-ip:3000`

---

## cPanel Deployment

### Metode 1: Node.js Application (anbefalet)

1. **Upload filer** til din cPanel-konto via File Manager eller FTP

2. **Opret Node.js Application** i cPanel:
   - Gå til "Setup Node.js App"
   - Klik "Create Application"
   - Vælg Node.js version (18+ anbefalet)
   - Sæt Application root: `/path/to/sbs-recruitment-app`
   - Application URL: Din ønskede URL
   - Application startup file: `server/index.js`
   - Environment: Production

3. **Installer dependencies**:
   - Klik "Run NPM Install" i cPanel
   - Eller via SSH: `source /home/username/nodevenv/sbs-recruitment-app/18/bin/activate && npm install`

4. **Byg frontend**:
   ```bash
   npm run build
   ```

5. **Start appen** via cPanel eller:
   ```bash
   npm run start
   ```

### Metode 2: PM2 Process Manager

PM2 er anbefalet for produktion da den håndterer crashes, logs og restarts.

```bash
# Installer PM2 globalt
npm install -g pm2

# Start appen med PM2
pm2 start server/index.js --name "sbs-recruitment" --env production

# Gem PM2 config så den starter ved reboot
pm2 save
pm2 startup
```

**Vigtige PM2 kommandoer:**
```bash
pm2 status          # Se status
pm2 logs            # Se logs (begge services)
pm2 restart all     # Genstart
pm2 stop all        # Stop
```

---

## Konfiguration

### Miljøvariabler (.env)

```env
# Server port (standard: 3000)
PORT=3000

# Host (0.0.0.0 for netværksadgang)
HOST=0.0.0.0

# HR Dashboard adgangskode
HR_PASSWORD=dit_sikre_password

# Environment
NODE_ENV=production
```

### Firewall

Åbn port 3000 (eller din valgte port):
```bash
sudo ufw allow 3000
```

---

## Arkitektur (Produktion)

```
┌─────────────────────────────────────────────┐
│                 Browser                      │
└─────────────────┬───────────────────────────┘
                  │ HTTP/HTTPS
                  ▼
┌─────────────────────────────────────────────┐
│          Node.js Server (Express)           │
│              port 3000                       │
├─────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────────────┐  │
│  │ Static Files│   │   API Routes        │  │
│  │ (Vue Build) │   │   /api/*            │  │
│  │   /dist     │   └──────────┬──────────┘  │
│  └─────────────┘              │             │
│                               ▼             │
│                    ┌─────────────────────┐  │
│                    │  SQLite Database    │  │
│                    │  server/data/db.sqlite │
│                    └─────────────────────┘  │
└─────────────────────────────────────────────┘
```

I produktion:
- **Én Node.js process** håndterer alt
- Frontend serveres som statiske filer fra `/dist`
- API endpoints under `/api/*`
- SQLite database i `server/data/`

---

## Scripts

| Kommando | Beskrivelse |
|----------|-------------|
| `npm run dev:all` | Start development (frontend + backend, hot reload) |
| `npm run build` | Byg frontend til produktion |
| `npm run prod` | Byg + start produktion (Linux/Mac) |
| `npm run prod:win` | Byg + start produktion (Windows) |
| `npm run start` | Start kun backend (kræver bygget frontend) |

---

## Fejlfinding

### CORS fejl
I produktion bør der ikke være CORS problemer da frontend og backend kører på samme origin.

### Database fejl
```bash
# Slet database og genstart for at nulstille
rm server/data/db.sqlite
npm run start
```

### Port i brug
```bash
# Find process på port 3000
lsof -i :3000  # Linux/Mac
netstat -ano | findstr :3000  # Windows

# Dræb process
kill -9 <PID>
```

---

## Sikkerhed

1. **Skift HR_PASSWORD** fra default
2. **Brug HTTPS** via reverse proxy (nginx/Apache)
3. **Firewall** - begræns adgang til nødvendige porte
4. **Backup** - kopier `server/data/` regelmæssigt
