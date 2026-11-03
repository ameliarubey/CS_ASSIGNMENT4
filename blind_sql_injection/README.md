# OS Command Injection — Assignment Deliverable

IT-30001 Cyber Security, Autumn 2026 — Web Server Security Assignment
Category: **OS Command Injection**

## 1. Setup

```bash
pip install -r requirements.txt
python app.py
# open http://127.0.0.1:5000/
```

Routes:

| Route | Variant | Status |
|---|---|---|
| `/ping-vulnerable` | In-band | Vulnerable |
| `/ping-safe` | In-band | Mitigated |
| `/check-vulnerable` | Blind | Vulnerable |
| `/check-safe` | Blind | Mitigated |

## 2. Variant 1 — In-band command injection

**Vulnerable code** (`app.py`, `ping_vulnerable`): the `host` query
parameter is string-concatenated into a shell command and run with
`subprocess.getoutput`, which invokes `/bin/sh -c "..."`.

**Exploit:**
```
GET /ping-vulnerable?host=127.0.0.1;whoami
```
The `;` ends the `ping` command and starts a second one. The output of
`whoami` is returned straight to the browser — hence "in-band". Run
`exploit_inband.sh` for more payloads (`&&`, reading a file, etc.).

**Root cause:** untrusted input is concatenated directly into a string
that is handed to a shell interpreter, so shell metacharacters
(`; & | $() \`\``) are interpreted as command separators instead of
literal text.

**Mitigation implemented** (`ping_safe`): two layers —
1. Allow-list validation: the host must match `[A-Za-z0-9.\-]{1,253}`,
   so `;`, `&`, `|`, spaces, etc. are rejected outright (HTTP 400).
2. Avoid the shell: even if validation were bypassed, `subprocess.run`
   is called with an **argument vector** (`["ping", "-c", "1", host]`)
   and `shell=False`, so there is no shell to interpret metacharacters
   in the first place — the string is passed as a single literal
   argument to `ping`.

Same payload (`host=127.0.0.1;whoami`) against `/ping-safe` → `400
Invalid host`, confirmed by test above.

## 3. Variant 2 — Blind command injection (time-based)

**Vulnerable code** (`check_vulnerable`): the `file` parameter is
concatenated into a shell command (`test -f ... && echo FOUND || echo
NOTFOUND`) run via `os.system`. The command's actual output is never
returned to the client — only a generic "Check submitted" message —
so the attacker gets no direct feedback.

**Exploit:** inject a time-delay command and measure the response
time instead of reading output:
```
GET /check-vulnerable?file=nofile; sleep 3; echo x
```
Observed: baseline response ≈ 5 ms, injected response ≈ 3.0 s slower
→ the extra delay proves the `sleep 3` ran, confirming injection
*without seeing any command output* (classic blind / time-based
detection). See `exploit_blind.py` for the automated version with
timing comparison.

**Root cause:** same as Variant 1 — untrusted input reaches a shell
via string concatenation — but because the output isn't shown, the
only side channel available to the attacker is timing (or, in a real
deployment, DNS/HTTP out-of-band callbacks).

**Mitigation implemented** (`check_safe`): avoid the shell entirely —
instead of spawning any process, the check is done with a direct
filesystem call (`os.path.isfile`) after allow-list validation of the
filename and path normalisation/containment to also block path
traversal (`../`). There is no command for an attacker to inject into
because no shell or external process is invoked at all.

Same payload against `/check-safe` → `400 Invalid filename`.

## 4. Other mitigations (theory, for the viva)

Only one mitigation was implemented per variant above (avoiding the
shell with an argument vector / avoiding the shell entirely). The
lecture slides also cover these alternatives:

- **Parameterised execution with an argument vector.** Even when a
  process must be spawned, pass arguments as a list
  (`subprocess.run([...], shell=False)`) rather than a formatted
  string. The OS execs the program directly with distinct argv
  entries, so there is no shell parsing step for metacharacters to
  exploit. This is what `/ping-safe` does.
- **Allow-list input validation.** Define exactly what a legitimate
  value looks like (e.g. a regex for hostnames, or a fixed set of
  permitted filenames/commands) and reject anything that doesn't
  match, rather than trying to blacklist "dangerous" characters —
  blacklists are easy to bypass with encoding tricks, allow-lists
  are not.
- **Least privilege.** Run the web server process, and any
  subprocess it spawns, under an account with the minimum OS
  permissions needed (no root, restricted filesystem access, no
  access to sensitive binaries). Limits the blast radius even if
  injection succeeds.
- **Avoid the shell entirely where possible.** The strongest
  mitigation: don't call out to an external command/shell at all if
  the same task can be done with a library or OS API call (as in
  `/check-safe`, which uses `os.path.isfile` instead of `test -f`
  via a shell).

## 5. Ownership declaration

| Member name | Roll number | Category | Variant implemented |
|---|---|---|---|
| *(fill in)* | *(fill in)* | OS Command Injection | In-band |
| *(fill in)* | *(fill in)* | OS Command Injection | Blind (time-based) |

## 6. Files

- `app.py` — Flask app with all four routes
- `exploit_inband.sh` — curl-based exploit for the in-band variant
- `exploit_blind.py` — timing-based exploit for the blind variant
- `uploads/notes.txt` — sample file used by the blind variant
- `requirements.txt`

## 7. Suggested video script (2–3 min per member)

1. (15s) State the variant and show the vulnerable route's code.
2. (30–45s) Run the exploit live, point out the result (leaked output
   for in-band; the timing difference for blind).
3. (15s) State the root cause in one or two lines.
4. (30–45s) Run the *same* payload against the safe route, show it
   fails (400 / no delay), point at the fix in code.
5. (30s) One paragraph on the other mitigation options from the
   slides and why they'd also work.
