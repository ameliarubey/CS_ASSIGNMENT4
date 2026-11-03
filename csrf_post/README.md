# CSRF Attack and Prevention

## Overview

This project demonstrates a **Cross-Site Request Forgery (CSRF)** attack and how it can be prevented using CSRF token validation.

CSRF is a web security vulnerability in which an attacker tricks an authenticated user's browser into sending an unwanted request to a web application. Since browsers automatically attach session cookies to requests, an attacker may be able to perform actions on behalf of the victim without knowing their credentials.

This project implements both vulnerable and secure endpoints to demonstrate the difference.

## Objectives

- Understand how a CSRF attack works.
- Demonstrate how an attacker can submit a forged POST request.
- Observe how the browser automatically sends session cookies.
- Implement CSRF token validation as a security mechanism.
- Compare the behavior of vulnerable and protected endpoints.

## Technologies Used

- **Frontend:** React.js, Vite, HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Authentication:** Express Session
- **Security:** CSRF Tokens, HTTPS, Secure and HttpOnly Cookies

## Project Structure

```text
csrf-demo/
│
├── attacker/
│   ├── attacker.html
│   └── attack_secure.html
│
├── backend/
│   ├── server.js
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── App.css
    │   └── main.jsx
    ├── package.json
    └── index.html
```

## Implementation

### 1. Vulnerable Endpoint

The endpoint `/api/change-email-vulnerable` allows an authenticated user to change their email address without validating a CSRF token.

An attacker can create a hidden HTML form that submits a POST request to this endpoint. If the victim is logged in and their browser sends the session cookie, the request may be processed without the victim's knowledge.

### 2. Secure Endpoint

The endpoint `/api/change-email-secure` implements CSRF token validation.

- A unique CSRF token is generated for the user's session.
- The token is included in legitimate requests.
- The backend compares the submitted token with the session token.
- Requests with missing or invalid tokens are rejected with a `403 Forbidden` response.

### 3. Attacker Pages

The `attacker` directory contains HTML pages that simulate forged requests.

- `attacker.html`: Automatically submits a forged request to the vulnerable endpoint.
- `attack_secure.html`: Attempts the same attack against the secure endpoint without providing a CSRF token.

### 4. Request Logging

The application maintains a request log displaying:

- Request time
- Origin
- Sec-Fetch-Site header
- Whether a session cookie was sent
- CSRF token status
- Request outcome

This helps visualize the difference between successful forged requests and blocked requests.

## Setup and Execution

### Prerequisites

- Node.js and npm
- A modern web browser

### Step 1: Start the Backend

Open a terminal and navigate to the backend directory:

```bash
cd backend
npm install
node server.js
```

The backend runs at:

```text
https://localhost:3000
```

The backend uses HTTPS and requires a local certificate and private key. Generate your own local certificates before running it.

### Step 2: Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the frontend at:

```text
http://localhost:5173
```

### Step 3: Test the Vulnerable Endpoint

1. Sign in using the demo login button.
2. Open `attacker/attacker.html` in another browser tab.
3. The page automatically submits a forged POST request.
4. Return to the React application and observe the request log.
5. Check whether the email address has changed.

### Step 4: Test the Secure Endpoint

1. Ensure that you are logged in.
2. Open `attacker/attack_secure.html`.
3. Launch the attack.
4. Observe the request log.
5. The request should be rejected because the attacker page does not provide a valid CSRF token.

## Expected Results

| Test | Expected Result |
|---|---|
| Forged request to vulnerable endpoint | Request succeeds |
| Forged request to secure endpoint | Request rejected |
| Valid request with CSRF token | Request succeeds |
| Request without CSRF token | HTTP 403 Forbidden |

## Security Concepts Demonstrated

- Cross-Site Request Forgery
- Session-based authentication
- Automatic cookie transmission
- CSRF token generation and validation
- HTTPS and secure cookies
- HTTP request headers and origins

## Disclaimer

This project is developed strictly for educational purposes to understand web application vulnerabilities and their prevention.

All attacks should be tested only in the local demonstration environment or on systems for which explicit authorization has been obtained.
