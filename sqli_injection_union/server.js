/**
 * server.js
 * -------------------------------------------------------------------
 * Express routes only. No SQL lives in this file -- it just calls
 * vulnerable.js or secure.js depending on which mode was selected,
 * and hands the result to the view. Keeping this file clean of SQL
 * makes it easy to show "here's the wiring" separately from "here's
 * the actual vulnerability / fix".
 * -------------------------------------------------------------------
 */

const express = require("express");
const path = require("path");

const { initializeDb, fetchAllProducts } = require("./database");
const { runVulnerableSearch } = require("./vulnerable");
const { runSecureSearch } = require("./secure");

const app = express();
const PORT = 5000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  renderPage(req, res, { mode: req.query.mode || "secure" });
});

app.post("/", (req, res) => {
  const mode = ["secure", "vulnerable"].includes(req.body.mode)
    ? req.body.mode
    : "secure";

  let queryText = "";
  let results = [];
  let sqlDisplay = "";
  let attackStatus = "";

  if (req.body.action === "search") {
    queryText = req.body.search || "";
    const run = mode === "vulnerable" ? runVulnerableSearch : runSecureSearch;
    ({ results, sqlDisplay, attackStatus } = run(queryText));
  }

  renderPage(req, res, { mode, queryText, results, sqlDisplay, attackStatus });
});

function renderPage(req, res, overrides) {
  res.render("index", {
    mode: "secure",
    queryText: "",
    results: [],
    sqlDisplay: "",
    attackStatus: "",
    history: fetchAllProducts(),
    ...overrides,
  });
}

initializeDb().then(() => {
  app.listen(PORT, "127.0.0.1", () => {
    console.log(`\nSQL Injection lab is running locally: http://127.0.0.1:${PORT}`);
    console.log("Use only this intentionally vulnerable training application.\n");
  });
});
