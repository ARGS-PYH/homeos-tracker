import { db } from './firebaseAdmin.js'

const ref = db.doc('homeos/tasks')

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' })
  }
  try {
    const snap = await ref.get()
    if (!snap.exists) return res.status(200).json({ _ts: 0 })
    const data = snap.data()
    // Convert Firestore Timestamp _ts to milliseconds for client comparison
    const raw = data._ts
    const tsMs = raw && raw._seconds
      ? raw._seconds * 1000 + Math.floor((raw._nanoseconds || 0) / 1e6)
      : (raw instanceof Date ? raw.getTime() : (typeof raw === 'number' ? raw : Date.now()))
    return res.status(200).json({ ...data, _ts: tsMs })
  } catch (error) {
    console.error('Failed to load tasks:', error)
    return res.status(500).json({ error: 'Unable to load tasks' })
  }
}
