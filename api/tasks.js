import { db } from './firebaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' })
  }

  try {
    const snap = await db.doc('homeos/tasks').get()
    return res.status(200).json(snap.exists ? snap.data() : {})
  } catch (error) {
    console.error('Failed to load tasks:', error)
    return res.status(500).json({ error: 'Unable to load tasks' })
  }
}
