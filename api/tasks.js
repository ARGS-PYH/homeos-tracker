import { db, taskCache } from './firebaseAdmin.js'

const ref = db.doc('homeos/tasks')

const refreshCache = async () => {
  try {
    const snap = await ref.get()
    taskCache.data = snap.exists ? snap.data() : {}
  } catch (error) {
    console.error('Failed to refresh task cache:', error)
  }
}

refreshCache()
setInterval(refreshCache, 10000)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' })
  }

  try {
    if (taskCache.data !== null) {
      return res.status(200).json(taskCache.data)
    }
    const snap = await ref.get()
    const data = snap.exists ? snap.data() : {}
    taskCache.data = data
    return res.status(200).json(data)
  } catch (error) {
    console.error('Failed to load tasks:', error)
    return res.status(500).json({ error: 'Unable to load tasks' })
  }
}
