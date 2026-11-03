"""
OS Command Injection — demo app for IT-30001 assignment
Two variants:
  1. In-band   : /ping-vulnerable   (fixed: /ping-safe)
  2. Blind      : /check-vulnerable (fixed: /check-safe)

Run with:  python app.py
Then open: http://127.0.0.1:5000/
"""

import os
import re
import subprocess
import time
from flask import Flask, request, render_template_string

app = Flask(__name__)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")

IS_WINDOWS = os.name == "nt"

# Windows cmd.exe doesn't treat ";" as a command separator (use "&" instead),
# and has no "sleep" command (use "ping -n 6 127.0.0.1 >nul" as a ~5s delay).
if IS_WINDOWS:
    _CHAIN_RAW = "127.0.0.1 & whoami"
    _CHAIN_ENC = "127.0.0.1%20%26%20whoami"
    _DELAY_RAW = "nofile & ping -n 6 127.0.0.1 >nul & echo x"
    _DELAY_ENC = "nofile%20%26%20ping%20-n%206%20127.0.0.1%20%3Enul%20%26%20echo%20x"
else:
    _CHAIN_RAW = "127.0.0.1;whoami"
    _CHAIN_ENC = "127.0.0.1;whoami"
    _DELAY_RAW = "nofile; sleep 5; echo x"
    _DELAY_ENC = "nofile%3B%20sleep%205%3B%20echo%20x"

INDEX_HTML = f"""
<h2>OS Command Injection Demo{' (Windows mode)' if IS_WINDOWS else ''}</h2>

<h3>Variant 1: In-band (ping tool)</h3>
<p>Normal use:</p>
<ul>
  <li>Vulnerable: <a href="/ping-vulnerable?host=127.0.0.1">/ping-vulnerable?host=127.0.0.1</a></li>
  <li>Safe: <a href="/ping-safe?host=127.0.0.1">/ping-safe?host=127.0.0.1</a></li>
</ul>
<p>Exploit (type this in the address bar to show it live):</p>
<ul>
  <li>Vulnerable: <a href="/ping-vulnerable?host={_CHAIN_ENC}">/ping-vulnerable?host={_CHAIN_RAW}</a></li>
  <li>Same payload, safe route: <a href="/ping-safe?host={_CHAIN_ENC}">/ping-safe?host={_CHAIN_RAW}</a></li>
</ul>

<h3>Variant 2: Blind (file existence checker)</h3>
<p>Normal use:</p>
<ul>
  <li>Vulnerable: <a href="/check-vulnerable?file=notes.txt">/check-vulnerable?file=notes.txt</a></li>
  <li>Safe: <a href="/check-safe?file=notes.txt">/check-safe?file=notes.txt</a></li>
</ul>
<p>Exploit — open DevTools Network tab first, then click this and watch the load time:</p>
<ul>
  <li>Vulnerable: <a href="/check-vulnerable?file={_DELAY_ENC}">/check-vulnerable?file={_DELAY_RAW}</a></li>
  <li>Same payload, safe route: <a href="/check-safe?file={_DELAY_ENC}">/check-safe?file={_DELAY_RAW}</a></li>
</ul>
"""


@app.route("/")
def index():
    return render_template_string(INDEX_HTML)


# ---------------------------------------------------------------------------
# VARIANT 1 — IN-BAND (command output returned to the user)
# ---------------------------------------------------------------------------

@app.route("/ping-vulnerable")
def ping_vulnerable():
    """
    VULNERABLE: user input is concatenated into a shell string and
    executed with shell=True. Shell metacharacters (; & | `` $() )
    let the attacker chain arbitrary commands, and the output is
    returned directly to the browser (hence "in-band").
    """
    host = request.args.get("host", "")
    count_flag = "-n 1" if IS_WINDOWS else "-c 1"
    cmd = f"ping {count_flag} {host}"              # <-- string concatenation
    output = subprocess.getoutput(cmd)             # <-- runs via /bin/sh (or cmd.exe on Windows)
    return f"<pre>$ {cmd}\n\n{output}</pre>"


@app.route("/ping-safe")
def ping_safe():
    """
    MITIGATION: avoid the shell entirely (argument vector, no shell=True)
    + allow-list validation of the input before it is ever used.
    """
    host = request.args.get("host", "")

    # Allow-list: only characters valid in a hostname or IPv4 address
    if not re.fullmatch(r"[A-Za-z0-9.\-]{1,253}", host):
        return "Invalid host: rejected by input validation", 400

    count_flag = "-n" if IS_WINDOWS else "-c"
    try:
        result = subprocess.run(
            ["ping", count_flag, "1", host],   # argument vector, no shell
            capture_output=True,
            text=True,
            timeout=5,
            shell=False,
        )
        return f"<pre>{result.stdout or result.stderr}</pre>"
    except subprocess.TimeoutExpired:
        return "Request timed out", 504


# ---------------------------------------------------------------------------
# VARIANT 2 — BLIND (no command output returned; only a yes/no style result)
# ---------------------------------------------------------------------------

@app.route("/check-vulnerable")
def check_vulnerable():
    """
    VULNERABLE: result of the command is NOT shown to the user, only
    "FOUND"/"NOTFOUND" (or nothing at all). This is still exploitable
    via a *blind* technique: the attacker injects a time-delay command
    (e.g. `sleep 5`) and infers success from how long the response
    takes, without ever seeing command output directly.
    """
    filename = request.args.get("file", "")
    devnull = "NUL" if os.name == "nt" else "/dev/null"
    # benign command differs by OS, but both are still built via string
    # concatenation and handed to a shell -> both are injectable.
    # Deliberately no quotes around the path: that's what lets shell
    # metacharacters in `filename` (;, &, |, etc.) break out, which is
    # the whole point of the demo.
    if os.name == "nt":
        cmd = f"dir {UPLOAD_DIR}\\{filename} > {devnull} 2>&1"
    else:
        cmd = f"test -f {UPLOAD_DIR}/{filename} && echo FOUND || echo NOTFOUND > {devnull} 2>&1"
    start = time.time()
    try:
        # timeout guards against the demo app itself hanging forever;
        # a real attacker-controlled command has no such safety net
        subprocess.run(cmd, shell=True, timeout=10)      # <-- shell injection, output discarded
    except subprocess.TimeoutExpired:
        pass
    elapsed = time.time() - start          # not returned to the client -
    print(f"[server log only] /check-vulnerable took {elapsed:.2f}s")  # the attacker never sees this
    return "Check submitted."


@app.route("/check-safe")
def check_safe():
    """
    MITIGATION: avoid the shell completely — do the existence check with
    a direct filesystem call instead of spawning a process, after
    allow-list validation and path normalisation to also stop traversal.
    """
    filename = request.args.get("file", "")

    if not re.fullmatch(r"[A-Za-z0-9_\-.]{1,100}", filename):
        return "Invalid filename: rejected by input validation", 400

    safe_path = os.path.normpath(os.path.join(UPLOAD_DIR, filename))
    if not safe_path.startswith(os.path.abspath(UPLOAD_DIR)):
        return "Invalid path", 400

    exists = os.path.isfile(safe_path)
    return "FOUND" if exists else "NOTFOUND"


if __name__ == "__main__":
    app.run(debug=True, port=5000)
