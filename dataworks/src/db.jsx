// db.js
import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("app.db");
let initialized = false;

// 1) Initialize schema once
export function initDb() {
  if (initialized) return;
  try {
    db.execSync("PRAGMA journal_mode = WAL;"); // better read/write concurrency
  } catch {}
  try {
    db.execSync("PRAGMA busy_timeout = 5000;"); // wait up to 5s instead of failing locked
  } catch {}
  try {
    db.execSync("PRAGMA synchronous = NORMAL;"); // optional: reduces fs churn
  } catch {}

  // Optional: put related statements in a single transaction
  db.withTransactionSync(() => {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS asset_table (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        tag  TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
        );
    `);
  });
  const check = db.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`,
    ["asset_table"]
  );
  if (!check) {
    throw new Error("asset_table was not created");
  }

  initialized = true;
}

// 2) Inserts
export function insertItem(tag, name) {
  initDb();
  db.withTransactionSync(() => {
    db.runSync("INSERT INTO asset_table (tag, name) VALUES (?, ?)", [
      tag,
      name,
    ]);
  });
}

// 3) Simple reads
export function getAllItems() {
  return db.getAllSync(`SELECT * FROM asset_table ORDER BY tag DESC LIMIT 20`);
}

export function searchItems() {
  return db.getAllSync(`SELECT * FROM asset_table ORDER BY tag DESC`, []);
}

// 4) Updates & deletes
// export function toggleItemDone(tag, done) {
//   db.runSync(`UPDATE items SET done = ? WHERE tag = ?`, [done ? 1 : 0, tag]);
// }

export function deleteItem(tag) {
  db.runSync(`DELETE FROM asset_table WHERE tag = ?`, [tag]);
}
