import { auth } from "../../js/firebase-app.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Every admin page (except the login page) calls this. If nobody
// is signed in, it bounces back to the login screen. Otherwise it
// resolves with the signed-in user.
export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = "index.html";
      } else {
        resolve(user);
      }
    });
  });
}

export function wireLogout(buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}
