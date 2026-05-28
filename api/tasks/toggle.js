import { db } from '../firebaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  let body = req.body
  if (!body) {
    try {
      body = typeof req.json === 'function' ? await req.json() : {}
    } catch (error) {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }
  }

  const { key, userName } = body || {}
  if (!key) {
    return res.status(400).json({ error: 'Missing task key' })
  }

  try {
    const ref = db.doc('homeos/tasks')
    const snap = await ref.get()
    const data = snap.exists ? snap.data() : {}
    const isChecked = !data[key]
    const now = new Date()
    const time = now.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) +
      ' ' + now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })

    const update = {
      ...data,
      [key]: isChecked,
      [`${key}__meta`]: isChecked ? { by: userName || 'Team', at: time } : null,
    }

    await ref.set(update)
    return res.status(200).json(update)
  } catch (error) {
    console.error('Failed to toggle task:', error)
    return res.status(500).json({ error: 'Unable to toggle task' })
  }
}
