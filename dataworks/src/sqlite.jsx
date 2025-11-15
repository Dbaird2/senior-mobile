// src/db.js
import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";

let initialized = false;
let initPromise = null;
let dbInstance = null;

async function getDb() {
  // console.log("DB getDb called");
  if (!dbInstance) {
    // console.log("Opening database...");
    dbInstance = await SQLite.openDatabaseAsync("app.db");
  }
  return dbInstance;
}
// Initialize the database schema once
async function getScalarCount(sql, params = []) {
  await initDb();
  const db = await getDb();
  const rows = await db.getAllAsync(sql, params);
  // console.log(rows);
  if (!rows || rows.length === 0) return 0;
  const key = Object.keys(rows[0])[0];
  const result = Number(rows[0][key] ?? 0);
  // console.log("scalar result", result);

  return result;
}

export async function initDb() {
  // console.log("DB initDb called");

  // ✅ If already initializing, wait for that to complete
  if (initPromise) {
    // console.log("Already initializing, waiting...");
    return initPromise;
  }

  // ✅ If already initialized, return immediately
  if (initialized) {
    // console.log("Already initialized");
    return;
  }

  // ✅ Create initialization promise
  initPromise = (async () => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database initialization failed!");
      }

      // console.log("Database opened:", db);
      // console.log("DB initializing schema...");
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        PRAGMA synchronous = NORMAL;
        PRAGMA busy_timeout = 4000;  -- wait up to 4s instead of hanging forever
      `);
      // Your table creation code...
      // console.log("Creating department table...");
      await db.execAsync(`
          CREATE TABLE IF NOT EXISTS department (
            name TEXT UNIQUE NOT NULL,
            dept_id TEXT PRIMARY KEY,
            manager TEXT
          );
        `);
      await db.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_department_dept_id ON department (dept_id);
        `);

      await db.execAsync(`
          CREATE TABLE IF NOT EXISTS department_cust (
            custodian TEXT,
            dept_id TEXT,
            FOREIGN KEY (dept_id) REFERENCES department(dept_id) ON DELETE CASCADE ON UPDATE CASCADE
          );
        `);

      // console.log("Creating building table");
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

      // console.log("Creating room table");
      await db.execAsync(`
          CREATE TABLE IF NOT EXISTS room (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            room_tag INTEGER NOT NULL,
            bldg_id INTEGER NOT NULL
          );
        `);
      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_room_tag ON room (room_tag);`
      );

      // console.log("Creating asset_table...");
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

      // console.log("Creating auth table...");
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

      // console.log("Creating profile table...");
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

      // console.log("Creating auditing table...");
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
            found_status TEXT,
            found_room_tag INTEGER,
            found_building TEXT,
            found_room_number TEXT,
            found_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            audit_id INTEGER,
            notes TEXT,
            location TEXT
          );
        `);

      // console.log("Database initialized.");
      initialized = true;
    } catch (error) {
      console.error("Database initialization error:", error);
      throw error;
    }
  })();

  await initPromise;
  initPromise = null;
}

// Search items by tag or name (basic LIKE)
export async function checkUser(username) {
  // console.log("DB checkUser called with", username);
  //await initDb();
  //initDb();
  const db = await getDb();


  return db.getAllAsync(
    `SELECT username, email FROM auth
      WHERE  username = ? OR email = ?
      ORDER BY username DESC
      LIMIT 1`,
    [username, username]
  );
}

