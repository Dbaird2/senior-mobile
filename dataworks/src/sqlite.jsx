// src/db.js
import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";

let initialized = false;

// Initialize the database schema once
async function getScalarCount(sql, params = []) {
  const db = await SQLite.openDatabaseAsync("app.db");
  const rows = await db.getAllAsync(sql, params);
  console.log(rows);
  if (!rows || rows.length === 0) return 0;
  const key = Object.keys(rows[0])[0];
  const result = Number(rows[0][key] ?? 0);
  console.log("scalar result", result);

  return result;
}

export async function initDb() {
  console.log("DB initDb called");
  const db = await SQLite.openDatabaseAsync("app.db");
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
        name TEXT UMIQUE NOT NULL,
        dept_id TEXT PRIMARY KEY,
        manager TEXT
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
        bldg_id INTEGER NOT NULL UNIQUE
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
        room_tag INTEGER NOT NULL,
        bldg_id INTEGER NOT NULL
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
        notes TEXT
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

  await db.execAsync(`
      CREATE TABLE IF NOT EXISTS auditing (
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
        found_room_tag INTEGER,
        found_building TEXT,
        found_room_number TEXT,
        found_timestamp TIMESTAMP DEFAULT CURRENT TIMESTAMP,
        audit_id INTEGER,
        notes TEXT
      );
    `);
  console.log("Database initialized.");

  initialized = true;
}

// Search items by tag or name (basic LIKE)
export async function checkUser(username) {
  console.log("DB checkUser called with", username);
  //await initDb();
  initDb();
  const db = await SQLite.openDatabaseAsync("app.db");

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
  //initDb();
  const db = await SQLite.openDatabaseAsync("app.db");
  await db.runAsync(
    `INSERT INTO auth (email, username)
     VALUES (?, ?)
     `,
    [email, username]
  );
}

export async function listTables() {
  console.log("DB listTables called");
  const db = await SQLite.openDatabaseAsync("app.db");

  try {
    //await initDb();
    return db.getAllAsync(
      `SELECT name FROM sqlite_master WHERE type='table'`,
      []
    );
  } catch (e) {
    console.error("DB listTables error:", e);
    return [];
  }
}

export async function getItemCount() {
  //await initDb();
  const count = await getScalarCount("SELECT COUNT(*) FROM asset_table");
  return count;
}
export async function getBldgCount() {
  //await initDb();
  const count = await getScalarCount("SELECT COUNT(*) FROM building");
  console.log("getBldgCount return: ", count);
  return count;
}
export async function getDeptCount() {
  //await initDb();
  const count = await getScalarCount("SELECT COUNT(*) FROM department");
  return count;
}
export async function getCustCount() {
  //await initDb();
  const count = await getScalarCount("SELECT COUNT(*) FROM department_cust");
  return count;
}
export async function getRoomCount() {
  //await initDb();
  const count = await getScalarCount("SELECT COUNT(*) FROM room");
  return count;
}

