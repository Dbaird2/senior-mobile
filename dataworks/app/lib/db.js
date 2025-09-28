import * as SQLite from "expo-sqlite";

// Single DB instance
const db = SQLite.openDatabase("app.db");

// Ensure table exists
export function initDb() {
  db.transaction(tx => {
    tx.executeSql(
      "CREATE TABLE IF NOT EXISTS auth (id INTEGER PRIMARY KEY NOT NULL, k TEXT NOT NULL);"
    );
  });
}

// Save/replace the key
export function saveAuthKey(key) {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql("DELETE FROM auth;");
      tx.executeSql(
        "INSERT INTO auth (k) VALUES (?);",
        [key],
        () => resolve(),
        (_tx, err) => (reject(err), false)
      );
    });
  });
}

// Read key (returns string | null)
export function getAuthKey() {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        "SELECT k FROM auth LIMIT 1;",
        [],
        (_tx, res) => {
          const rows = res.rows?._array || [];
          resolve(rows.length ? rows[0].k : null);
        },
        (_tx, err) => (reject(err), false)
      );
    });
  });
}

// Clear key
export function clearAuthKey() {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql("DELETE FROM auth;", [], () => resolve(), (_tx, err) => (reject(err), false));
    });
  });
}
