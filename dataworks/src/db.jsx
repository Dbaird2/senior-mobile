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

  db.withTransactionSync(() => {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS asset_table (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        tag  TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        room_tag INTEGER NOT NULL
      );
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
