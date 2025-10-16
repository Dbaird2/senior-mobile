import * as SQLite from "expo-sqlite";

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
}
