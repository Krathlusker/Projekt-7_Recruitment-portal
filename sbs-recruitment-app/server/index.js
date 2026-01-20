// ==============================================
// SBS Recruitment App - Backend Server
// ==============================================

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { initDatabase, getDb } from './database.js';

// Load environment variables
dotenv.config({ path: '../.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HR_PASSWORD = process.env.HR_PASSWORD || 'sbs2026';

// Middleware
app.use(cors());
app.use(express.json());

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
    }
  }
});

// Authentication middleware for HR endpoints
const authenticateHR = (req, res, next) => {
  const authPassword = req.headers.authorization;
  if (authPassword !== HR_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ==============================================
// API Routes
// ==============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==============================================
// Applications
// ==============================================

// Submit new application
app.post('/api/apply', upload.single('cv'), (req, res) => {
  try {
    const db = getDb();
    const {
      fullName,
      phone,
      email,
      age,
      jobPosition,
      discResult,
      selectedSlots
    } = req.body;

    const id = uuidv4();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    const cvFileName = req.file ? req.file.filename : null;

    const stmt = db.prepare(`
      INSERT INTO applications (
        id, fullName, phone, email, age, jobPosition,
        cvFileName, discResult, selectedSlots, status,
        createdAt, updatedAt, expiresAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      fullName,
      phone,
      email,
      age,
      jobPosition,
      cvFileName,
      discResult,
      selectedSlots,
      'pending',
      now,
      now,
      expiresAt
    );

    res.status(201).json({
      id,
      message: 'Application submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Get all applications (HR only)
app.get('/api/applications', authenticateHR, (req, res) => {
  try {
    const db = getDb();
    const applications = db.prepare('SELECT * FROM applications ORDER BY createdAt DESC').all();

    // Parse JSON fields
    const parsed = applications.map(app => ({
      ...app,
      discResult: JSON.parse(app.discResult || '{}'),
      selectedSlots: JSON.parse(app.selectedSlots || '[]'),
      confirmedSlot: app.confirmedSlot ? JSON.parse(app.confirmedSlot) : null
    }));

    res.json(parsed);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get single application
app.get('/api/applications/:id', authenticateHR, (req, res) => {
  try {
    const db = getDb();
    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const parsed = {
      ...application,
      discResult: JSON.parse(application.discResult || '{}'),
      selectedSlots: JSON.parse(application.selectedSlots || '[]'),
      confirmedSlot: application.confirmedSlot ? JSON.parse(application.confirmedSlot) : null
    };

    res.json(parsed);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// Update application
app.patch('/api/applications/:id', authenticateHR, (req, res) => {
  try {
    const db = getDb();
    const { status, confirmedSlot } = req.body;
    const now = new Date().toISOString();

    let updateQuery = 'UPDATE applications SET updatedAt = ?';
    const params = [now];

    if (status) {
      updateQuery += ', status = ?';
      params.push(status);
    }

    if (confirmedSlot) {
      updateQuery += ', confirmedSlot = ?';
      params.push(JSON.stringify(confirmedSlot));
    }

    updateQuery += ' WHERE id = ?';
    params.push(req.params.id);

    const result = db.prepare(updateQuery).run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ message: 'Application updated successfully' });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// Delete application
app.delete('/api/applications/:id', authenticateHR, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// ==============================================
// Interview Slots
// ==============================================

// Get all interview slots
app.get('/api/interview-slots', (req, res) => {
  try {
    const db = getDb();
    const slots = db.prepare('SELECT * FROM interview_slots ORDER BY date, time').all();
    res.json(slots);
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ error: 'Failed to fetch interview slots' });
  }
});

// Create interview slot (HR only)
app.post('/api/interview-slots', authenticateHR, (req, res) => {
  try {
    const db = getDb();
    const { date, time, type } = req.body;
    const id = uuidv4();

    db.prepare(`
      INSERT INTO interview_slots (id, date, time, type, isBooked)
      VALUES (?, ?, ?, ?, 0)
    `).run(id, date, time, type);

    res.status(201).json({ id, message: 'Slot created successfully' });
  } catch (error) {
    console.error('Error creating slot:', error);
    res.status(500).json({ error: 'Failed to create interview slot' });
  }
});

// Confirm interview slot for application
app.post('/api/applications/:id/confirm-slot', (req, res) => {
  try {
    const db = getDb();
    const { slotId } = req.body;
    const applicationId = req.params.id;

    // Get the slot
    const slot = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(slotId);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    if (slot.isBooked) {
      return res.status(400).json({ error: 'Slot is already booked' });
    }

    // Update the slot
    db.prepare('UPDATE interview_slots SET isBooked = 1, bookedBy = ? WHERE id = ?')
      .run(applicationId, slotId);

    // Update the application
    const confirmedSlot = { ...slot, isBooked: true };
    db.prepare('UPDATE applications SET confirmedSlot = ?, status = ? WHERE id = ?')
      .run(JSON.stringify(confirmedSlot), 'interview-scheduled', applicationId);

    res.json({ message: 'Interview slot confirmed' });
  } catch (error) {
    console.error('Error confirming slot:', error);
    res.status(500).json({ error: 'Failed to confirm interview slot' });
  }
});

// ==============================================
// File Downloads
// ==============================================

// Download CV
app.get('/api/download-cv/:filename', authenticateHR, (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  res.download(filePath, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      res.status(404).json({ error: 'File not found' });
    }
  });
});

// ==============================================
// Server Initialization
// ==============================================

// Initialize database and start server
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`HR Password: ${HR_PASSWORD}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
