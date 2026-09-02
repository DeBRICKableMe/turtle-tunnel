import { db } from "../../js/firebase-app.js";
import { requireAuth, wireLogout } from "./admin-guard.js";
import {
  collection, query, where, getCountFromServer, getDocs, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

await requireAuth();
wireLogout("logout-link");

const CONDITION_LABELS = {
  alive_moving: "Alive and moving", alive_injured: "Alive but injured",
  dead: "Dead", unsure: "Unsure",
};
const ROAD_POSITION_LABELS = {
  crossing: "Crossing the road", shoulder: "On the shoulder / edge",
  ditch: "In a ditch beside the road", median: "On the median",
};

async function countByStatus(status) {
  const q = status
    ? query(collection(db, "reports"), where("status", "==", status))
    : collection(db, "reports");
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

async function loadStats() {
  const [total, pending, approved, rejected] = await Promise.all([
    countByStatus(null),
    countByStatus("pending"),
    countByStatus("approved"),
    countByStatus("rejected"),
  ]);
  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-pending").textContent = pending;
  document.getElementById("stat-approved").textContent = approved;
  document.getElementById("stat-rejected").textContent = rejected;
  document.getElementById("stat-progress-num").textContent = approved;
}

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString();
}

async function loadRecent() {
  const q = query(collection(db, "reports"), orderBy("submittedAt", "desc"), limit(10));
  const snap = await getDocs(q);
  const tbody = document.querySelector("#recent-table tbody");
  if (snap.empty) {
    tbody.innerHTML = `<tr><td colspan="4">No submissions yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = "";
  snap.forEach((d) => {
    const r = d.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${fmtDate(r.submittedAt)}</td>
      <td><span class="pill pill-${r.status}">${r.status}</span></td>
      <td>${ROAD_POSITION_LABELS[r.roadPosition] || "—"}</td>
      <td>${CONDITION_LABELS[r.condition] || "—"}</td>
    `;
    tbody.appendChild(tr);
  });
}

loadStats().catch(console.error);
loadRecent().catch(console.error);
