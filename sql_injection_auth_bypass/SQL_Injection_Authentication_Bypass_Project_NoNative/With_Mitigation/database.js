const initSqlJs = require("sql.js");

// Create the SQLite database using WebAssembly (no native C++ build tools needed).
async function createDatabase() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  // Local dummy account used only for the assignment demonstration.
  db.run("INSERT INTO users (username, password) VALUES (?, ?)", [
    "admin",
    "LabAdmin123!"
  ]);

  return db;
}

module.exports = createDatabase;
