import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const envFirebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const fallbackFirebaseConfig = {
  apiKey:            'AIzaSyAEeA8v7AwbUsmZGE5wunOKtwXSJhfnZYE',
  authDomain:        'homeostracker.firebaseapp.com',
  projectId:         'homeostracker',
  storageBucket:     'homeostracker.firebasestorage.app',
  messagingSenderId: '467165252837',
  appId:             '1:467165252837:web:3d10778b3eac67f842180c',
}

const envConfigComplete = Object.values(envFirebaseConfig).every(Boolean)
const firebaseConfig = envConfigComplete ? envFirebaseConfig : fallbackFirebaseConfig
export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean)

if (!envConfigComplete) {
  console.info('Using bundled Firebase web config. Set VITE_FIREBASE_* env vars to override it.')
}

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null
export const db = app ? getFirestore(app) : null
