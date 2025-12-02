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
  //await initDb();
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
        await db.execAsync(`DROP TABLE IF EXISTS auditing;`);

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
  //db.closeAsync();
}

export async function insertIntoAuditingExcel([item], assigned_to) {
  try {
  const db = await getDb();

  await db.runAsync(
    `INSERT OR REPLACE INTO auditing 
      (tag, name, dept_id, serial, po, location, bus_unit, assigned_to, purchase_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      item.asset_tag, item.asset_name, item.dept_id, item.serial_num || 'N/A', item.po || 'N/A' , item.room_tag, item.bus_unit, assigned_to || 'N/A', item.date_added || 'N/A'
    ]
  );
} catch (error) {
  console.error("Error inserting into auditing:", error);
}
  //db.closeAsync();
}

export async function insertIntoAuditingProfile([item]) {
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
  //db.closeAsync();
}

export async function selectAllAuditing() {
  const db = await getDb();
  return db.getAllAsync(`SELECT * FROM auditing ORDER BY tag DESC`);
}

export async function selectAuditingCount() {
  const db = await getDb();
  return db.getFirstAsync(`SELECT COUNT(*) as count FROM auditing`);
}

export async function deleteAuditingTable() {
  const db = await getDb();
  await db.runAsync('DELETE FROM auditing');
  await db.runAsync(`DELETE FROM sqlite_sequence WHERE name='auditing'`);
  console.log("Auditing table cleared.");
}
export async function selectSingleAsset(tag) {
  const db = await getDb();
  return db.getFirstAsync(`SELECT * FROM auditing WHERE tag = ? ORDER BY tag DESC`, [tag]);
}

export async function updateAuditingFoundStatus(tag, geo_x, geo_y, elevation, found_room_tag, dept_id) {
  console.log("updateAuditingFoundStatus called with:", tag, geo_x, geo_y, elevation, found_room_tag, dept_id);
  const db = await getDb();
  console.log("updateAuditingFoundStatus called with:", tag, geo_x, geo_y, elevation, found_room_tag, dept_id, in_audit);
  const current_time = new Date().toISOString();
  const in_audit = await db.getFirstAsync(`SELECT * FROM auditing WHERE tag = ?`, [tag]);
  if (in_audit) {
    await db.runAsync('UPDATE auditing SET found_status = ?, geo_x = ?, geo_y = ?, elevation = ?, found_room_tag = ?, found_timestamp = ? WHERE tag = ?',
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
    console.log("Asset data response:", asset_data);
    if (asset_data.status === 'success' && asset_data.data.length > 0) {
      const asset = asset_data.data;
      await db.runAsync('INSERT INTO auditing (tag, name, serial, dept_id, serial, po, model, manufacturer, room_tag, type, bus_unit, status, purchase_date, geo_x, geo_y, elevation, found_status, found_room_tag, found_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [tag, asset.asset_name, asset.serial_num, asset.dept_id, asset.serial_num, asset.po, asset.asset_model, asset.make, asset.room_tag, asset.type2, asset.bus_unit, asset.asset_status, asset.date_added, geo_x, geo_y, elevation, 'Extra', found_room_tag, current_time]);
    } else {
      console.log("Asset not found in server, inserting with minimal info");
      try {
        await db.runAsync(
          'INSERT INTO auditing (tag, name, serial, found_status, geo_x, geo_y, elevation, found_room_tag, found_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(tag) DO UPDATE SET found_status = excluded.found_status, geo_x = excluded.geo_x, geo_y = excluded.geo_y, elevation = excluded.elevation, found_room_tag = excluded.found_room_tag, found_timestamp = excluded.found_timestamp',
          [tag, 'Unknown Asset', 'N/A', 'Extra', geo_x, geo_y, elevation, found_room_tag, current_time]
        );
        console.log('Insert successful!');
      } catch (err) {
        console.error('Error inserting row:', err);
      }
    }
  }
}
