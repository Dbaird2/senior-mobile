// src/db.js
import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";

let initialized = false;

// Initialize the database schema once
export async function initDb() {
  console.log("DB initDb called");
  const db = await SQLite.openDatabaseAsync("sqlite2.db");
  if (!db) {
    console.error("Database initialization failed!");
    return;
  } else {
    console.log("Database opened:", db);
  }
  if (initialized) return db;
  console.log("DB initializing schema...");
  console.log("sync available?", !!SQLite.openDatabaseSync);
  // try {
  //   await db.execAsync(
  //     "PRAGMA foreign_keys=OFF; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;"
  //   );
  // } catch (e) {
  //   console.error("Failed to set PRAGMA options:", e);
  // }
  console.log("Creating department table...");
  try {
    // await db.execAsync(`DROP TABLE IF EXISTS department;`);
    // await db.execAsync(`DROP INDEX IF EXISTS idx_department_dept_id;`);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS department (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        dept_id INTEGER NOT NULL,
        manager TEXT,
        custodian TEXT
      );
    `);
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_department_dept_id ON department (dept_id);`);
  } catch (e) {
    console.error("DB department error:", e);
  }
  await db.execAsync(`
      CREATE TABLE IF NOT EXISTS department_cust (
        custodian TEXT,
        dept_id INTEGER,
        FOREIGN KEY (dept_id) REFERENCES department(dept_id) ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_department_dept_id ON department (dept_id);
    `);
  console.log("Creating building table");
  // await db.execAsync(`DROP TABLE IF EXISTS building;`);
  await db.execAsync(`
      CREATE TABLE IF NOT EXISTS building (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        bldg_id INTEGER NOT NULL
      );
    `);

  await db.execAsync(
    `CREATE INDEX IF NOT EXISTS idx_building_bldg_id ON building (bldg_id);`
  );
  console.log("Creating room table");
  // await db.execAsync(`DROP TABLE IF EXISTS room;`);
  await db.execAsync(`
      CREATE TABLE IF NOT EXISTS room (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        room_id INTEGER NOT NULL,
        number TEXT,
        bldg_id INTEGER NOT NULL,
        FOREIGN KEY (bldg_id) REFERENCES building(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
  await db.execAsync(
    `CREATE INDEX IF NOT EXISTS idx_room_id ON room (room_id);`
  );
  try {
    console.log("Creating asset_table...");
    //await db.execAsync(`DROP TABLE IF EXISTS asset_table;`);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS asset_table (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        tag  TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        dept_id TEXT,
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
        FOREIGN KEY (dept_id) REFERENCES department(id) ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    await db.execAsync(
      `CREATE INDEX IF NOT EXISTS idx_asset_tag ON asset_table (tag);`
    );
    await db.execAsync(
      `CREATE INDEX IF NOT EXISTS idx_asset_name ON asset_table (name);`
    );
  } catch (e) {
    console.error("DB asset_table error:", e);
  }
  try {
    console.log("Creating auth table...");
    // await db.execAsync(`DROP TABLE IF EXISTS auth;`);
    await db.execAsync(`
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
    `);
    await db.execAsync(
      `CREATE INDEX IF NOT EXISTS idx_auth_email ON auth (email);`
    );
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        color TEXT,
        notes TEXT,
        tag TEXT,
        FOREIGN KEY (tag) REFERENCES asset_table(tag) ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_profile_tag ON profile(tag, email);
    `);
  } catch (e) {
    console.error("DB auth error:", e);
  }
  console.log("Database initialized.");

  initialized = true;
}

// Search items by tag or name (basic LIKE)
export async function checkUser(username) {
  console.log("DB checkUser called with", username);
  //await initDb();
  initDb();
  const db = await SQLite.openDatabaseAsync("sqlite2.db");

  return db.getAllAsync(
    `SELECT username, email FROM auth
     WHERE  username = ? OR email = ?
     ORDER BY username DESC
     LIMIT 1`,
    [username, username]
  );
}

export async function logUserInfo(email, username) {
  console.log("DB logUserInfo called with", email, username);
  //await initDb();
  initDb();
  const db = await SQLite.openDatabaseAsync("sqlite2.db");
  db.runAsync(
    `INSERT INTO auth (email, username)
     VALUES (?, ?)
     `,
    [email, username]
  );
}

export async function listTables() {
  console.log("DB listTables called");
  const db = await SQLite.openDatabaseAsync("sqlite2.db");

  try {
    await initDb();
    return db.getAllAsync(
      `SELECT name FROM sqlite_master WHERE type='table'`,
      []
    );
  } catch (e) {
    console.error("DB listTables error:", e);
    return [];
  }
}

export async function clearUsers() {
  console.log("DB clearUsers called");
  const db = await SQLite.openDatabaseAsync("sqlite2.db");

  await initDb();
  db.runSync(`DELETE FROM auth`);
  db.runSync(`DELETE FROM sqlite_sequence WHERE name='auth'`);
  console.log("All users cleared.");
  return true;
}

export async function deleteDatabase(database = "sqlite.db") {
  console.log("DB deleteDatabase called");
  const dbPath = FileSystem.documentDirectory + database;
  try {
    await FileSystem.deleteAsync(dbPath, { idempotent: true });
    console.log("Database deleted successfully");
  } catch (error) {
    console.error("Error deleting database:", error);
  }
}
