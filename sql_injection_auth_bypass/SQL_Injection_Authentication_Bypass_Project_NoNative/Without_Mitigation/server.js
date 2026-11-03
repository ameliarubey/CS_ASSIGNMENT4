const express = require("express");
const path = require("path");
const createDatabase = require("./database");

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function startServer() {
  const db = await createDatabase();

  app.post("/login", (req, res) => {
    const username = String(req.body.username || "");
    const password = String(req.body.password || "");

    // VULNERABLE LINE — STRING CONCATENATION:
    // The username and password are directly joined into the SQL query.
    // This intentionally unsafe code is only for this local classroom lab.
    const sql =
      "SELECT id, username FROM users WHERE username = '" +
      username +
      "' AND password = '" +
      password +
      "'";

    try {
      const result = db.exec(sql);
      const rows = result.length > 0 ? result[0].values : [];
      const user = rows.length > 0 ? { id: rows[0][0], username: rows[0][1] } : null;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Login failed: invalid username or password."
        });
      }

      return res.json({
        success: true,
        message: "Vulnerable login succeeded. Authenticated demo account: " + user.username
      });
    } catch (error) {
      console.error("Lab SQL error:", error.message);
      return res.status(400).json({ success: false, message: "The request could not be processed." });
    }
  });

  app.listen(PORT, "127.0.0.1", () => {
    console.log("Vulnerable demo running at http://localhost:" + PORT);
  });
}

startServer().catch(error => {
  console.error("Could not start vulnerable demo:", error.message);
});
