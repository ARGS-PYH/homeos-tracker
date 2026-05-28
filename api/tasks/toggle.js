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

  const { key, userName, isChecked } = body || {}
  if (!key || typeof isChecked !== 'boolean') {
    return res.status(400).json({ error: 'Missing task key or isChecked boolean' })
  }

  try {
    const ref = db.doc('homeos/tasks')
    const now = new Date()
    const time = now.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) +
      ' ' + now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })

    const update = {
      [key]: isChecked,
      [`${key}__meta`]: isChecked ? { by: userName || 'Team', at: time } : null,
    }

    await ref.set(update, { merge: true })
    return res.status(200).json(update)
  } catch (error) {
    console.error('Failed to toggle task:', error)
    return res.status(500).json({ error: 'Unable to toggle task' })
  }
}
