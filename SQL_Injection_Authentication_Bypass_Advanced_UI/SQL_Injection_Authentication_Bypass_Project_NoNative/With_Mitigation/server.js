const express = require("express");
const path = require("path");
const createDatabase = require("./database");

const app = express();
const PORT = 3002;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function startServer() {
  const db = await createDatabase();

  app.post("/login", (req, res) => {
    const username = String(req.body.username || "");
    const password = String(req.body.password || "");

    try {
      // MITIGATION — PARAMETERIZED QUERY:
      // The question marks are placeholders. User input is passed separately.
      // Therefore input cannot become part of the SQL command itself.
      const statement = db.prepare(
        "SELECT id, username FROM users WHERE username = ? AND password = ?"
      );

      statement.bind([username, password]);
      const userExists = statement.step();
      const user = userExists ? statement.getAsObject() : null;
      statement.free();

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Login failed: invalid username or password. The payload was treated as ordinary text."
        });
      }

      return res.json({
        success: true,
        message: "Login successful. Welcome, " + user.username + "!"
      });
    } catch (error) {
      console.error("Database error:", error.message);
      return res.status(500).json({ success: false, message: "An internal error occurred." });
    }
  });

  app.listen(PORT, "127.0.0.1", () => {
    console.log("Secure demo running at http://localhost:" + PORT);
  });
}

startServer().catch(error => {
  console.error("Could not start secure demo:", error.message);
});
