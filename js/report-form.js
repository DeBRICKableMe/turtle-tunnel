import { db } from "./firebase-app.js";
import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from "./firebase-config.js";
import {
  collection, doc, addDoc, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// emailjs is loaded globally via the <script> tag in report.html
emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

const form = document.getElementById("report-form");
const restOfForm = document.getElementById("rest-of-form");
const noBranch = document.getElementById("no-branch");
const noAnimalsThankYou = document.getElementById("no-animals-thankyou");
const otherAnimalsDetail = document.getElementById("other-animals-detail");
const submitBtn = document.getElementById("submit-btn");
const submitBtnOther = document.getElementById("submit-btn-other");
const msgEl = document.getElementById("form-msg");

function resetBranches() {
  restOfForm.classList.add("hidden");
  noBranch.classList.add("hidden");
  noAnimalsThankYou.classList.add("hidden");
  otherAnimalsDetail.classList.add("hidden");
}

// Gate logic, matching the branching your team decided on:
// - Turtle on the road? Yes -> full turtle report.
// - No -> ask about other small animals on/near the road.
//     - No -> simple thank-you, nothing to submit.
//     - Yes -> free-text "what animal(s)" field, then Submit.
form.addEventListener("change", (e) => {
  if (e.target.name === "seenTurtle") {
    resetBranches();
    if (e.target.value === "yes") {
      restOfForm.classList.remove("hidden");
    } else if (e.target.value === "no") {
      noBranch.classList.remove("hidden");
    }
  }

  if (e.target.name === "otherAnimals") {
    if (e.target.value === "yes") {
      otherAnimalsDetail.classList.remove("hidden");
      noAnimalsThankYou.classList.add("hidden");
    } else if (e.target.value === "no") {
      otherAnimalsDetail.classList.add("hidden");
      noAnimalsThankYou.classList.remove("hidden");
    }
  }
});

function showMsg(text, kind) {
  msgEl.innerHTML = `<div class="msg msg-${kind}">${text}</div>`;
}

function sendNotification(templateParams) {
  // Nice-to-have on top of the actual submission — never blocks
  // or fails the visitor's submission if the email itself fails.
  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
    .catch((err) => console.warn("Report saved, but notification email failed to send:", err));
}

// --- Main turtle-on-the-road report ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (form.seenTurtle.value !== "yes") return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
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

    form.reset();
    resetBranches();
    showMsg("Thank you! Your report has been submitted and will be reviewed by our team before it's counted.", "ok");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error(err);
    showMsg("Something went wrong submitting your report. Please try again in a moment.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Report";
  }
});

// --- Other-animal sighting (from the "No" branch) ---
submitBtnOther.addEventListener("click", async () => {
  const description = document.getElementById("otherAnimalsDescription").value.trim();
  if (!description) {
    showMsg("Let us know what animal(s) you saw, or select \u201cNo\u201d above if you didn't see any.", "error");
    return;
  }

  submitBtnOther.disabled = true;
  submitBtnOther.textContent = "Submitting...";

  try {
    // Kept separate from the turtle `reports` collection since
    // this isn't part of the turtle review/approval/100-count
    // pipeline — just a log of other roadside animal activity.
    await addDoc(collection(db, "other_animal_sightings"), {
      description,
      submittedAt: serverTimestamp(),
    });

    form.reset();
    resetBranches();
    showMsg("Thank you! We've logged that sighting.", "ok");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error(err);
    showMsg("Something went wrong submitting that. Please try again in a moment.", "error");
  } finally {
    submitBtnOther.disabled = false;
    submitBtnOther.textContent = "Submit";
  }
});
