import { db } from './firebaseAdmin.js'

// NOTE: The previous version used a module-level setInterval to refresh a
// cache every 10 seconds. This does not work reliably in Vercel serverless
// functions because each invocation may be a cold-started Lambda with no
// shared memory. Removed it. We read Firestore directly every request —
// Firestore has its own connection pool so this is fast.

const ref = db.doc('homeos/tasks')

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' })
  }

  try {
    const snap = await ref.get()
    const data = snap.exists ? snap.data() : {}
    return res.status(200).json(data)
  } catch (error) {
    console.error('Failed to load tasks:', error)
    return res.status(500).json({ error: 'Unable to load tasks' })
  }
}
