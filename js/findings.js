import { db } from "./firebase-app.js";
import { REPORT_GOAL } from "./firebase-config.js";
import {
  collection, query, where, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ROAD_POSITION_LABELS = {
  crossing: "Crossing the road",
  shoulder: "On the shoulder / edge",
  ditch: "In a ditch beside the road",
  median: "On the median",
};
const CONDITION_LABELS = {
  alive_moving: "Alive and moving",
  alive_injured: "Alive but injured",
  dead: "Dead",
  unsure: "Unsure",
};

function renderBreakdown(el, counts, labels, total) {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  if (entries.length === 0) {
    el.innerHTML = "<p>Not enough data yet.</p>";
    return;
  }
  el.innerHTML = entries
    .sort((a, b) => b[1] - a[1])
    .map(([key, n]) => {
      const pct = total > 0 ? Math.round((n / total) * 100) : 0;
      const label = labels[key] || key;
      return `<div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:0.9rem;margin-bottom:4px;">
          <span>${label}</span><span>${n} (${pct}%)</span>
        </div>
        <div style="background:var(--color-line);border-radius:6px;height:8px;overflow:hidden;">
          <div style="background:var(--color-forest);width:${pct}%;height:100%;"></div>
        </div>
      </div>`;
    })
    .join("");
}

async function loadFindings() {
  const q = query(collection(db, "reports"), where("status", "==", "approved"));
  const snap = await getDocs(q);

  const roadPositionCounts = {};
  const conditionCounts = {};
  let crossingCount = 0;
  let aliveCount = 0;

  snap.forEach((d) => {
    const data = d.data();
    if (data.roadPosition) {
      roadPositionCounts[data.roadPosition] = (roadPositionCounts[data.roadPosition] || 0) + 1;
      if (data.roadPosition === "crossing") crossingCount++;
    }
    if (data.condition) {
      conditionCounts[data.condition] = (conditionCounts[data.condition] || 0) + 1;
      if (data.condition === "alive_moving" || data.condition === "alive_injured") aliveCount++;
    }
  });

  const total = snap.size;
  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-road").textContent = crossingCount;
  document.getElementById("stat-live").textContent = aliveCount;
  document.getElementById("stat-progress").textContent = `${Math.min(total, REPORT_GOAL)}/${REPORT_GOAL}`;

  renderBreakdown(document.getElementById("habitat-breakdown"), roadPositionCounts, ROAD_POSITION_LABELS, total);
  renderBreakdown(document.getElementById("condition-breakdown"), conditionCounts, CONDITION_LABELS, total);
}

async function loadContentOverride() {
  try {
    const ref = doc(db, "content", "findings_intro");
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().text) {
      document.getElementById("content-findings-intro").textContent = snap.data().text;
    }
  } catch (err) {
    console.warn("Using default findings copy:", err);
  }
}

loadFindings().catch((err) => {
  console.error(err);
  document.getElementById("habitat-breakdown").innerHTML = "<p>Couldn't load data right now.</p>";
  document.getElementById("condition-breakdown").innerHTML = "";
});
loadContentOverride();