export async function logUserInfo(email, username) {
  // console.log("DB logUserInfo called with", email, username);
  //await initDb();
  //initDb();
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO auth (email, username)
      VALUES (?, ?)
      `,
    [email, username]
  );
}

export async function listTables() {
  // console.log("DB listTables called");
  const db = await getDb();

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
  // console.log("getBldgCount return: ", count);
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
  // console.log("DB clearUsers called");
  const db = await getDb();

  // await initDb();
  db.runSync(`DELETE FROM auth`);
  db.runSync(`DELETE FROM sqlite_sequence WHERE name='auth'`);
  // console.log("All users cleared.");
  return true;
}

export async function deleteDatabase(database = "sqlite.db") {
  // console.log("DB deleteDatabase called");
  const dbPath = FileSystem.documentDirectory + database;
  try {
    await FileSystem.deleteAsync(dbPath, { idempotent: true });
    // console.log("Database deleted successfully");
  } catch (error) {
    console.error("Error deleting database:", error);
  }
}

export async function searchDeptItems(query, limit = 30, offset = 0) {
  //await initDb();
  //const db = await SQLite.openDatabaseAsync("app.db");
  const db = await getDb();

  const like = `${query}`;
  return db.getAllAsync(
    `SELECT * FROM asset_table
      WHERE dept_id = ? COLLATE NOCASE
      ORDER BY tag DESC
      LIMIT ? OFFSET ?`,
    [like, limit, offset]
  );
}

export async function searchItems(query, limit = 30, offset = 0) {
  //await initDb();
  //const db = await SQLite.openDatabaseAsync("app.db");
  const db = await getDb();

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
export async function searchDepartment(query, limit = 30, offset = 0) {
  //await initDb();
  //const db = await SQLite.openDatabaseAsync("app.db");
  const db = await getDb();

  const like = `%${query}%`;
  return db.getAllAsync(
    `SELECT string_agg(C.custodian,',') AS Custodians,
      D.dept_id, D.name, D.manager FROM department AS D 
      LEFT JOIN department_cust AS C ON C.dept_id = D.dept_id
      WHERE D.dept_id LIKE ? COLLATE NOCASE
          OR D.name LIKE ? COLLATE NOCASE
          OR D.manager LIKE ? COLLATE NOCASE
          OR (SELECT string_agg(C.custodian,',') AS Custodians,
      D.dept_id, D.name, D.manager FROM department AS D 
      LEFT JOIN department_cust AS C ON C.dept_id = D.dept_id)
      LIKE ? COLLATE NOCASE
      GROUP BY D.dept_id
      ORDER BY D.dept_id DESC
      LIMIT ? OFFSET ?`,
    [like, like, like, like, limit, offset]
  );
}
export async function searchBuilding(query, limit = 30, offset = 0) {
  //await initDb();
  //const db = await SQLite.openDatabaseAsync("app.db");
  const db = await getDb();

  const like = `%${query}%`;
  return db.getAllAsync(
    `SELECT B.bldg_id, B.name AS bldg_name, R.name AS room_name, R.room_tag FROM building B LEFT JOIN room R ON
        B.bldg_id = R.bldg_id 
        WHERE B.bldg_id = ?
        OR R.name LIKE ? COLLATE NOCASE
        OR B.name LIKE ? COLLATE NOCASE
      ORDER BY B.bldg_id ASC
      LIMIT ? OFFSET ?`,
    [query, like, like, limit, offset]
  );
}

export async function getItem(tag) {
  //await initDb();
  //const db = await SQLite.openDatabaseAsync("app.db");
  const db = await getDb();

  return db.getFirstAsync(`SELECT * FROM asset_table WHERE tag = ?`, [tag]);
}

export async function getAllBuildings(limit = 30, offset = 0) {
  //await initDb();
  //const db = await SQLite.openDatabaseAsync("app.db");
  const db = await getDb();

  return db.getAllAsync(
    `SELECT B.bldg_id, B.name as bldg_name, R.name as room_name, R.room_tag FROM building B LEFT JOIN room R ON
        B.bldg_id = R.bldg_id ORDER BY B.bldg_id ASC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

export async function getAllDepartments(limit = 30, offset = 0) {
  //await initDb();
  //const db = await SQLite.openDatabaseAsync("app.db");
  const db = await getDb();

  return db.getAllAsync(
    `SELECT string_agg(C.custodian,',') AS Custodians,
      D.dept_id, D.name, D.manager FROM department AS D 
      LEFT JOIN department_cust AS C ON C.dept_id = D.dept_id GROUP BY D.dept_id ORDER BY D.dept_id DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

export async function getAllRooms(limit = 30, offset = 0) {
  //await initDb();
  const db = await getDb();

  //const db = await SQLite.openDatabaseAsync("app.db");

  return db.getAllAsync(
    `SELECT *
        FROM room
        LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}
function sanitizeLimitOffset(limit = 30, offset = 0) {
  const lim = Number.isFinite(limit) && limit >= 0 ? Math.floor(limit) : 30;
  const off = Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;
  return { lim, off };
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getAllItems(limit = 30, offset = 0) {
  // console.log("DB getAllItems called with", limit, offset);
  const db = await getDb();
  const { lim, off } = sanitizeLimitOffset(limit, offset);

  const sql = `
      SELECT *
      FROM asset_table
      ORDER BY tag DESC
      LIMIT ${lim} OFFSET ${off};
    `;
  // console.log("Executing SQL:", sql);
  // console.log("DB instance:", db);

  const rows = await db.getAllAsync(sql);
  //await sleep(1000);
  // console.log("Fetched items:", rows.length);
  //await db.closeAsync();
  return rows ?? [];
}

export async function insertItem(tag, name, room_tag, serial, dept_id) {
  ////await initDb();
  //const db = await SQLite.openDatabaseAsync("app.db");
  await initDb();
  const db = await getDb();

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
  //const db = await SQLite.openDatabaseAsync("app.db");
  await initDb();
  const db = await getDb();

  await db.runAsync(
    `INSERT INTO building (name, bldg_id)
      VALUES (?, ?)
      ON CONFLICT(bldg_id) DO UPDATE SET
        name=excluded.name`,
    [name, bldg_id]
  );
}

export async function insertDept(name, dept_id, manager) {
  //await initDb();
  //const db = await SQLite.openDatabaseAsync("app.db");
  await initDb();
  const db = await getDb();

  await db.runAsync(
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
  await initDb();
  const db = await getDb();

  await db.runAsync(
    `INSERT OR IGNORE INTO department_cust (custodian, dept_id)
      VALUES (?, ?)`,
    [custodian, dept_id]
  );
}

export async function insertDeptRooms(room_tag, name, bldg_id) {
  //await initDb();
  //const db = await SQLite.openDatabaseAsync("app.db");
  await initDb();
  const db = await getDb();
  /* do inserts here */
  //// console.log(room_tag, name, bldg_id);
  await db.runAsync(
    `INSERT INTO room (room_tag, name, bldg_id)
        VALUES (?, ?, ?);`,
    [room_tag, name, bldg_id]
  );
}

export async function clearTable(tableName) {
  // console.log(`DB clearTable called for table: ${tableName}`);
  const db = await getDb();
  await db.runAsync(`DELETE FROM ${tableName}`);
  await db.runAsync(`DELETE FROM sqlite_sequence WHERE name='${tableName}'`);
  // console.log(`Table ${tableName} cleared.`);
}
export async function insertIntoAuditing([item]) {
  try {
  const db = await getDb();
  let assigned_to = '';
  if (item.asset_notes !== '' && item.asset_notes != null) {
    const explode = item.asset_notes.split(',');
    assigned_to = explode[1].trim();
  }
  
  db.runAsync(
    `INSERT OR REPLACE INTO auditing 
      (tag, name, dept_id, serial, po, location, bus_unit, assigned_to, purchase_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      item.asset_tag, item.asset_name, item.dept_name, item.serial_num, item.po ?? '', item.location, item.bus_unit, assigned_to, item.date_added
    ]
  );
} catch (error) {
  console.error("Error inserting into auditing:", error);
}
  db.closeAsync();
}

export async function insertIntoAuditingExcel([item]) {
  try {
  const db = await getDb();
  let assigned_to = '';

  db.runAsync(
    `INSERT OR REPLACE INTO auditing 
      (tag, name, dept_id, serial, po, location, bus_unit, assigned_to, purchase_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      item['Tag Number'], item['Descr'], item['Dept'], item['Serial Number'], item['PO No.'] ?? '', item['Location'], item['Unit'], assigned_to, item['Acq Date']
    ]
  );
} catch (error) {
  console.error("Error inserting into auditing:", error);
}
  db.closeAsync();
}
export async function selectAllAuditing() {
  const db = await getDb();
  return db.getAllAsync(`SELECT * FROM auditing ORDER BY tag DESC`);
}
export async function deleteAuditingTable() {
  const db = await getDb();
  db.runAsync('DELETE FROM auditing');
          
  //await db.runAsync(`delete from auditing`);
}
export async function selectSingleAsset(tag) {
  const db = await getDb();
  return db.getFirstAsync(`SELECT * FROM auditing WHERE tag = ? ORDER BY tag DESC`, [tag]);
}

export async function updateAuditingFoundStatus(tag, geo_x, geo_y, elevation, found_room_tag, dept_id) {
  const db = await getDb();
  const in_audit = await db.getFirstAsync(`SELECT * FROM auditing WHERE tag = ?`, [tag]);
  const current_time = new Date().toISOString();
  if (in_audit) {
    db.runAsync('UPDATE auditing SET found_status = ?, geo_x = ?, geo_y = ?, elevation = ?, found_room_tag = ?, found_timestamp = ? WHERE tag = ?',
      ['Found', geo_x, geo_y, elevation, found_room_tag, current_time, tag]);
  } else {
    const asset_res = await fetch('https://dataworks-7b7x.onrender.com/phone-api/audit/get-asset-info.php',
      {
        method: 'POST',
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ tag: tag,
          dept_id: dept_id
          
         })
      });
    const asset_data = await asset_res.json();
    if (asset_data.status === 'success' && asset_data.data.length > 0) {
      const asset = asset_data.data;
      db.runAsync('INSERT INTO auditing (tag, name, dept_id, serial, po, model, manufacturer, room_tag, type, bus_unit, status, purchase_date, geo_x, geo_y, elevation, found_status, found_room_tag, found_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [tag, asset.asset_name, asset.dept_id, asset.serial_num, asset.po, asset.asset_model, asset.make, asset.room_tag, asset.type2, asset.bus_unit, asset.asset_status, asset.date_added, geo_x, geo_y, elevation, 'Extra', found_room_tag, current_time]);
    } else {
      db.runAsync('INSERT INTO auditing (tag, found_status, geo_x, geo_y, elevation, found_room_tag, found_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tag, 'Extra', geo_x, geo_y, elevation, found_room_tag, current_time]);
    }
  }
}