export async function clearUsers() {
  console.log("DB clearUsers called");
  const db = await SQLite.openDatabaseAsync("app.db");

  // await initDb();
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

export async function searchDeptItems(query, limit = 50, offset = 0) {
  //await initDb();
  const db = await SQLite.openDatabaseAsync("app.db");
  const like = `${query}`;
  return db.getAllAsync(
    `SELECT * FROM asset_table
     WHERE dept_id = ? COLLATE NOCASE
     ORDER BY tag DESC
     LIMIT ? OFFSET ?`,
    [like, limit, offset]
  );
}

export async function searchItems(query, limit = 50, offset = 0) {
  //await initDb();
  const db = await SQLite.openDatabaseAsync("app.db");
  const like = `%${query}%`;
  return db.getAllAsync(
    `SELECT * FROM asset_table
     WHERE tag LIKE ? COLLATE NOCASE
        OR name LIKE ? COLLATE NOCASE
     ORDER BY tag DESC
     LIMIT ? OFFSET ?`,
    [like, like, limit, offset]
  );
}

export async function getItem(tag) {
  //await initDb();
  const db = await SQLite.openDatabaseAsync("app.db");
  return db.getFirstAsync(`SELECT * FROM asset_table WHERE tag = ?`, [tag]);
}

export async function getAllBuildings(limit = 50, offset = 0) {
  //await initDb();
  const db = await SQLite.openDatabaseAsync("app.db");

  return db.getAllAsync(
    `SELECT * FROM building ORDER BY bldg_id DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

export async function getAllDepartments(limit = 50, offset = 0) {
  //await initDb();
  const db = await SQLite.openDatabaseAsync("app.db");

  return db.getAllAsync(
    `SELECT * FROM department ORDER BY dept_id DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

export async function getAllItems(limit = 50, offset = 0) {
  //await initDb();
  const db = await SQLite.openDatabaseAsync("app.db");

  return db.getAllAsync(
    `SELECT * FROM asset_table ORDER BY tag DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

export async function insertItem(tag, name, room_tag, serial, dept_id) {
  ////await initDb();
  const db = await SQLite.openDatabaseAsync("app.db");

  db.runAsync(
    `INSERT INTO asset_table (tag, name, room_tag, serial, dept_id)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(tag) DO UPDATE SET
       name=excluded.name,
       room_tag=excluded.room_tag,
       serial=excluded.serial`,
    [tag, name, room_tag, serial, dept_id]
  );
}

export async function insertBldg(name, bldg_id) {
  //await initDb();
  const db = await SQLite.openDatabaseAsync("app.db");

  db.runAsync(
    `INSERT INTO building (name, bldg_id)
     VALUES (?, ?)
     ON CONFLICT(bldg_id) DO UPDATE SET
       name=excluded.name`,
    [name, bldg_id]
  );
}

export async function insertDept(name, dept_id, manager) {
  //await initDb();
  const db = await SQLite.openDatabaseAsync("app.db");

  db.runAsync(
    `INSERT INTO department (name, dept_id, manager)
     VALUES (?, ?, ?)
     ON CONFLICT(dept_id) DO UPDATE SET
       name=excluded.name,
       manager=excluded.manager`,
    [name, dept_id, manager]
  );
}

export async function insertDeptCustodian(custodian, dept_id) {
  //await initDb();
  const db = await SQLite.openDatabaseAsync("app.db");

  db.runAsync(
    `INSERT OR IGNORE INTO department_cust (custodian, dept_id)
     VALUES (?, ?)`,
    [custodian, dept_id]
  );
}

export async function insertDeptRooms(room_tag, name, bldg_id) {
  //await initDb();
  const db = await SQLite.openDatabaseAsync("app.db");

  db.runAsync(
    `INSERT INTO room (room_tag, name, bldg_id)
     VALUES (?, ?, ?)
     ON CONFLICT(room_tag) DO UPDATE SET
       name=excluded.name,
       bldg_id=excluded.bldg_id`,
    [room_tag, name, bldg_id]
  );
}

/*
import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";


const db = SQLite.openDatabaseSync("app.db");
let initialized = false;

function getScalarCount(sql, params = []) {
  const rows = db.getAllSync(sql, params);
  if (!rows || rows.length === 0) return 0;
  const key = Object.keys(rows[0])[0];
  return Number(rows[0][key] ?? 0);
}

export function initDb() {
  if (initialized) return;
  try {
    db.execSync("PRAGMA journal_mode = WAL;");
    db.execSync("PRAGMA busy_timeout = 5000;");
    db.execSync("PRAGMA foreign_keys = ON;");
  } catch {}

  db.withTransactionSync(() => {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS building (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        bldg_id INTEGER NOT NULL UNIQUE
      );
    `);
    //db.execSync(`DROP TABLE room;`);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS room (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        room_tag INTEGER NOT NULL UNIQUE,
        bldg_id INTEGER NOT NULL
      );
    `);
    //db.execSync(`DROP TABLE department;`);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS department (
        name TEXT UNIQUE NOT NULL,
        dept_id TEXT PRIMARY KEY,
        manager TEXT
      );
    `);
    //db.execSync(`DROP TABLE department_cust`);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS department_cust (
        custodian TEXT,
        dept_id TEXT,
        FOREIGN KEY (dept_id) REFERENCES department(dept_id)
        ON DELETE CASCADE ON UPDATE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_deptcust_unique
        ON department_cust (custodian, dept_id);
        `);
    //db.execSync(`DROP TABLE asset_table;`);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS asset_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        serial TEXT NOT NULL,
        room_tag INTEGER,
        geo_x REAL,
        geo_y REAL,
        elevation REAL,
        dept_id TEXT
      );
    `);
  });

  initialized = true;
}

