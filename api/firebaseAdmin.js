import admin from 'firebase-admin'

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON
let serviceAccount = null

if (serviceAccountJson) {
  try {
    serviceAccount = JSON.parse(serviceAccountJson)
  } catch (error) {
    console.error('Could not parse FIREBASE_SERVICE_ACCOUNT JSON:', error)
  }
}

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  } else {
    admin.initializeApp()
  }
}

export const db = admin.firestore()
