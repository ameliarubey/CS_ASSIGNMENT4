# SQL Injection – Authentication Bypass (No Native Build Required)

This project contains only SQL Injection Authentication Bypass (Variant 1). UNION-based SQL injection is not included.

## Why this version is different
The earlier version used `better-sqlite3`, which contains a native addon. On some Windows/Node.js versions npm tries to compile it with `node-gyp` and Visual Studio C++ build tools. This version uses `sql.js` (SQLite compiled to WebAssembly), so it does not need `node-gyp` or Visual Studio build tools.

## Structure

- `Without_Mitigation/` – vulnerable login
- `With_Mitigation/` – parameterized-query login
- In both folders, `public/index.html`, `public/style.css`, and `public/script.js` are separate files.
- `server.js` contains the login route.
- `database.js` creates the local demo database.

## Install

Use Node.js 18 or newer. In the main project folder run:

```bash
npm install
```

## Run without mitigation

```bash
npm run start:vulnerable
```

Open `http://localhost:3001`.

## Run with mitigation

Open a second terminal in the same main project folder:

```bash
npm run start:secure
```

Open `http://localhost:3002`.

## Demo

A demo account is created automatically:

- Username: `admin`
- Password: `LabAdmin123!`

Click **Fill demo payload** to insert `admin' --`, enter any password, and click **Test login**.

- Without mitigation: the input changes the SQL statement and demonstrates authentication bypass.
- With mitigation: the exact same input is bound as a value and does not change the SQL statement, so authentication fails.

## Marked code

- `Without_Mitigation/server.js`: search for `VULNERABLE LINE — STRING CONCATENATION`.
- `With_Mitigation/server.js`: search for `MITIGATION — PARAMETERIZED QUERY`.

## Assignment explanation

**Root cause:** The vulnerable code concatenates untrusted input into SQL. SQL syntax inside the input can therefore alter the query's meaning.

**Mitigation implemented:** Parameterized queries. The SQL command uses placeholders, and input values are supplied separately so they are treated as data.

**Other mitigations (theory):**
1. Allow-list validation: accept only expected input formats.
2. Least privilege: give the application's database account only the permissions it needs.
3. Safe errors: show generic errors to users and keep technical details in server-side logs.

## Note
This is a local educational demonstration, not production authentication. It uses a simple demo password to make the SQL concept easy to follow. Real applications must hash passwords and use secure session handling.
