/**
 * database.js
 * -------------------------------------------------------------------
 * Everything related to the database lives here, separate from the
 * vulnerable/secure query logic, so you can show "this is just the
 * data setup, nothing exploitable here" as its own file in your demo.
 *
 * Uses sql.js -- a real SQLite engine compiled to WebAssembly, run
 * fully in-process (no native build step, no separate DB server).
 * It is queried with plain SQL strings, exactly like the Python
 * sqlite3 version, so the vulnerability/fix logic is identical.
 *
 * Creates two tables:
 *   - products  -> public data the search feature is SUPPOSED to return
 *   - users     -> sensitive data an attacker is trying to steal
 * -------------------------------------------------------------------
 */

const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "data", "lab.sqlite");

let db = null; // in-memory sql.js database instance (persisted to DB_FILE)

async function initializeDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      price TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      password TEXT NOT NULL
    )
  `);

  const productCount = db.exec("SELECT COUNT(*) FROM products");
  if (productCount[0].values[0][0] === 0) {
    const stmt = db.prepare(
      "INSERT INTO products (id, name, price) VALUES (?, ?, ?)"
    );
    [
      [1, "Keyboard", "799"],
      [2, "Mouse", "399"],
      [3, "Monitor", "8999"],
      [4, "USB Drive", "499"],
    ].forEach((row) => stmt.run(row));
    stmt.free();
  }

  const userCount = db.exec("SELECT COUNT(*) FROM users");
  if (userCount[0].values[0][0] === 0) {
    // Fictional lab-only credentials, not real accounts.
    const stmt = db.prepare(
      "INSERT INTO users (id, username, password) VALUES (?, ?, ?)"
    );
    [
      [1, "alice_demo", "demo_alice_123"],
      [2, "bob_demo", "demo_bob_456"],
      [3, "charlie_demo", "demo_charlie_789"],
    ].forEach((row) => stmt.run(row));
    stmt.free();
  }

  persist();
}

/** Save the in-memory DB to disk so data survives server restarts. */
function persist() {
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

/** Run a raw SQL string with no bound parameters (used by vulnerable.js). */
function runRawQuery(sql) {
  const result = db.exec(sql);
  return rowsFromResult(result);
}

/** Run a parameterized SQL query (used by secure.js). */
function runParamQuery(sql, params) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function fetchAllProducts() {
  return runParamQuery("SELECT id, name, price FROM products ORDER BY id", []);
}

/** Convert sql.js's columns/values result shape into an array of row objects. */
function rowsFromResult(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((row) =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
}

module.exports = {
  initializeDb,
  runRawQuery,
  runParamQuery,
  fetchAllProducts,
};

// Run this file directly to (re)create the database on its own:
//     node database.js
if (require.main === module) {
  initializeDb().then(() => {
    console.log(`[+] ${DB_FILE} ready with 'products' and 'users' tables.`);
  });
}
