import { useEffect, useRef, useState } from "react";

const API = "https://localhost:3000";

function App() {
    const [email, setEmail] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [csrfToken, setCsrfToken] = useState("");
    const [message, setMessage] = useState("");
    const [loggedIn, setLoggedIn] = useState(false);
    const [log, setLog] = useState([]);
    const pollRef = useRef(null);

    async function login() {
        const response = await fetch(`${API}/api/login`, {
            method: "POST",
            credentials: "include"
        });
        const data = await response.json();
        setMessage(data.message);
        setLoggedIn(true);
        setEmail(data.email);
        setCsrfToken(data.csrfToken);
        setLog([]);
    }

    async function getUser() {
        const response = await fetch(`${API}/api/me`, { credentials: "include" });
        if (!response.ok) {
            setEmail("");
            setLoggedIn(false);
            return;
        }
        const data = await response.json();
        setEmail(data.email);
        setLoggedIn(true);
    }

    async function refreshLog() {
        const response = await fetch(`${API}/api/log`, { credentials: "include" });
        if (response.ok) setLog(await response.json());
    }

    // Normal vulnerable request
    async function changeEmailVulnerable() {
        const body = new URLSearchParams();
        body.append("email", newEmail);

        const response = await fetch(`${API}/api/change-email-vulnerable`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body
        });

        setMessage(await response.text());
        await getUser();
        await refreshLog();
    }

    // Protected request
    async function changeEmailSecure() {
        const body = new URLSearchParams();
        body.append("email", newEmail);
        body.append("csrfToken", csrfToken);

        const response = await fetch(`${API}/api/change-email-secure`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body
        });

        setMessage(await response.text());
        await getUser();
        await refreshLog();
    }

    // Poll the log while logged in, so a cross-site attack (triggered outside this tab)
    // still shows up here without a manual refresh.
    useEffect(() => {
        getUser();
        return () => clearInterval(pollRef.current);
    }, []);

    useEffect(() => {
        clearInterval(pollRef.current);
        if (loggedIn) {
            refreshLog();
            pollRef.current = setInterval(refreshLog, 1500);
        }
        return () => clearInterval(pollRef.current);
    }, [loggedIn]);

    return (
        <div className="page">
            <header className="topbar">
                <span className="dot" aria-hidden="true" />
                <h1>CSRF &mdash; POST-based forged action</h1>
            </header>

            <main className="layout">
                <section className="panel">
                    <h2>Victim session</h2>

                    {!loggedIn ? (
                        <>
                            <p className="muted">Not signed in.</p>
                            <button className="primary" onClick={login}>Sign in as demo user</button>
                        </>
                    ) : (
                        <>
                            <p className="muted">Signed in</p>
                            <p className="email">{email}</p>

                            <label htmlFor="newEmail">New email</label>
                            <input
                                id="newEmail"
                                type="email"
                                placeholder="name@example.com"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                            />

                            <div className="actions">
                                <button className="danger" onClick={changeEmailVulnerable}>
                                    Submit (vulnerable endpoint)
                                </button>
                                <button className="safe" onClick={changeEmailSecure}>
                                    Submit (secure endpoint)
                                </button>
                            </div>

                            <p className="token">csrf token: <code>{csrfToken.slice(0, 16)}&hellip;</code></p>
                        </>
                    )}

                    {message && <p className="message">{message}</p>}
                </section>

                <section className="panel">
                    <h2>Run the attack</h2>
                    <ol className="steps">
                        <li>Sign in above, in this browser.</li>
                        <li>Open <code>attacker/attacker.html</code> directly (double-click it, or serve it on another port) in a new tab.</li>
                        <li>It auto-submits a hidden form to the vulnerable endpoint. Watch the log on the right update, with no interaction on this page.</li>
                    </ol>
                    <p className="callout bad">
                        The vulnerable endpoint trusts the session cookie alone. The browser attaches it to
                        the cross-site request automatically, so the attacker&rsquo;s page never needs your
                        password or this tab.
                    </p>
                    <p className="callout ok">
                        The secure endpoint also requires <code>csrfToken</code> in the request body. The
                        attacker&rsquo;s page has no way to read it, so the same forged request gets a 403.
                    </p>
                </section>

                <section className="panel wide">
                    <h2>Request log</h2>
                    <p className="muted">Every call to either <code>/api/change-email-*</code> endpoint, newest first.</p>
                    {log.length === 0 ? (
                        <p className="muted">No requests yet.</p>
                    ) : (
                        <div className="tablewrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Time</th><th>Origin</th><th>Sec-Fetch-Site</th>
                                        <th>Cookie</th><th>Token</th><th>Result</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {log.map((r, i) => (
                                        <tr key={i}>
                                            <td>{r.time}</td>
                                            <td className="mono">{r.origin}</td>
                                            <td className="mono">{r.secFetchSite}</td>
                                            <td>{r.cookieSent ? "sent" : "none"}</td>
                                            <td>{r.tokenStatus}</td>
                                            <td><span className={`pill ${r.ok ? "ok" : "bad"}`}>{r.outcome}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default App;