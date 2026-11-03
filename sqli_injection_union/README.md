# UNION-Based SQL Injection — Node.js / Express / HTML / CSS Version

Same lab, same vulnerable/secure split, rebuilt entirely in JavaScript.
Uses `sql.js` — a real SQLite engine (compiled to WebAssembly) — as the
database, so the "database" here is an actual SQL engine, not a mock.

## Files
| File | Purpose |
|---|---|
| `database.js` | Creates `data/lab.sqlite`, defines `products` (public) and `users` (sensitive) tables. No query-building logic — just setup and two low-level helpers (`runRawQuery`, `runParamQuery`). |
| `vulnerable.js` | The exploitable query: a template literal splices the search text straight into the SQL string. Run alone: `node vulnerable.js`. |
| `secure.js` | The fixed query: a `?` placeholder binds the search text as data, never as SQL. Run alone: `node secure.js`. |
| `server.js` | Express routes only — no SQL in this file. Picks `vulnerable.js` or `secure.js` based on which mode button was clicked. |
| `views/index.ejs` | The page template (same layout/behaviour as the original Flask/Jinja page, converted to EJS). |
| `public/style.css` | Unchanged CSS from the original project. |

## Run
```bash
npm install
node server.js
# open http://127.0.0.1:5000
```

Or test the query logic alone, no browser/server needed:
```bash
node database.js     # creates/seeds data/lab.sqlite
node vulnerable.js
node secure.js
```

## Demo payload (click it in the UI, or paste into the search box)
```
' UNION SELECT id, username, password FROM users --
```

## What happens (verified by running it)
- **Vulnerable mode:** the query becomes
  `SELECT id, name, price FROM products WHERE name LIKE '%' UNION SELECT id, username, password FROM users --%'`
  and the results table shows `alice_demo / demo_alice_123`,
  `bob_demo / demo_bob_456`, `charlie_demo / demo_charlie_789` — the
  `users` table, leaked through the product-search feature.
- **Secure mode:** the same payload is bound as one literal string to
  the `?` placeholder. SQLite searches for a product whose name
  literally contains that whole string, finds none, and returns zero
  rows. `users` is never touched.

## Root cause (1–2 lines)
`vulnerable.js` concatenates user input directly into the SQL string
with a template literal, so the database cannot tell the attacker's
code apart from ordinary search text. `secure.js` fixes this with a
parameterized query (`?` placeholder), so the input is always bound
as data, never interpreted as SQL.