export function insertItem(tag, name, room_tag, serial, dept_id) {
  initDb();
  db.runSync(
    `INSERT INTO asset_table (tag, name, room_tag, serial, dept_id)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(tag) DO UPDATE SET
       name=excluded.name,
       room_tag=excluded.room_tag,
       serial=excluded.serial`,
    [tag, name, room_tag, serial, dept_id]
  );
}

export function insertBldg(name, bldg_id) {
  initDb();
  db.runSync(
    `INSERT INTO building (name, bldg_id)
     VALUES (?, ?)
     ON CONFLICT(bldg_id) DO UPDATE SET
       name=excluded.name`,
    [name, bldg_id]
  );
}

export function insertDept(name, dept_id, manager) {
  initDb();
  db.runSync(
    `INSERT INTO department (name, dept_id, manager)
     VALUES (?, ?, ?)
     ON CONFLICT(dept_id) DO UPDATE SET
       name=excluded.name,
       manager=excluded.manager`,
    [name, dept_id, manager]
  );
}

export function insertDeptCustodian(custodian, dept_id) {
  initDb();
  db.runSync(
    `INSERT OR IGNORE INTO department_cust (custodian, dept_id)
     VALUES (?, ?)`,
    [custodian, dept_id]
  );
}

export function insertDeptRooms(room_tag, name, bldg_id) {
  initDb();
  db.runSync(
    `INSERT INTO room (room_tag, name, bldg_id)
     VALUES (?, ?, ?)
     ON CONFLICT(room_tag) DO UPDATE SET
       name=excluded.name,
       bldg_id=excluded.bldg_id`,
    [room_tag, name, bldg_id]
  );
}

export function getAllItems(limit = 50, offset = 0) {
  initDb();
  return db.getAllSync(
    `SELECT * FROM asset_table ORDER BY tag DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

export function getAllDepartments(limit = 50, offset = 0) {
  initDb();
  return db.getAllSync(
    `SELECT * FROM department ORDER BY dept_id DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

export function getAllBuildings(limit = 50, offset = 0) {
  initDb();
  return db.getAllSync(
    `SELECT * FROM building ORDER BY bldg_id DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

export function getItem(tag) {
  initDb();
  return db.getFirstSync(`SELECT * FROM asset_table WHERE tag = ?`, [tag]);
}

export function searchItems(query, limit = 50, offset = 0) {
  initDb();
  const like = `%${query}%`;
  return db.getAllSync(
    `SELECT * FROM asset_table
     WHERE tag LIKE ? COLLATE NOCASE
        OR name LIKE ? COLLATE NOCASE
     ORDER BY tag DESC
     LIMIT ? OFFSET ?`,
    [like, like, limit, offset]
  );
}

export function searchDeptItems(query, limit = 50, offset = 0) {
  initDb();
  const like = `${query}`;
  return db.getAllSync(
    `SELECT * FROM asset_table
     WHERE dept_id = ? COLLATE NOCASE
     ORDER BY tag DESC
     LIMIT ? OFFSET ?`,
    [like, limit, offset]
  );
}

export function getItemCount() {
  initDb();
  return getScalarCount("SELECT COUNT(*) FROM asset_table");
}
export function getBldgCount() {
  initDb();
  return getScalarCount("SELECT COUNT(*) FROM building");
}
export function getDeptCount() {
  initDb();
  return getScalarCount("SELECT COUNT(*) FROM department");
}
export function getCustCount() {
  initDb();
  return getScalarCount("SELECT COUNT(*) FROM department_cust");
}
export function getRoomCount() {
  initDb();
  return getScalarCount("SELECT COUNT(*) FROM room");
}

export function deleteTable() {
  initDb();
  db.withTransactionSync(() => {
    db.execSync(`PRAGMA foreign_keys = OFF;`);
    db.execSync(`
      DROP TABLE IF EXISTS asset_table;
      DROP TABLE IF EXISTS department_cust;
      DROP TABLE IF EXISTS room;
      DROP TABLE IF EXISTS building;
      DROP TABLE IF EXISTS department;
    `);
    db.execSync(`PRAGMA foreign_keys = ON;`);
  });
  initialized = false; // <— IMPORTANT
}*/
