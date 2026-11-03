# Reflected XSS - Web Server Security Assignment (Group 18)

Cyber Security (IT-30001), IIIT Allahabad, Autumn Semester 2026.
Intentionally vulnerable demo application. Run on localhost only.

## Ownership declaration (Table 3)

| Member name | Roll number | Category | Variant implemented |
|---|---|---|---|
| Amelia Rubey | IIT2024206 | Cross-Site Scripting (XSS) | Reflected XSS |

## What this is

"The Gilded Page" is a small Flask bookstore with a search box. The search page repeats the user's query back in the results heading. The app runs in two modes, chosen with the `MODE` environment variable:

- `vulnerable`: the query is inserted into the HTML without encoding (reflected XSS).
- `secure`: the query is output-encoded, plus a Content Security Policy and an HttpOnly session cookie.

## Setup and run

```bash
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

MODE=vulnerable python app.py     # flawed version
MODE=secure     python app.py     # mitigated version
```

Windows PowerShell: `$env:MODE="vulnerable"; python app.py`

The app listens on `http://127.0.0.1:5001` (port 5000 is used by AirPlay on newer Macs).

## (a) Vulnerable implementation

In `app.py`, route `/search`, the `q` parameter from the URL goes straight into the HTML response:

```python
body = f"<h2>Search results for: {q}</h2>"      # no output encoding
```

![Vulnerable code](../Screenshot/1-vulnerable-code.png)

## (b) Working exploit

With the app running in vulnerable mode, open:

```
http://127.0.0.1:5001/search?q=<script>alert('XSS')</script>
```

An alert box appears, so attacker-supplied JavaScript runs in the page. It is *reflected* XSS because the payload travels in the URL and is echoed straight back in the response; nothing is stored on the server. An attacker would deliver it by getting a victim to click such a link.

![Exploit alert](../Screenshot/2-exploit-alert.png)

Impact demo: the script can read the session cookie.

```
http://127.0.0.1:5001/search?q=<script>alert(document.cookie)</script>
```

This displays `session_id=demo-session-12345`, so an attacker could hijack the session.

![Cookie alert](../Screenshot/3-cookie-alert.png)

## (c) Root cause

Untrusted input from the URL is written into the HTML page without output encoding. The browser cannot tell the attacker's `<script>` from the page's own markup, so it parses and executes it. This is the root cause shared by all XSS: data crossing into a code context without being encoded for that context.

## (d) Mitigation implemented: output encoding

In secure mode the query is HTML-encoded before it is placed in the page:

```python
body = f"<h2>Search results for: {escape(q)}</h2>"   # html.escape
```

![Secure code](../Screenshot/4-secure-code.png)

`escape` converts `<`, `>`, `&`, `"` and `'` into the entities `&lt;`, `&gt;`, `&amp;`, `&quot;` and `&#x27;`. The browser therefore sees no `<`, never opens a tag, and displays the payload as plain text. The same payload is now blocked:

![Blocked attempt](../Screenshot/5-blocked-attempt.png)

**Context-aware:** this encoder is correct because the data lands in an HTML body. In other contexts (an unquoted attribute, a JavaScript string, a URL, CSS) different encoding or validation is needed, and using the wrong one can still leave a hole.

Extra layers (defence in depth) enabled in secure mode:

- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'` makes the browser refuse inline scripts.
- The session cookie is set `HttpOnly`, so JavaScript cannot read it via `document.cookie`.

| Mode | Raw `<script>` reflected | Escaped | CSP header | HttpOnly cookie |
|---|---|---|---|---|
| vulnerable | Yes | No | No | No |
| secure | No | Yes | Yes | Yes |

## (e) Other mitigations (theory)

- **Framework auto-escaping.** Template engines such as Jinja2 (autoescape on), React and Angular encode variables by default, so developers cannot forget. Risk returns when auto-escaping is bypassed (`|safe`, `dangerouslySetInnerHTML`).
- **HTML sanitiser.** When users must submit HTML (comments, rich-text editors), a library such as DOMPurify or bleach parses it and strips dangerous tags, attributes and URLs using an allow-list. Encoding would destroy legitimate markup; a sanitiser keeps safe formatting.
- **Content Security Policy.** A response header telling the browser which script sources are allowed. Blocking inline scripts and unknown origins stops many injected payloads from executing. It is a second layer, not a replacement for encoding.
- **HttpOnly cookies.** Hide the cookie from JavaScript, limiting damage (session theft) even if a script runs. It does not stop the script itself.
- **Safe DOM sinks.** On the client, use `textContent` / `setAttribute` instead of `innerHTML`, `document.write` or `eval`, so data is treated as text, not code.
- **Why blacklisting `<script>` fails.** Code can run through other tags and handlers (`<img onerror=...>`, `<svg onload=...>`, `javascript:` URLs), case and encoding tricks, and nested strings. A blacklist can never list them all; encoding neutralises every input.

## Files

```
app.py             Flask app (MODE=vulnerable | secure)
requirements.txt   Flask>=3.0
README.md          This file
```

Screenshots are in the `Screenshot/` folder one level up.
