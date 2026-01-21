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

    // Mark selected slots as "held" by this application
    const slotsArray = JSON.parse(selectedSlots || '[]');
    if (slotsArray.length > 0) {
      const holdStmt = db.prepare('UPDATE interview_slots SET heldBy = ?, reservedBy = NULL, reservedAt = NULL WHERE id = ?');
      for (const slotId of slotsArray) {
        holdStmt.run(id, slotId);
      }
    }

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
      // If confirmedSlot is a string (slot ID), fetch the slot info
      let slotData = confirmedSlot;
      if (typeof confirmedSlot === 'string') {
        const slot = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(confirmedSlot);
        if (slot) {
          slotData = slot;
        }
      }
      updateQuery += ', confirmedSlot = ?';
      params.push(JSON.stringify(slotData));
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
    const applicationId = req.params.id;

    // Release all slots held by this application
    db.prepare('UPDATE interview_slots SET heldBy = NULL WHERE heldBy = ?').run(applicationId);

    // Release all slots booked by this application (confirmed interview times)
    db.prepare('UPDATE interview_slots SET isBooked = 0, bookedBy = NULL WHERE bookedBy = ?').run(applicationId);

    const result = db.prepare('DELETE FROM applications WHERE id = ?').run(applicationId);

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

// Reservation timeout in milliseconds (5 minutes)
const RESERVATION_TIMEOUT = 5 * 60 * 1000;

// Clean expired reservations
const cleanExpiredReservations = () => {
  try {
    const db = getDb();
    const cutoff = new Date(Date.now() - RESERVATION_TIMEOUT).toISOString();
    db.prepare(`
      UPDATE interview_slots
      SET reservedBy = NULL, reservedAt = NULL
      WHERE reservedAt IS NOT NULL AND reservedAt < ? AND isBooked = 0
    `).run(cutoff);
  } catch (error) {
    console.error('Error cleaning expired reservations:', error);
  }
};

// Clean past date slots - release held and reserved slots for dates that have passed
const cleanPastDateSlots = () => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format

    // First, update applications that had selected slots on past dates - remove those slots from selection
    const applications = db.prepare(`
      SELECT id, selectedSlots FROM applications WHERE status = 'pending'
    `).all();

    for (const app of applications) {
      const slots = JSON.parse(app.selectedSlots || '[]');
      if (slots.length > 0) {
        // Get slot dates for these slot IDs
        const slotPlaceholders = slots.map(() => '?').join(',');
        const slotData = db.prepare(`SELECT id, date FROM interview_slots WHERE id IN (${slotPlaceholders})`).all(...slots);

        // Filter out past date slots
        const validSlots = slotData.filter(s => s.date >= today).map(s => s.id);

        if (validSlots.length !== slots.length) {
          // Update application with only valid slots
          db.prepare('UPDATE applications SET selectedSlots = ? WHERE id = ?').run(JSON.stringify(validSlots), app.id);
        }
      }
    }

    // Delete all time slots with dates in the past
    const deletedSlots = db.prepare(`
      DELETE FROM interview_slots WHERE date < ?
    `).run(today);

    if (deletedSlots.changes > 0) {
      console.log(`Deleted ${deletedSlots.changes} time slots for past dates`);
    }
  } catch (error) {
    console.error('Error cleaning past date slots:', error);
  }
};

// Run cleanup every minute
setInterval(cleanExpiredReservations, 60 * 1000);

// Run past date cleanup once a day (or on server start)
cleanPastDateSlots();
setInterval(cleanPastDateSlots, 24 * 60 * 60 * 1000);

