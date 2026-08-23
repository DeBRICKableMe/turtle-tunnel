import { db } from "./firebase-app.js";
import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from "./firebase-config.js";
import {
  collection, doc, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// emailjs is loaded globally via the <script> tag in report.html
emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

const form = document.getElementById("report-form");
const restOfForm = document.getElementById("rest-of-form");
const thankYouNo = document.getElementById("thank-you-no");
const submitBtn = document.getElementById("submit-btn");
const msgEl = document.getElementById("form-msg");

// Gate logic: showing/hiding sections based on the first answer,
// exactly matching the branching in the original Google Form.
form.addEventListener("change", (e) => {
  if (e.target.name === "seenTurtle") {
    if (e.target.value === "yes") {
      restOfForm.classList.remove("hidden");
      thankYouNo.classList.add("hidden");
    } else if (e.target.value === "no") {
      restOfForm.classList.add("hidden");
      thankYouNo.classList.remove("hidden");
    }
  }
});

function showMsg(text, kind) {
  msgEl.innerHTML = `<div class="msg msg-${kind}">${text}</div>`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const seenTurtle = form.seenTurtle.value;

  // "No" branch never reaches Firestore — matches the original
  // form, which just thanks the person and ends.
  if (seenTurtle !== "yes") {
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const publicFields = {
      seenTurtle: "yes",
      location: form.location.value.trim() || null,
      observedDate: form.observedDate.value || null,
      condition: form.condition.value || null,
      habitat: form.habitat.value || null,
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
    originalSubmission.observedDateRaw = form.observedDate.value || null;

    const reportRef = doc(collection(db, "reports"));
    const privateRef = doc(collection(db, "reports", reportRef.id, "private"), "consent");

    const batch = writeBatch(db);
    batch.set(reportRef, { ...publicFields, originalSubmission });
    batch.set(privateRef, privateFields);
    await batch.commit();

    // Notify the team a report is waiting for review. This is a
    // nice-to-have on top of the actual submission — if the email
    // fails for any reason, the report is already safely saved,
    // so we just log the error and move on rather than showing
    // the visitor a failure.
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        location: publicFields.location || "Not provided",
        observed_date: publicFields.observedDate || "Not provided",
        condition: publicFields.condition || "Not provided",
        habitat: publicFields.habitat || "Not provided",
      });
    } catch (emailErr) {
      console.warn("Report saved, but notification email failed to send:", emailErr);
    }

    form.reset();
    restOfForm.classList.add("hidden");
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
