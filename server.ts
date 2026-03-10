import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("attendance.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    father_name TEXT,
    father_whatsapp TEXT,
    fine_paid INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    date TEXT NOT NULL,
    status TEXT CHECK(status IN ('present', 'absent', 'leave')),
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS holidays (
    date TEXT PRIMARY KEY,
    reason TEXT
  );
`);

// Migration: Add fine_paid if it doesn't exist
try {
  const columns = db.prepare("PRAGMA table_info(students)").all() as any[];
  const hasFinePaid = columns.some(col => col.name === "fine_paid");
  if (!hasFinePaid) {
    db.exec("ALTER TABLE students ADD COLUMN fine_paid INTEGER DEFAULT 0");
  }
} catch (e) {
  console.error("Migration failed", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/holidays", (req, res) => {
    const holidays = db.prepare("SELECT * FROM holidays").all();
    res.json(holidays);
  });

  app.post("/api/holidays", (req, res) => {
    const { date, reason } = req.body;
    try {
      db.prepare("INSERT OR REPLACE INTO holidays (date, reason) VALUES (?, ?)").run(date, reason || "Holiday");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save holiday" });
    }
  });

  app.delete("/api/holidays/:date", (req, res) => {
    const { date } = req.params;
    try {
      db.prepare("DELETE FROM holidays WHERE date = ?").run(date);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete holiday" });
    }
  });

  app.get("/api/students", (req, res) => {
    const students = db.prepare("SELECT * FROM students ORDER BY name ASC").all();
    res.json(students);
  });

  app.post("/api/students", (req, res) => {
    const { name, roll_number, father_name, father_whatsapp } = req.body;
    try {
      const info = db.prepare("INSERT INTO students (name, roll_number, father_name, father_whatsapp) VALUES (?, ?, ?, ?)").run(name, roll_number, father_name, father_whatsapp);
      res.json({ id: info.lastInsertRowid, name, roll_number, father_name, father_whatsapp });
    } catch (error) {
      res.status(400).json({ error: "Failed to add student. Please try again." });
    }
  });

  app.put("/api/students/:id", (req, res) => {
    const { id } = req.params;
    const { name, roll_number, father_name, father_whatsapp } = req.body;
    try {
      db.prepare("UPDATE students SET name = ?, roll_number = ?, father_name = ?, father_whatsapp = ? WHERE id = ?")
        .run(name, roll_number, father_name, father_whatsapp, id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update student." });
    }
  });

  app.delete("/api/students/:id", (req, res) => {
    const { id } = req.params;
    try {
      // Use a transaction to ensure both deletions happen
      const deleteAttendance = db.prepare("DELETE FROM attendance WHERE student_id = ?");
      const deleteStudent = db.prepare("DELETE FROM students WHERE id = ?");
      
      const transaction = db.transaction(() => {
        deleteAttendance.run(id);
        deleteStudent.run(id);
      });
      
      transaction();
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete student." });
    }
  });

  app.get("/api/attendance/:date", (req, res) => {
    const { date } = req.params;
    const records = db.prepare(`
      SELECT s.id, s.name, s.roll_number, s.father_name, s.father_whatsapp, a.status 
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ?
    `).all(date);
    res.json(records);
  });

  app.post("/api/attendance", (req, res) => {
    const { date, attendance } = req.body; // attendance: [{student_id, status}]
    
    const deleteStmt = db.prepare("DELETE FROM attendance WHERE date = ?");
    const insertStmt = db.prepare("INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?)");

    const transaction = db.transaction((records) => {
      deleteStmt.run(date);
      for (const record of records) {
        insertStmt.run(record.student_id, date, record.status);
      }
    });

    transaction(attendance);
    res.json({ success: true });
  });

  app.get("/api/history", (req, res) => {
    const history = db.prepare(`
      SELECT date, 
             COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
             COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
             COUNT(CASE WHEN status = 'leave' THEN 1 END) as leave_count
      FROM attendance
      GROUP BY date
      ORDER BY date DESC
    `).all();
    res.json(history);
  });

  app.get("/api/fines", (req, res) => {
    const fines = db.prepare(`
      SELECT 
        s.id, 
        s.name, 
        s.roll_number, 
        s.fine_paid,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all();
    res.json(fines);
  });

  app.post("/api/fines/update", (req, res) => {
    const { student_id, fine_paid } = req.body;
    try {
      db.prepare("UPDATE students SET fine_paid = ? WHERE id = ?").run(fine_paid, student_id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update fine" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
