// src/db.js
import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("app.db");
let initialized = false;

// Initialize the database schema once
export function initDb() {
  if (initialized) return;

  try {
    db.execSync("PRAGMA journal_mode = WAL;");
  } catch {}

  try {
    db.execSync("PRAGMA busy_timeout = 5000;");
  } catch {}

  try {
    db.execSync("PRAGMA foreign_keys = ON;");
  } catch {}

  db.withTransactionSync(() => {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS asset_table (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        tag  TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        dept_id INTEGER,
        serial TEXT NOT NULL,
        po TEXT,
        model TEXT,
        manufacturer TEXT,
        room_tag INTEGER,
        type TEXT,
        bus_unit TEXT CHECK(bus_unit IN ('BKCMP', 'BKASI', 'BKSTU', 'BKFDN', 'BKSPA')) DEFAULT 'BKCMP',
        status TEXT,
        assigned_to TEXT,
        purchase_date TEXT,
        geo_x TEXT,
        geo_y TEXT,
        elevation TEXT,
        price REAL,
        notes TEXT,
        FOREIGN KEY (room_tag) REFERENCES room(id) ON DELETE SET NULL ON UPDATE CASCADE,
        UNIQUE(tag),
        FOREIGN KEY (dept_id) REFERENCES department(id) ON DELETE SET NULL ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_asset_tag ON asset_table (tag);
      CREATE INDEX IF NOT EXISTS idx_asset_name ON asset_table (name);

    `);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS auth (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        username  TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL CHECK(email LIKE '%@csub.edu'),
        pw TEXT,
        school_id TEXT,
        dept_id TEXT,
        form_id TEXT,
        signature TEXT,
        f_name TEXT,
        l_name TEXT,
        role TEXT CHECK(role IN ('admin', 'user', 'management', 'custodian', 'student')) NOT NULL DEFAULT 'user',
        kuali_key TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        UNIQUE(username, email)
      );
      CREATE INDEX IF NOT EXISTS idx_auth_email ON auth (email);
    `);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS department (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        dept_id INTEGER NOT NULL,
        manager TEXT,
        custodian TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_department_dept_id ON department (dept_id);
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS department_cust (
        custodian TEXT,
        dept_id INTEGER,
        FOREIGN KEY (dept_id) REFERENCES department(dept_id) ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_department_dept_id ON department (dept_id);
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS building (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        bldg_id INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_building_bldg_id ON building (bldg_id);
    `);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS room (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        room_id INTEGER NOT NULL,
        number TEXT,
        bldg_id INTEGER NOT NULL,
        FOREIGN KEY (bldg_id) REFERENCES building(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_room_id ON room (room_id);
    `);
  });

  initialized = true;
}
// Insert or update (avoid crashing on duplicate tags)
export function insertItem(tag, name, room_tag) {
  initDb();
  db.runSync(
    `INSERT OR IGNORE INTO asset_table (tag, name, room_tag)
     VALUES (?, ?, ?)
     ON CONFLICT(tag) DO NOTHING`,
    [tag, name, room_tag]
  );
}

// Get a single item by exact tag
export function getItem(tag) {
  initDb();
  return db.getFirstSync(
    `SELECT id, tag, name, room_tag FROM asset_table WHERE tag = ? LIMIT 1`,
    [tag]
  );
}

// Get multiple items (default limit 20)
export function getAllItems(limit = 10, offset = 0) {
  initDb();
  return db.getAllSync(
    `SELECT id, tag, name, room_tag FROM asset_table
     ORDER BY tag DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

// Search items by tag or name (basic LIKE)
export function searchItems(query, limit = 50, offset = 0) {
  initDb();
  const like = `%${query}%`;
  return db.getAllSync(
    `SELECT id, tag, name, room_tag FROM asset_table
     WHERE tag LIKE ? OR name LIKE ?
     ORDER BY tag DESC
     LIMIT ? OFFSET ?`,
    [like, like, limit, offset]
  );
}

// Delete an item by tag
export function deleteItem(tag) {
  initDb();
  db.runSync(`DELETE FROM asset_table WHERE tag = ?`, [tag]);
}
