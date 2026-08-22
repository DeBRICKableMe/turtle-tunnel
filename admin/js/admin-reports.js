import { db } from "../../js/firebase-app.js";
import { requireAuth, wireLogout } from "./admin-guard.js";
import {
  collection, query, where, orderBy, getDocs, doc, getDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const user = await requireAuth();
wireLogout("logout-link");

const HABITAT_LABELS = {
  road: "Road", next_to_road: "Next to road", yard: "Yard",
  pond: "Pond", creek: "Creek", other: "Other",
};
const CONDITION_LABELS = {
  alive_moving: "Alive and moving", alive_injured: "Alive but injured",
  dead: "Dead", unsure: "Unsure",
};

const tabsEl = document.querySelector(".tabs");
const tableBody = document.querySelector("#reports-table tbody");
const detailPanel = document.getElementById("detail-panel");

let currentStatus = "pending";
let currentDocs = [];

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString();
}

async function loadReports(status) {
  tableBody.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;
  detailPanel.innerHTML = "";

  const base = collection(db, "reports");
  const q = status === "all"
    ? query(base, orderBy("submittedAt", "desc"))
    : query(base, where("status", "==", status), orderBy("submittedAt", "desc"));

  const snap = await getDocs(q);
  currentDocs = snap.docs;

  if (currentDocs.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5">No reports in this view.</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";
  currentDocs.forEach((d) => {
    const r = d.data();
    const tr = document.createElement("tr");
    tr.dataset.id = d.id;
    tr.innerHTML = `
      <td>${fmtDate(r.submittedAt)}</td>
      <td><span class="pill pill-${r.status}">${r.status}</span></td>
      <td>${r.location || "—"}</td>
      <td>${HABITAT_LABELS[r.habitat] || "—"}</td>
      <td>${CONDITION_LABELS[r.condition] || "—"}</td>
    `;
    tr.addEventListener("click", () => openDetail(d.id));
    tableBody.appendChild(tr);
  });
}

async function openDetail(id) {
  const reportRef = doc(db, "reports", id);
  const reportSnap = await getDoc(reportRef);
  if (!reportSnap.exists()) return;
  const r = reportSnap.data();

  // Private consent info — only readable because we're signed
  // in as admin (see firestore.rules).
  let privateData = {};
  try {
    const privSnap = await getDoc(doc(db, "reports", id, "private", "consent"));
    if (privSnap.exists()) privateData = privSnap.data();
  } catch (err) {
    console.warn("Could not load private info:", err);
  }

  detailPanel.innerHTML = `
    <div class="detail-panel">
      <h3>Report detail ${r.edited ? '<span class="optional-tag">Edited by admin</span>' : ""}</h3>

      <div class="field">
        <label>Location</label>
        <input type="text" id="edit-location" value="${r.location ? escapeHtml(r.location) : ""}" />
      </div>
      <div class="field">
        <label>Date observed</label>
        <input type="date" id="edit-date" value="${r.observedDate || ""}" />
      </div>
      <div class="field">
        <label>Condition</label>
        <select id="edit-condition">
          <option value="">—</option>
          ${Object.entries(CONDITION_LABELS).map(([k, v]) =>
            `<option value="${k}" ${r.condition === k ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Habitat</label>
        <select id="edit-habitat">
          <option value="">—</option>
          ${Object.entries(HABITAT_LABELS).map(([k, v]) =>
            `<option value="${k}" ${r.habitat === k ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </div>

      <div class="detail-row"><span class="k">First name</span><span class="v">${privateData.firstName || "Not provided"}</span></div>
      <div class="detail-row"><span class="k">Age range</span><span class="v">${privateData.ageRange || "Not provided"}</span></div>
      <div class="detail-row"><span class="k">OK to name in presentation</span><span class="v">${privateData.nameUseApproved ? "Yes" : "No"}</span></div>
      <div class="detail-row"><span class="k">Current status</span><span class="v"><span class="pill pill-${r.status}">${r.status}</span></span></div>

      <div class="action-row">
        <button class="btn btn-ok" id="btn-approve">Approve</button>
        <button class="btn btn-danger" id="btn-reject">Reject</button>
        <button class="btn btn-secondary" id="btn-save">Save Corrections</button>
      </div>
      <p class="hint" style="margin-top:14px;">The original submitted values are always kept, even if you correct a field here.</p>
    </div>
  `;

  document.getElementById("btn-approve").addEventListener("click", () => setStatus(id, "approved"));
  document.getElementById("btn-reject").addEventListener("click", () => setStatus(id, "rejected"));
  document.getElementById("btn-save").addEventListener("click", () => saveCorrections(id, r));
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function setStatus(id, status) {
  await updateDoc(doc(db, "reports", id), {
    status,
    reviewedAt: serverTimestamp(),
    reviewedBy: user.uid,
  });
  await loadReports(currentStatus);
  detailPanel.innerHTML = `<div class="msg msg-ok">Report marked ${status}.</div>`;
}

async function saveCorrections(id, original) {
  const newLocation = document.getElementById("edit-location").value.trim() || null;
  const newDate = document.getElementById("edit-date").value || null;
  const newCondition = document.getElementById("edit-condition").value || null;
  const newHabitat = document.getElementById("edit-habitat").value || null;

  const changed =
    newLocation !== (original.location || null) ||
    newDate !== (original.observedDate || null) ||
    newCondition !== (original.condition || null) ||
    newHabitat !== (original.habitat || null);

  await updateDoc(doc(db, "reports", id), {
    location: newLocation,
    observedDate: newDate,
    condition: newCondition,
    habitat: newHabitat,
    edited: changed ? true : (original.edited || false),
  });

  await loadReports(currentStatus);
  detailPanel.innerHTML = `<div class="msg msg-ok">Corrections saved. Original submission is preserved for reference.</div>`;
}

tabsEl.addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;
  tabsEl.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
  e.target.classList.add("active");
  currentStatus = e.target.dataset.status;
  loadReports(currentStatus).catch(console.error);
});

loadReports(currentStatus).catch(console.error);
