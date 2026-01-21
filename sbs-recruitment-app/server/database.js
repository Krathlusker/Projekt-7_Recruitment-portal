// ==============================================
// SBS Recruitment App - Database Configuration
// ==============================================

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

// Initialize database
export const initDatabase = async () => {
  const dataDir = path.join(__dirname, 'data');
  const uploadsDir = path.join(__dirname, 'uploads');

  // Create directories if they don't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'sbs-recruitment.db');
  db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    -- Applications table
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      age TEXT NOT NULL,
      jobPosition TEXT NOT NULL,
      cvFileName TEXT,
      discResult TEXT,
      selectedSlots TEXT,
      confirmedSlot TEXT,
      status TEXT DEFAULT 'pending',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL
    );

    -- Interview slots table
    CREATE TABLE IF NOT EXISTS interview_slots (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      type TEXT NOT NULL,
      isBooked INTEGER DEFAULT 0,
      bookedBy TEXT,
      reservedBy TEXT,
      reservedAt TEXT,
      heldBy TEXT,
      FOREIGN KEY (bookedBy) REFERENCES applications(id) ON DELETE SET NULL,
      FOREIGN KEY (heldBy) REFERENCES applications(id) ON DELETE SET NULL
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_applications_createdAt ON applications(createdAt);
    CREATE INDEX IF NOT EXISTS idx_slots_date ON interview_slots(date);
    CREATE INDEX IF NOT EXISTS idx_slots_isBooked ON interview_slots(isBooked);
  `);

  // Migration: Add reservedBy and reservedAt columns if they don't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(interview_slots)").all();
    const columnNames = tableInfo.map(col => col.name);

    if (!columnNames.includes('reservedBy')) {
      db.exec('ALTER TABLE interview_slots ADD COLUMN reservedBy TEXT');
      console.log('Added reservedBy column to interview_slots');
    }
    if (!columnNames.includes('reservedAt')) {
      db.exec('ALTER TABLE interview_slots ADD COLUMN reservedAt TEXT');
      console.log('Added reservedAt column to interview_slots');
    }
    if (!columnNames.includes('heldBy')) {
      db.exec('ALTER TABLE interview_slots ADD COLUMN heldBy TEXT');
      console.log('Added heldBy column to interview_slots');
    }
  } catch (migrationError) {
    console.error('Migration error:', migrationError);
  }

  // Seed some initial interview slots if table is empty
  const slotsCount = db.prepare('SELECT COUNT(*) as count FROM interview_slots').get();
  if (slotsCount.count === 0) {
    seedInterviewSlots();
  }

  console.log('Database initialized successfully');
  return db;
};

// Seed initial interview slots
const seedInterviewSlots = () => {
  const slots = [
    // Week 1
    { date: '2024-04-22', time: '08:30', type: 'fysisk' },
    { date: '2024-04-22', time: '09:30', type: 'virtuel' },
    { date: '2024-04-22', time: '10:30', type: 'fysisk' },
    { date: '2024-04-22', time: '13:30', type: 'fysisk' },
    { date: '2024-04-22', time: '15:30', type: 'virtuel' },
    { date: '2024-04-23', time: '08:30', type: 'fysisk' },
    { date: '2024-04-23', time: '10:30', type: 'virtuel' },
    { date: '2024-04-23', time: '14:30', type: 'fysisk' },
    { date: '2024-04-24', time: '09:00', type: 'fysisk' },
    { date: '2024-04-24', time: '11:00', type: 'virtuel' },
    { date: '2024-04-24', time: '13:00', type: 'fysisk' },
    // Week 2
    { date: '2024-04-29', time: '08:30', type: 'fysisk' },
    { date: '2024-04-29', time: '10:30', type: 'virtuel' },
    { date: '2024-04-29', time: '13:30', type: 'fysisk' },
    { date: '2024-04-30', time: '09:00', type: 'fysisk' },
    { date: '2024-04-30', time: '11:00', type: 'virtuel' },
    { date: '2024-04-30', time: '15:00', type: 'fysisk' }
  ];

  const stmt = db.prepare(`
    INSERT INTO interview_slots (id, date, time, type, isBooked)
    VALUES (?, ?, ?, ?, 0)
  `);

  let counter = 0;
  for (const slot of slots) {
    counter++;
    const id = `slot-${Date.now()}-${counter}`;
    stmt.run(id, slot.date, slot.time, slot.type);
  }

  console.log(`Seeded ${slots.length} interview slots`);
};

// Get database instance
export const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

// Close database
export const closeDb = () => {
  if (db) {
    db.close();
    db = null;
  }
};
