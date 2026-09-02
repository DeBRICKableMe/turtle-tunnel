// ============================================================
// Firebase project configuration
//
// Get these values from: Firebase Console > Project Settings >
// General > Your apps > SDK setup and configuration.
//
// This file is safe to commit to a public GitHub repo — these
// values identify your project, they are not secret. Security
// comes from Firestore Security Rules (see firestore.rules),
// not from hiding this config.
// ============================================================
export const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

// Shared constant so the report goal is defined in one place.
export const REPORT_GOAL = 100;

// Firebase Auth's Email/Password provider requires an email-
// shaped identifier, even though we're really just using a
// shared username + password. We turn "turtleadmin" into
// "turtleadmin@ADMIN_EMAIL_DOMAIN" behind the scenes so the
// login screen can just say "Username" / "Password".
// This does not need to be a real, working email address.
export const ADMIN_EMAIL_DOMAIN = "turtlewatch-admin.local";

// EmailJS config — sends the team a notification email whenever
// a new report is submitted. The public key is meant to be
// client-side visible, same as the Firebase apiKey, but EmailJS
// lets you restrict which domains are allowed to use it under
// Account > Security > "Allowed origins" — worth turning on once
// the site is live at its real GitHub Pages URL.
export const EMAILJS_SERVICE_ID = "service_5582k0s";
export const EMAILJS_TEMPLATE_ID = "template_nqctw9d";
export const EMAILJS_PUBLIC_KEY = "5w5DxScX0_fqLI8rr";
