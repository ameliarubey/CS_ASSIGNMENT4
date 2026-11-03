"""
Reflected XSS demo - Cyber Security (IT-30001) assignment.
INTENTIONALLY VULNERABLE when run in vulnerable mode. Run only on localhost.

Usage:
    MODE=vulnerable python app.py    # flawed version (default)
    MODE=secure     python app.py    # mitigated version
"""
import os
from html import escape
from flask import Flask, request, make_response

app = Flask(__name__)
MODE = os.environ.get("MODE", "vulnerable").lower()

# NOTE: placeholders are __MODE__ and __BODY__ (plain replace, not str.format)
# because the CSS below contains curly braces.
PAGE = """<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Gilded Page</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex;
    justify-content: center; align-items: flex-start; padding: 56px 16px;
    font-family: Georgia, "Times New Roman", serif;
    color: #2b2a29;
    background: #f5f0e8;
  }
  .card {
    width: 100%; max-width: 620px; text-align: center;
    background: #fbf8f3;
    border: 1px solid #d9cdb8;
    outline: 1px solid #d9cdb8; outline-offset: -10px;
    padding: 56px 40px 48px;
    box-shadow: 0 18px 50px rgba(60, 45, 20, 0.10);
  }
  .eyebrow {
    font-size: 11px; letter-spacing: 5px; text-transform: uppercase;
    color: #a68a52; margin: 0 0 14px;
  }
  h1 {
    margin: 0; font-size: 40px; font-weight: normal;
    letter-spacing: 3px; color: #1f1e1d;
  }
  .tagline {
    margin: 10px 0 0; font-size: 15px; font-style: italic; color: #7a7266;
  }
  .rule {
    width: 70px; height: 1px; margin: 26px auto; background: #a68a52;
  }
  .badge {
    display: inline-block; margin: 0 0 28px; padding: 4px 16px;
    font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
    color: #7a6a45; border: 1px solid #cdbd9b;
  }
  form { display: flex; justify-content: center; gap: 0; flex-wrap: wrap; }
  input[type=text] {
    flex: 1 1 260px; max-width: 340px; padding: 13px 18px;
    font-size: 15px; font-family: inherit; color: #2b2a29;
    border: 1px solid #bfb299; border-right: none;
    background: #ffffff; outline: none; border-radius: 0;
  }
  input[type=text]:focus { border-color: #1f1e1d; }
  button {
    padding: 13px 28px; font-size: 11px; letter-spacing: 3px;
    text-transform: uppercase; font-family: inherit; color: #fbf8f3;
    background: #1f1e1d; border: 1px solid #1f1e1d; border-radius: 0;
    cursor: pointer; transition: background 0.2s;
  }
  button:hover { background: #a68a52; border-color: #a68a52; }
  h2 {
    margin: 0 0 6px; font-size: 18px; font-weight: normal;
    font-style: italic; color: #4a453d; word-wrap: break-word;
  }
  ul { list-style: none; padding: 0; margin: 18px auto 0; max-width: 360px; }
  li {
    padding: 14px 0; font-size: 16px; letter-spacing: 1px;
    border-top: 1px solid #e3d9c6;
  }
  li:last-child { border-bottom: 1px solid #e3d9c6; }
  p { color: #7a7266; font-style: italic; }
  .footer {
    margin-top: 40px; font-size: 10px; letter-spacing: 4px;
    text-transform: uppercase; color: #b3a891;
  }
</style>
</head>
<body>
  <div class="card">
    <p class="eyebrow">Booksellers &amp; Curators</p>
    <h1>The Gilded Page</h1>
    <p class="tagline">Rare and considered reading</p>
    <div class="rule"></div>
    <span class="badge">__MODE__ mode</span>
    <form action="/search" method="GET">
      <input type="text" name="q" placeholder="Search the collection">
      <button type="submit">Search</button>
    </form>
    <div class="rule"></div>
    __BODY__
    <div class="footer">Est. 2026 &middot; IT-30001</div>
  </div>
</body>
</html>"""

BOOKS = ["Operating Systems", "Computer Networks", "Cryptography Basics", "Web Security 101"]


def render(body):
    # Replace MODE first so user-controlled text in body is never re-scanned.
    return PAGE.replace("__MODE__", MODE).replace("__BODY__", body)


@app.route("/")
def index():
    resp = make_response(render("<p>Welcome. Search the collection above.</p>"))
    # Demo session cookie. In secure mode it is also HttpOnly (extra mitigation).
    resp.set_cookie("session_id", "demo-session-12345", httponly=(MODE == "secure"))
    return resp


@app.route("/search")
def search():
    q = request.args.get("q", "")
    results = [b for b in BOOKS if q.lower() in b.lower()]

    if MODE == "vulnerable":
        # (a) VULNERABLE: user input is placed directly into the HTML response
        # with no output encoding -> reflected XSS.
        body = f"<h2>Search results for: {q}</h2>"
    else:
        # (d) MITIGATION: context-aware output encoding (HTML-escape) of
        # untrusted data before it is reflected into the HTML body.
        body = f"<h2>Search results for: {escape(q)}</h2>"

    body += "<ul>" + "".join(f"<li>{escape(b)}</li>" for b in results) + "</ul>"
    if not results:
        body += "<p>No titles found.</p>"

    resp = make_response(render(body))
    resp.set_cookie("session_id", "demo-session-12345", httponly=(MODE == "secure"))
    if MODE == "secure":
        # Defence in depth: CSP blocks inline <script> even if encoding were missed.
        # Inline styles are allowed so the page theme still renders; scripts are not.
        resp.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'"
        )
    return resp


if __name__ == "__main__":
    # Port 5001: macOS AirPlay Receiver occupies 5000 on newer Macs.
    app.run(host="127.0.0.1", port=5001, debug=False)