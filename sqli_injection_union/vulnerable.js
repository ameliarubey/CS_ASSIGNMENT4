/**
 * vulnerable.js
 * -------------------------------------------------------------------
 * THE VULNERABLE QUERY -- shown on its own so it's easy to point the
 * camera at just this file during your demo.
 *
 * Root cause (for your write-up):
 * User input is concatenated directly into the SQL string with a
 * template literal, so the database cannot tell the attacker's code
 * apart from ordinary search text -- whatever is typed becomes part
 * of the query itself.
 * -------------------------------------------------------------------
 */

const { runRawQuery } = require("./database");

/**
 * @param {string} queryText - raw text typed into the search box
 * @returns {{ results: object[], sqlDisplay: string, attackStatus: string }}
 */
function runVulnerableSearch(queryText) {
  // --- VULNERABLE LINE: user input spliced straight into the SQL ---
  const sqlDisplay = `SELECT id, name, price FROM products WHERE name LIKE '%${queryText}%'`;

  let results = [];
  let attackStatus = "";

  try {
    results = runRawQuery(sqlDisplay);
    if (queryText.toUpperCase().includes("UNION") && results.length > 0) {
      attackStatus =
        "UNION query executed. The displayed rows may include data from another table.";
    } else {
      attackStatus = "Query executed in vulnerable mode.";
    }
  } catch (err) {
    attackStatus = `SQL error: ${err.message}`;
  }

  return { results, sqlDisplay, attackStatus };
}

module.exports = { runVulnerableSearch };

// Quick manual test from the terminal:
//     node database.js   (first, to create the db)
//     node vulnerable.js
if (require.main === module) {
  const { initializeDb } = require("./database");
  initializeDb().then(() => {
    console.log("--- Normal search: 'Keyboard' ---");
    let { results, sqlDisplay, attackStatus } = runVulnerableSearch("Keyboard");
    console.log("SQL:", sqlDisplay);
    console.log("Status:", attackStatus);
    console.log("Rows:", results);

    console.log("\n--- UNION injection: dump the users table ---");
    const payload = "' UNION SELECT id, username, password FROM users --";
    ({ results, sqlDisplay, attackStatus } = runVulnerableSearch(payload));
    console.log("SQL:", sqlDisplay);
    console.log("Status:", attackStatus);
    console.log("Rows:", results);
  });
}
