import { db } from './firebaseAdmin.js'
import admin from 'firebase-admin'

export default async function presenceHandler(req, res) {
  try {
    // In-memory fallback store for local testing when Firestore admin is not configured
    if (!global.__presenceStore) global.__presenceStore = new Map()
    const store = global.__presenceStore
    const { method } = req
    if (method === 'POST') {
      const { id, name, tab } = req.body
      if (!id || !name) return res.status(400).json({ error: 'Missing id or name' })
      try {
        const ref = db.collection('homeos_presence').doc(id)
        await ref.set({ name, tab: tab || 'unknown', lastSeen: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
        return res.status(200).json({ ok: true })
      } catch (err) {
        // fallback to in-memory
        store.set(id, { id, name, tab: tab || 'unknown', lastSeen: new Date().toISOString() })
        return res.status(200).json({ ok: true, fallback: true })
      }
    }

    if (method === 'GET') {
      try {
        const q = db.collection('homeos_presence').orderBy('lastSeen', 'desc').limit(50)
        const snap = await q.get()
        const users = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        return res.status(200).json(users)
      } catch (err) {
        // fallback to in-memory list
        const users = Array.from(store.values()).sort((a, b) => (b.lastSeen || '') > (a.lastSeen || '') ? 1 : -1)
        return res.status(200).json(users)
      }
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).end()
  } catch (error) {
    console.error('Presence handler error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
}
