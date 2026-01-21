# SBS Recruitment Portal

## Projektbeskrivelse

### START SYSTEM MED npm run dev:all

Rekrutteringsportal for SBS Friction A/S. Portalen består af:

1. **Landing Page** - Offentlig side hvor ansøgere kan se ledige stillinger og ansøge
2. **Ansøgningsmodal** - Multi-step formular med DISC personlighedstest
3. **HR Dashboard** - Password-beskyttet administrationsside for håndtering af ansøgninger

## Teknisk Stack

### Frontend
- **Framework:** Vue 3 med TypeScript
- **UI Bibliotek:** Element Plus (https://element-plus.org/en-US/component/overview)
- **Styling:** SCSS med BEM metodologi
- **Build Tool:** Vite

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQLite3
- **Authentication:** Password via .env (HR_PASSWORD)

## Design Specifikationer

### Farver
- **Mørkegrå:** #2D2D2D
- **Hvid:** #FFFFFF
- **Rød (CTA):** #EE3123
- **Lysegrå:** #EBEBEB
- **Gul:** #F1DB53

### Typografi
- **Titler:** Neo Sans W1G Medium, 36px
- **Undertitler:** Neo Sans W1G Regular, 24px
- **Brødtekst:** Helvetica Neue LT Pro 55 Roman, 12px
- **Links/Bold:** Helvetica Neue LT Pro 75 Bold

### Effekter
- **Modal Shadow:** 0px 0px 15px 5px rgba(0,0,0,0.25)

## DISC Personlighedstest

### Scoring System
- **Ønskede profiler:** S (Stabil) og C (Conscientious) - giver flest point
- **Ikke-ønskede profiler:** D (Dominant) og I (Influent) - giver færre point
- **Kvalificeret:** 11+ point ud af 15 mulige
- **Ikke kvalificeret:** Under 11 point

### 5 Spørgsmål med DISC-scoring
Hver af de 4 svarmuligheder per spørgsmål mapper til D, I, S eller C profilen.

## API Endpoints

### Ansøgninger
- `POST /api/apply` - Indsend ny ansøgning med CV upload
- `GET /api/applications` - Hent alle ansøgninger (kræver auth)
- `GET /api/applications/:id` - Hent enkelt ansøgning
- `PATCH /api/applications/:id` - Opdater status/data
- `DELETE /api/applications/:id` - Slet ansøgning

### Interview Slots
- `GET /api/interview-slots` - Hent tilgængelige tider
- `POST /api/applications/:id/confirm-slot` - Bekræft interviewtid

### Filer
- `GET /api/download-cv/:filename` - Download CV

---

## Versionslog

### v0.1.0 - Initial Setup (Faerdig)
- [x] Projektstruktur oprettet
- [x] Vue 3 + Vite konfigureret
- [x] Element Plus installeret
- [x] SCSS design system oprettet
- [x] Basis routing konfigureret

### v0.2.0 - Landing Page (Faerdig)
- [x] Header med SBS logo
- [x] Hero section med video placeholder
- [x] Job kort (Pakkeriet, Produktion, Andre stillinger)
- [x] Fordele sektion (8 benefits med ikoner)
- [x] Footer med kontakt og sociale medier
- [x] "ANSOG NU" floating knap

### v0.3.0 - Ansgningsmodal (Faerdig)
- [x] Step 1: Personlige oplysninger (navn, telefon, email, alder, job, CV)
- [x] Step 2: DISC quiz (5 sporgsmal)
- [x] Step 3: Dato valg (for kvalificerede)
- [x] Step 4: Bekraftelse/Afvisning
- [x] Stepper komponent
- [x] Validering

### v0.4.0 - HR Dashboard (Faerdig)
- [x] Login side med password
- [x] Statistik kort
- [x] Kommende samtaler oversigt
- [x] Ansgningsliste med filter og pagination
- [x] Status opdatering
- [x] Download CV funktion

### v0.5.0 - Backend (Faerdig)
- [x] Express server setup
- [x] SQLite3 database schema
- [x] API endpoints implementering
- [x] File upload (multer)
- [ ] Email notifikationer (nodemailer) - valgfrit

---

## Projektstruktur

```
sbs-recruitment-app/
├── PROJECT.md
├── .env.example
├── package.json
├── vite.config.ts
├── tsconfig.json
│
├── public/
│   └── favicon.ico
│
├── src/
│   ├── App.vue
│   ├── main.ts
│   │
│   ├── assets/
│   │   ├── logo.svg
│   │   ├── scss/
│   │   │   ├── _variables.scss
│   │   │   ├── _mixins.scss
│   │   │   └── main.scss
│   │
│   ├── components/
│   │   ├── ApplicationModal.vue
│   │   ├── FloatingApplyButton.vue
│   │   ├── JobCard.vue
│   │   ├── StepIndicator.vue
│   │   └── ...
│   │
│   ├── views/
│   │   ├── LandingPage.vue
│   │   └── HRDashboard.vue
│   │
│   ├── router/
│   │   └── index.ts
│   │
│   ├── config/
│   │   └── api.ts
│   │
│   └── types/
│       └── index.ts
│
└── server/
    ├── package.json
    ├── index.js
    ├── database.js
    └── data/
        └── sbs-recruitment.db
```

---

## Regler og Retningslinjer

1. **Ingen emojis/smileys** i UI
2. **Kun Element Plus** komponenter bruges
3. **BEM naming convention** for alle CSS klasser
4. **HR Dashboard** er password-beskyttet via .env
5. **DISC scoring** favoriserer S og C profiler

---

*Sidst opdateret: $(date)*
