import admin from 'firebase-admin'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

let serviceAccountText = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON
const serviceAccountFile = process.env.FIREBASE_SERVICE_ACCOUNT_FILE
let serviceAccount = null

if (!serviceAccountText && serviceAccountFile) {
  try {
    serviceAccountText = fs.readFileSync(serviceAccountFile, 'utf8')
  } catch (error) {
    console.error('Could not read FIREBASE_SERVICE_ACCOUNT_FILE:', error)
  }
}

if (serviceAccountText) {
  try {
    serviceAccount = JSON.parse(serviceAccountText)
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
