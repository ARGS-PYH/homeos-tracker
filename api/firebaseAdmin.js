import admin from 'firebase-admin'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON
const serviceAccountFile = process.env.FIREBASE_SERVICE_ACCOUNT_FILE
let rawServiceAccount = serviceAccountJson || null
let serviceAccount = null

if (!rawServiceAccount && serviceAccountFile) {
  try {
    rawServiceAccount = fs.readFileSync(serviceAccountFile, 'utf8')
  } catch (error) {
    console.error('Could not read FIREBASE_SERVICE_ACCOUNT_FILE:', error)
  }
}

if (rawServiceAccount) {
  try {
    serviceAccount = JSON.parse(rawServiceAccount)
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
export const taskCache = { data: null }
