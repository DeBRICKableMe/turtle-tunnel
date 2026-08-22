import { db } from "./firebase-app.js";
import { REPORT_GOAL } from "./firebase-config.js";
import {
  collection, query, where, getCountFromServer,
  doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Live count of approved reports. Uses a Firestore count()
// aggregation query — no Cloud Function needed, and it doesn't
// download every report just to count them.
async function loadReportCount() {
  const el = document.getElementById("report-count");
  try {
    const q = query(collection(db, "reports"), where("status", "==", "approved"));
    const snap = await getCountFromServer(q);
    el.textContent = snap.data().count;
  } catch (err) {
    console.error("Could not load report count:", err);
    el.textContent = "0";
  }
}

// Optional: if an admin has edited the homepage goal text via
// the admin Content page, use that instead of the default copy
// baked into index.html.
async function loadContentOverride() {
  try {
    const ref = doc(db, "content", "home_goal_text");
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().text) {
      document.getElementById("content-goal-text").textContent = snap.data().text;
    }
  } catch (err) {
    // Non-fatal — just keep the default copy.
    console.warn("Using default homepage copy:", err);
  }
}

loadReportCount();
loadContentOverride();
