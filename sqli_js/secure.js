/**
 * secure.js
 * -------------------------------------------------------------------
 * THE MITIGATION -- shown on its own so you can put this file right
 * next to vulnerable.js and compare the two lines that matter.
 *
 * Fix: use a parameterized query. The '?' is a placeholder; the DB
 * driver binds queryText as a single literal VALUE, never as SQL
 * code, so there is nothing for UNION/--/quotes to break out of.
 * -------------------------------------------------------------------
 */

const { runParamQuery } = require("./database");

/**
 * Same signature and return shape as runVulnerableSearch, so server.js
 * can swap between them with one line.
 */
function runSecureSearch(queryText) {
  // --- SECURE LINE: '?' placeholder, input passed as a bound parameter ---
  const sql = "SELECT id, name, price FROM products WHERE name LIKE ?";
  const sqlDisplay = `${sql} -- parameter: '%${queryText}%' (bound, not concatenated)`;

  let results = [];
  let attackStatus = "";

  try {
    results = runParamQuery(sql, [`%${queryText}%`]);
    attackStatus = queryText.toUpperCase().includes("UNION")
      ? "Secure query executed. The UNION payload was treated as ordinary text."
      : "Secure parameterized query executed.";
  } catch (err) {
    attackStatus = `SQL error: ${err.message}`;
  }

  return { results, sqlDisplay, attackStatus };
}

module.exports = { runSecureSearch };

// Quick manual test from the terminal:
//     node database.js   (first, to create the db)
//     node secure.js
if (require.main === module) {
  const { initializeDb } = require("./database");
  initializeDb().then(() => {
    console.log("--- Normal search: 'Keyboard' ---");
    let { results, sqlDisplay, attackStatus } = runSecureSearch("Keyboard");
    console.log("SQL:", sqlDisplay);
    console.log("Status:", attackStatus);
    console.log("Rows:", results);

    console.log("\n--- Same UNION payload, now blocked ---");
    const payload = "' UNION SELECT id, username, password FROM users --";
    ({ results, sqlDisplay, attackStatus } = runSecureSearch(payload));
    console.log("SQL:", sqlDisplay);
    console.log("Status:", attackStatus);
    console.log("Rows:", results);
  });
}
