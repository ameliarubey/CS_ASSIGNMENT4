const express = require("express");
const session = require("express-session");
const cors = require("cors");
const crypto = require("crypto");
const https = require("https");
const fs = require("fs");
const path = require("path");

const app = express();

// Allow our React frontend to communicate with backend
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Session configuration
app.use(session({
    secret: "csrf-demo-secret-change-this",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: true,      // required by spec whenever sameSite is "none"
        sameSite: "none",  // deliberately permissive: this is the vulnerability under test,
                            // not "lax", which would block the attack on its own
        maxAge: 30 * 60 * 1000
    }
}));

// In-memory request log, shown in the UI so the attack is visible, not just the result.
const log = [];
function record(req, { tokenStatus, outcome, ok }) {
    log.unshift({
        time: new Date().toLocaleTimeString(),
        origin: req.headers.origin || "(none)",
        secFetchSite: req.headers["sec-fetch-site"] || "(none)",
        cookieSent: Boolean(req.session.userId),
        tokenStatus,
        outcome,
        ok
    });
    log.length = Math.min(log.length, 8);
}

app.get("/api/log", (req, res) => res.json(log));
app.post("/api/log/clear", (req, res) => { log.length = 0; res.sendStatus(204); });

// Demo login endpoint
app.post("/api/login", (req, res) => {
    req.session.userId = 1;
    req.session.email = "victim@example.com";
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    log.length = 0;

    res.json({
        message: "Login successful",
        email: req.session.email,
        csrfToken: req.session.csrfToken
    });
});

// Check current user
app.get("/api/me", (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Not logged in"
        });
    }

    res.json({
        email: req.session.email
    });
});

// VULNERABLE POST ENDPOINT
app.post("/api/change-email-vulnerable", (req, res) => {

    if (!req.session.userId) {
        record(req, { tokenStatus: "not checked", outcome: "401 no session", ok: false });
        return res.status(401).send("Please login first");
    }

    const newEmail = req.body.email;

    // No CSRF token validation!
    req.session.email = newEmail;

    record(req, { tokenStatus: "not checked", outcome: "200 email changed", ok: true });
    res.send("Email successfully changed to " + newEmail);
});

// Generate a CSRF token for the current session
app.get("/api/csrf-token", (req, res) => {

    if (!req.session.userId) {
        return res.status(401).json({
            message: "Please login first"
        });
    }

    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    }

    res.json({
        csrfToken: req.session.csrfToken
    });
});

// SECURE POST ENDPOINT
app.post("/api/change-email-secure", (req, res) => {

    if (!req.session.userId) {
        record(req, { tokenStatus: "not checked", outcome: "401 no session", ok: false });
        return res.status(401).send("Please login first");
    }

    const submittedToken = req.body.csrfToken;
    const actualToken = req.session.csrfToken;

    // Validate CSRF token
    if (
        !submittedToken ||
        !actualToken ||
        submittedToken !== actualToken
    ) {
        record(req, { tokenStatus: submittedToken ? "invalid" : "missing", outcome: "403 blocked", ok: false });
        return res.status(403).send("CSRF validation failed!");
    }

    const newEmail = req.body.email;

    req.session.email = newEmail;

    record(req, { tokenStatus: "valid", outcome: "200 email changed", ok: true });
    res.send("Email successfully changed to " + newEmail);
});

// Real TLS, not plain HTTP: a Secure cookie needs an actual encrypted connection, and some
// browsers (depending on version/policy) don't honour the usual http://localhost exception.
// A self-signed cert avoids relying on that exception at all.
const credentials = {
    key: fs.readFileSync(path.join(__dirname, "key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "cert.pem"))
};

https.createServer(credentials, app).listen(3000, () => {
    console.log("Backend running at https://localhost:3000");
});