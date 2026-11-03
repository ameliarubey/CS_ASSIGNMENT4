// Browser-side JavaScript: handles the form and displays the result.
const form = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const resultBox = document.getElementById("result");

document.getElementById("version-label").textContent = "WITH MITIGATION";
document.getElementById("explanation").textContent = "This version uses a parameterized query. User input is supplied separately, so SQL symbols are treated as ordinary text.";
document.getElementById("code-location").textContent = "Open With_Mitigation/server.js and find: MITIGATION — PARAMETERIZED QUERY.";

// Fill the same classroom test input in either version.
document.getElementById("fill-payload").addEventListener("click", function () {
  usernameInput.value = "admin' --";
  passwordInput.value = "any-password";
});

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  resultBox.className = "result";
  resultBox.textContent = "Checking login...";

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value })
    });
    const data = await response.json();
    resultBox.className = response.ok ? "result success" : "result failure";
    resultBox.textContent = data.message;
  } catch (error) {
    resultBox.className = "result failure";
    resultBox.textContent = "Could not connect. Check that this folder's server is running.";
  }
});
