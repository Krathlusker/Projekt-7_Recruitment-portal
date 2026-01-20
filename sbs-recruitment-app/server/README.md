# SBS Recruitment App - Server README

## Oversigt

Node.js backend server til SBS Recruitment Portal.

## Teknologier

- **Express.js** - Web framework
- **better-sqlite3** - SQLite database
- **multer** - Filupload
- **nodemailer** - Email afsendelse (valgfrit)
- **uuid** - Unikke ID'er

## Installation

```bash
cd server
npm install
```

## Konfiguration

Opret en `.env` fil i rod-mappen med folgende:

```
PORT=3000
HR_PASSWORD=din_adgangskode
```

## Start Server

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

### Ansgninger

| Metode | Endpoint | Beskrivelse | Auth |
|--------|----------|-------------|------|
| POST | `/api/apply` | Indsend ansgning | Nej |
| GET | `/api/applications` | Hent alle ansgninger | Ja |
| GET | `/api/applications/:id` | Hent enkelt ansgning | Ja |
| PATCH | `/api/applications/:id` | Opdater ansgning | Ja |
| DELETE | `/api/applications/:id` | Slet ansgning | Ja |

### Interview Slots

| Metode | Endpoint | Beskrivelse | Auth |
|--------|----------|-------------|------|
| GET | `/api/interview-slots` | Hent alle tider | Nej |
| POST | `/api/interview-slots` | Opret ny tid | Ja |
| POST | `/api/applications/:id/confirm-slot` | Bekraft tid | Nej |

### Filer

| Metode | Endpoint | Beskrivelse | Auth |
|--------|----------|-------------|------|
| GET | `/api/download-cv/:filename` | Download CV | Ja |

## Authentication

HR endpoints kraver `Authorization` header med password:

```
Authorization: din_adgangskode
```

## Database

SQLite database gemmes i `server/data/sbs-recruitment.db`.

Tabeller:
- `applications` - Ansgninger
- `interview_slots` - Interviewtider
