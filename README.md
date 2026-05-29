# HomeOS.ng Launch Tracker — Deployment Guide

## What this is
A real-time shared todo list for the HomeOS.ng founding team.
Built with React + Vite + Firebase Firestore + Firebase Hosting.

When anyone checks a task, everyone sees it update instantly.
Each check shows who did it and when.

---

## Step 1 — Create your Firebase project

1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Name it: `homeos-tracker` (or anything you like)
4. Disable Google Analytics (not needed)
5. Click "Create project"

---

## Step 2 — Enable Firestore

1. In your Firebase project, go to **Build → Firestore Database**
2. Click "Create database"
3. Choose **Start in test mode** (we set proper rules in Step 6)
4. Pick a region — choose `europe-west1` or `us-central1`
5. Click "Enable"

---

## Step 3 — Get your Firebase config

1. Go to **Project Settings** (gear icon top left)
2. Scroll down to "Your apps" → click the `</>` (Web) icon
3. Register the app — name it `homeos-tracker-web`
4. Copy the `firebaseConfig` object shown

---

## Step 4 — Set up your .env file

In the project folder, copy the example env file:

```bash
cp .env.example .env
```

Open `.env` and fill in your values from the Firebase config:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=homeos-tracker.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=homeos-tracker
VITE_FIREBASE_STORAGE_BUCKET=homeos-tracker.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## New backend and free hosting

This repository now includes a serverless backend API in `api/`.
Use Vercel free hosting to deploy both the frontend and API together.

### Deploy to Vercel

1. Install dependencies:

```bash
npm install
```

2. Create a Firebase service account key:

- Open Firebase Console → Project Settings → Service accounts
- Click **Generate new private key**
- Save the JSON file securely

3. In Vercel, add an environment variable:

- `FIREBASE_SERVICE_ACCOUNT` = the contents of the service account JSON file

4. Deploy:

```bash
npx vercel login
npx vercel
```

5. Local development with the backend:

```bash
npx vercel dev
```

---

## Deploy to Render (free web service)

If you prefer Render, the repository now includes a Node entrypoint (`server.js`) that serves the built frontend plus the API routes.

### Render deployment

1. In Render, create a new **Web Service** and connect your Git repository.
2. Set the **Environment** to `Node`.
3. Set the **Build Command** to:

```bash
npm run build
```

4. Set the **Start Command** to:

```bash
npm start
```

5. Add this environment variable in Render:

- `FIREBASE_SERVICE_ACCOUNT` — the full service account JSON string from your Firebase service account file

6. Deploy. Render will build and run your service.

> If you do not want to paste JSON into the Render dashboard, use `FIREBASE_SERVICE_ACCOUNT_FILE` locally and keep the file out of source control.

### Local dev with the download file

If you want to run the backend locally with the downloaded service account file, add a `.env` file to the project root containing:

```bash
FIREBASE_SERVICE_ACCOUNT_FILE=C:\Users\MUSAAB-TECH\Downloads\homeostracker-firebase-adminsdk-fbsvc-a0a048abf8.json
```

Then start the local server with:

```bash
npm run build
npm start
```

Notes:

- `server.js` reads `FIREBASE_SERVICE_ACCOUNT` for Render and `FIREBASE_SERVICE_ACCOUNT_FILE` for local development.
- `server.js` also serves the frontend from `dist/`, so Render can host both the backend and the UI together.

---

## Step 5 — Change the team PIN (optional but recommended)

Open `src/App.jsx` and find this line near the top:

```js

```

Change `'2604'` to whatever PIN you want the team to use.

---

## Step 6 — Install and deploy

Make sure you have Node.js installed (v18+), then run:

```bash
# Install dependencies
npm install

# Install Firebase CLI globally (if not already installed)
npm install -g firebase-tools

# Log in to Firebase
firebase login

# Connect this project to your Firebase project
firebase use --add
# → Select your project from the list
# → Give it an alias: default

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Build the app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Firebase will give you a URL like:
`https://homeos-tracker-xxxxx.web.app`

Share that URL with your team along with the PIN.

---

## Step 7 — Share with the team

Send the team:
- The URL (e.g. `https://homeos-tracker-xxxxx.web.app`)
- The team PIN
- Tell each person to enter their first name when they first log in
  (this is how the app shows who checked what)

---

## Local development

To run locally while building:

```bash
npm run dev
```

Then open http://localhost:5173

---

## Changing the PIN later

Edit `src/App.jsx`, change `TEAM_PIN`, then redeploy:

```bash
npm run build && firebase deploy --only hosting
```

---

## Resetting all task progress

Go to Firebase Console → Firestore Database → find the `homeos` collection
→ delete the `tasks` document. All checkboxes will reset.

---

## Project structure

```
homeos-tracker/
├── src/
│   ├── App.jsx          ← Main app (PIN gate, task tracker, Firebase sync)
│   ├── data.js          ← All task data (edit here to add/remove tasks)
│   ├── firebase.js      ← Firebase config
│   ├── main.jsx         ← Entry point
│   └── index.css        ← Global styles
├── index.html
├── package.json
├── vite.config.js
├── firebase.json        ← Firebase Hosting config
├── firestore.rules      ← Firestore security rules
├── .env.example         ← Copy to .env and fill in your Firebase values
└── README.md            ← This file
```

---

Built for Peregrine Solutions · HomeOS.ng · 2026
