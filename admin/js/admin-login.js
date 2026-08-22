import { auth } from "../../js/firebase-app.js";
import { ADMIN_EMAIL_DOMAIN } from "../../js/firebase-config.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const form = document.getElementById("login-form");
const msgEl = document.getElementById("login-msg");
const loginBtn = document.getElementById("login-btn");

// Already logged in? Skip straight to the dashboard.
onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = "dashboard.html";
});

function toEmail(username) {
  // Allows typing either "turtleadmin" or a full email directly.
  if (username.includes("@")) return username;
  return `${username}@${ADMIN_EMAIL_DOMAIN}`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";
  msgEl.innerHTML = "";

  try {
    await signInWithEmailAndPassword(auth, toEmail(username), password);
    window.location.href = "dashboard.html";
  } catch (err) {
    console.error(err);
    msgEl.innerHTML = `<div class="msg msg-error">Incorrect username or password.</div>`;
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Log In";
  }
});
