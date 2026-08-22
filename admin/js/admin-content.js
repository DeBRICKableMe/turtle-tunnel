import { db } from "../../js/firebase-app.js";
import { requireAuth, wireLogout } from "./admin-guard.js";
import {
  doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

await requireAuth();
wireLogout("logout-link");

// Keep this list in sync with the textareas in content.html.
const CONTENT_KEYS = ["home_goal_text", "findings_intro"];

const msgEl = document.getElementById("content-msg");

async function loadContent() {
  for (const key of CONTENT_KEYS) {
    const snap = await getDoc(doc(db, "content", key));
    const textarea = document.getElementById(`text-${key}`);
    if (snap.exists()) {
      textarea.value = snap.data().text || "";
    }
  }
}

document.querySelectorAll("button[data-key]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const key = btn.dataset.key;
    const text = document.getElementById(`text-${key}`).value.trim();
    btn.disabled = true;
    try {
      await setDoc(doc(db, "content", key), { text });
      msgEl.innerHTML = `<div class="msg msg-ok">Saved.</div>`;
    } catch (err) {
      console.error(err);
      msgEl.innerHTML = `<div class="msg msg-error">Couldn't save. Try again.</div>`;
    } finally {
      btn.disabled = false;
    }
  });
});

loadContent().catch(console.error);
