import { db } from "./firebase-app.js";
import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from "./firebase-config.js";
import {
  collection, doc, addDoc, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// emailjs is loaded globally via the <script> tag in report.html
emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

const form = document.getElementById("report-form");
const msgEl = document.getElementById("form-msg");
const panels = {};
document.querySelectorAll(".step-panel").forEach((el) => {
  panels[el.dataset.step] = el;
});

const otherAnimalsDetail = document.getElementById("other-animals-detail");
const submitBtn = document.getElementById("submit-btn");

// --- Step navigation -------------------------------------------------
// Steps: gate -> [turtle ->] animals -> [about -> submit] | thankyou-no
// A simple history stack powers the Back buttons.
let history = ["gate"];

function currentStep() {
  return history[history.length - 1];
}

function goTo(step) {
  Object.values(panels).forEach((p) => p.classList.add("hidden"));
  panels[step].classList.remove("hidden");
  history.push(step);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goBack() {
  if (history.length <= 1) return;
  history.pop(); // drop current step
  const prev = history.pop(); // grab the one before it (goTo will re-push it)
  goTo(prev);
}

function showMsg(text, kind) {
  msgEl.innerHTML = `<div class="msg msg-${kind}">${text}</div>`;
}
function clearMsg() {
  msgEl.innerHTML = "";
}

// Only currently-visible required fields are considered by
// reportValidity() — fields inside a display:none step-panel are
// automatically exempt, so this only validates the active step.
function currentStepValid() {
  return form.reportValidity();
}

// --- Other-animals detail field toggle ---
form.addEventListener("change", (e) => {
  if (e.target.name === "otherAnimals") {
    otherAnimalsDetail.classList.toggle("hidden", e.target.value !== "yes");
  }
});

// --- Next / Back button routing ---
form.addEventListener("click", (e) => {
  const action = e.target.dataset.action;
  if (!action) return;

  clearMsg();

  if (action === "back") {
    goBack();
    return;
  }

  if (action === "next-from-gate") {
    if (!currentStepValid()) return;
    goTo(form.seenTurtle.value === "yes" ? "turtle" : "animals");
    return;
  }

  if (action === "next-from-turtle") {
    if (!currentStepValid()) return;
    goTo("animals");
    return;
  }

  if (action === "next-from-animals") {
    const otherAnimals = form.otherAnimals.value;
    const description = document.getElementById("otherAnimalsDescription").value.trim();
    if (otherAnimals === "yes" && !description) {
      showMsg("Let us know what animal(s) you saw, or select \u201cNo\u201d if you didn't see any.", "error");
      return;
    }

    const seenTurtle = form.seenTurtle.value;
    if (seenTurtle === "yes" || otherAnimals === "yes") {
      goTo("about");
    } else {
      goTo("thankyou-no");
    }
    return;
  }
});

// Enter key in a text field advances the current step instead of
// submitting early (the real submit button only lives on the
// "about" step).
form.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (currentStep() === "about") return; // let the real submit happen
  e.preventDefault();
  const btn = panels[currentStep()].querySelector("[data-action^='next']");
  if (btn) btn.click();
});

function sendNotification(templateParams) {
  // Nice-to-have on top of the actual submission — never blocks
  // or fails the visitor's submission if the email itself fails.
  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
    .catch((err) => console.warn("Report saved, but notification email failed to send:", err));
}

// --- Final submit (only reachable from the "about" step) ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const seenTurtle = form.seenTurtle.value;
  const otherAnimals = form.otherAnimals.value;
  const otherAnimalsDescription = document.getElementById("otherAnimalsDescription").value.trim();

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    if (seenTurtle === "yes") {
      const publicFields = {
        seenTurtle: "yes",
        roadPosition: form.roadPosition.value || null,
        location: form.location.value.trim() || null,
        observedDate: form.observedDate.value || null,
        condition: form.condition.value || null,
        status: "pending",
        submittedAt: serverTimestamp(),
        reviewedAt: null,
        reviewedBy: null,
        edited: false,
      };

      const privateFields = {
        firstName: form.firstName.value.trim() || null,
        ageRange: form.ageRange.value || null,
        nameUseApproved: form.nameUseApproved.checked,
      };

      // Snapshot of exactly what was submitted, preserved even if
      // an admin later corrects a field on the main document.
      const originalSubmission = { ...publicFields };
      delete originalSubmission.submittedAt; // serverTimestamp isn't snapshot-safe pre-write

      const reportRef = doc(collection(db, "reports"));
      const privateRef = doc(collection(db, "reports", reportRef.id, "private"), "consent");

      const batch = writeBatch(db);
      batch.set(reportRef, { ...publicFields, originalSubmission });
      batch.set(privateRef, privateFields);
      await batch.commit();

      await sendNotification({
        location: publicFields.location || "Not provided",
        observed_date: publicFields.observedDate || "Not provided",
        condition: publicFields.condition || "Not provided",
        habitat: publicFields.roadPosition || "Not provided",
      });
    }

    if (otherAnimals === "yes" && otherAnimalsDescription) {
      // Kept separate from the turtle `reports` collection since
      // this isn't part of the turtle review/approval/100-count
      // pipeline — just a log of other roadside animal activity.
      await addDoc(collection(db, "other_animal_sightings"), {
        description: otherAnimalsDescription,
        submittedAt: serverTimestamp(),
      });
    }

    goTo("done");
  } catch (err) {
    console.error(err);
    showMsg("Something went wrong submitting your report. Please try again in a moment.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Report";
  }
});