// Get all interview slots
app.get('/api/interview-slots', (req, res) => {
  try {
    // Clean expired reservations first
    cleanExpiredReservations();

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
    const { date, time, type = 'fysisk' } = req.body;
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

// Reserve interview slot (temporary hold)
app.post('/api/interview-slots/:id/reserve', (req, res) => {
  try {
    const db = getDb();
    const { sessionId } = req.body;
    const slotId = req.params.id;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Clean expired reservations first
    cleanExpiredReservations();

    // Get the slot
    const slot = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(slotId);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    if (slot.isBooked) {
      return res.status(400).json({ error: 'Slot is already booked' });
    }

    // Check if already reserved by another session
    if (slot.reservedBy && slot.reservedBy !== sessionId) {
      const reservedAt = new Date(slot.reservedAt).getTime();
      const now = Date.now();
      if (now - reservedAt < RESERVATION_TIMEOUT) {
        return res.status(409).json({ error: 'Slot is already reserved by another user' });
      }
    }

    // Reserve the slot
    const now = new Date().toISOString();
    db.prepare('UPDATE interview_slots SET reservedBy = ?, reservedAt = ? WHERE id = ?')
      .run(sessionId, now, slotId);

    res.json({ message: 'Slot reserved successfully', expiresIn: RESERVATION_TIMEOUT });
  } catch (error) {
    console.error('Error reserving slot:', error);
    res.status(500).json({ error: 'Failed to reserve interview slot' });
  }
});

// Release interview slot reservation
app.post('/api/interview-slots/:id/release', (req, res) => {
  try {
    const db = getDb();
    const { sessionId } = req.body;
    const slotId = req.params.id;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Get the slot
    const slot = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(slotId);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    // Only release if the session owns the reservation
    if (slot.reservedBy === sessionId) {
      db.prepare('UPDATE interview_slots SET reservedBy = NULL, reservedAt = NULL WHERE id = ?')
        .run(slotId);
    }

    res.json({ message: 'Slot released successfully' });
  } catch (error) {
    console.error('Error releasing slot:', error);
    res.status(500).json({ error: 'Failed to release interview slot' });
  }
});

// Release all reservations for a session
app.post('/api/interview-slots/release-all', (req, res) => {
  try {
    const db = getDb();
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    db.prepare('UPDATE interview_slots SET reservedBy = NULL, reservedAt = NULL WHERE reservedBy = ?')
      .run(sessionId);

    res.json({ message: 'All reservations released successfully' });
  } catch (error) {
    console.error('Error releasing reservations:', error);
    res.status(500).json({ error: 'Failed to release reservations' });
  }
});

// Delete interview slot (HR only)
app.delete('/api/interview-slots/:id', authenticateHR, (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM interview_slots WHERE id = ?').run(req.params.id);
    res.json({ message: 'Slot deleted successfully' });
  } catch (error) {
    console.error('Error deleting slot:', error);
    res.status(500).json({ error: 'Failed to delete interview slot' });
  }
});

// Book interview slot (HR only)
app.patch('/api/interview-slots/:id/book', authenticateHR, (req, res) => {
  try {
    const db = getDb();
    const { applicationId } = req.body;
    const slotId = req.params.id;

    // Get the slot
    const slot = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(slotId);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    if (slot.isBooked && slot.bookedBy !== applicationId) {
      return res.status(400).json({ error: 'Slot is already booked by another applicant' });
    }

    // Book the slot
    db.prepare('UPDATE interview_slots SET isBooked = 1, bookedBy = ? WHERE id = ?')
      .run(applicationId, slotId);

    res.json({ message: 'Slot booked successfully' });
  } catch (error) {
    console.error('Error booking slot:', error);
    res.status(500).json({ error: 'Failed to book interview slot' });
  }
});

// Unbook interview slot (HR only)
app.patch('/api/interview-slots/:id/unbook', authenticateHR, (req, res) => {
  try {
    const db = getDb();
    const slotId = req.params.id;

    // Get the slot
    const slot = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(slotId);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    // Unbook the slot
    db.prepare('UPDATE interview_slots SET isBooked = 0, bookedBy = NULL WHERE id = ?')
      .run(slotId);

    res.json({ message: 'Slot unbooked successfully' });
  } catch (error) {
    console.error('Error unbooking slot:', error);
    res.status(500).json({ error: 'Failed to unbook interview slot' });
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

    // Update the confirmed slot - mark as booked and clear heldBy
    db.prepare('UPDATE interview_slots SET isBooked = 1, bookedBy = ?, heldBy = NULL WHERE id = ?')
      .run(applicationId, slotId);

    // Release all other slots held by this application (make them available again)
    db.prepare('UPDATE interview_slots SET heldBy = NULL WHERE heldBy = ? AND id != ?')
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
