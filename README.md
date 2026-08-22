# Licking County Turtle Watch

A community research website for collecting local turtle observation
reports. Plain HTML/CSS/JavaScript — no build step, no npm required
to run or deploy. Backend is Firebase (Firestore + Auth). Hosting is
GitHub Pages.

## How this is organized

```
index.html          Homepage (live report counter)
report.html          The turtle report form (public)
findings.html         Aggregated stats from approved reports (public)
css/style.css         All styling
js/
  firebase-config.js   YOUR Firebase project keys go here
  firebase-app.js       Boots Firebase once, shared by every page
  home.js, report-form.js, findings.js
admin/
  index.html            Admin login
  dashboard.html         Submission counts + progress
  reports.html            Review queue: approve/reject/correct
  content.html             Edit homepage/findings text
  js/                       Logic for each admin page
firestore.rules        Security rules — controls who can read/write what
```

## One-time setup

### 1. Create a Firebase project
1. Go to https://console.firebase.google.com and create a new project.
2. In the project, go to **Build > Firestore Database** and create a
   database (start in production mode — the rules file here handles
   access control).
3. Go to **Build > Authentication > Sign-in method** and enable
   **Email/Password**.
4. Go to **Authentication > Users** and manually add ONE user for
   your team to share, e.g.:
   - Email: `turtleadmin@turtlewatch-admin.local`
   - Password: pick something the team can remember and share safely
   (This doesn't need to be a real email inbox — Firebase just needs
   something email-shaped as the account ID. The login screen shows
   "Username" and only needs the part before `@turtlewatch-admin.local`.)
5. Go to **Project settings > General > Your apps**, click the `</>`
   (web) icon, register an app, and copy the `firebaseConfig` object
   it gives you.

### 2. Add your config to the project
Open `js/firebase-config.js` and paste in the values from step 1.5.
This file is safe to commit to a public GitHub repo — these values
identify your project but aren't secret. Security comes from
`firestore.rules`, not from hiding this file.

If you used a different admin login domain than
`turtlewatch-admin.local`, update `ADMIN_EMAIL_DOMAIN` in the same
file to match.

### 3. Deploy the Firestore security rules
Easiest path — no CLI needed:
1. In the Firebase console, go to **Firestore Database > Rules**.
2. Copy the contents of `firestore.rules` from this repo and paste
   them in, replacing what's there.
3. Click **Publish**.

(If your team is comfortable with the Firebase CLI, `firebase deploy
--only firestore:rules` works too, but isn't required.)

### 4. Deploy to GitHub Pages
1. Push this repo to GitHub.
2. In the repo, go to **Settings > Pages**.
3. Under "Build and deployment", set Source to **Deploy from a
   branch**, pick your main branch and the `/ (root)` folder.
4. Save. GitHub gives you a URL in a minute or two.

That's it — no build step. Any time you edit an HTML/CSS/JS file and
push, GitHub Pages picks up the change automatically.

## Editing content without touching code

Log in at `/admin/`, go to **Site Content**, and edit the homepage
goal paragraph or findings intro paragraph. Leave a box blank to fall
back to the default wording baked into the page.

## Reviewing reports

Log in at `/admin/`, go to **Reports**. Pending reports need action;
click one to see full detail (including the private first
name/age/consent info, visible only to signed-in admins), then
Approve, Reject, or correct an obvious data-entry mistake and Save.
The original submitted values are always kept even after a
correction — you'll see an "Edited by admin" tag on corrected
reports.

## Design notes

- Only approved reports count toward the 100-report goal or appear
  in the Findings page stats.
- First name, age range, and presentation consent are stored in a
  Firestore subcollection (`reports/{id}/private/consent`) that is
  never publicly readable, regardless of a report's status — this
  is enforced in `firestore.rules`, not just hidden in the UI.
- No map yet (decided to launch with text-based location first).
  If you add one later, keep pending/rejected reports off it and
  keep the private subcollection pattern for anything personal.
- No Cloud Functions, no Firebase Storage, no photo uploads — kept
  deliberately out per the project's "don't overbuild" scope. The
  100-report counter uses Firestore's `count()` aggregation query
  directly from the browser, so no server-side function is needed.

## Not yet built (future work, not required for launch)

- CSV export of report data for analysis in Sheets/Excel
- Public map of approved reports
- Photo uploads (would require enabling Firebase Storage)
