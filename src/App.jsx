import { useState, useEffect, useCallback } from 'react'
import { doc, onSnapshot, setDoc, getDoc, collection, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase.js'
import { BUSINESS, DEV } from './data.js'

// ── Constants ─────────────────────────────────────────────────────────────────
// Individual PINs — each team member has their own PIN
const TEAM_MEMBERS = {
  '3710': 'Animasaun Damilare',
  '2604': 'Igwemerizi Joy',
  '7258': 'Odunsi Olayiwola',
}
const G        = '#1A6B3C'
const G_LITE   = '#E8F5EE'
const AMBER_BG = '#FFFBEB'
const AMBER    = '#D97706'
const API_BASE = import.meta.env.VITE_API_URL || ''

// ── Helpers ───────────────────────────────────────────────────────────────────
const taskKey  = (tab, gi, ii) => `${tab}__${gi}__${ii}`
const pct      = (done, total) => total === 0 ? 0 : Math.round((done / total) * 100)
const allKeys  = (data, tab) => data.flatMap((g, gi) => g.items.map((_, ii) => taskKey(tab, gi, ii)))
const phaseKeys = (data, tab, phase) =>
  data.filter(g => g.phase === phase).flatMap(g => {
    const gi = data.indexOf(g)
    return g.items.map((_, ii) => taskKey(tab, gi, ii))
  })

const getTaskLabel = (key) => {
  const [tab, gi, ii] = key.split('__')
  const group = tab === 'business' ? BUSINESS[Number(gi)] : DEV[Number(gi)]
  return group?.items?.[Number(ii)] || key
}

const getLatestAction = (checkedData) => {
  const actions = Object.entries(checkedData)
    .filter(([key, value]) => key.endsWith('__meta') && value && value.by && value.at)
    .map(([key, meta]) => {
      const taskKey = key.replace(/__meta$/, '')
      const timestamp = new Date(meta.at).getTime() || 0
      return {
        taskKey,
        taskLabel: getTaskLabel(taskKey),
        by: meta.by,
        at: meta.at,
        timestamp,
      }
    })

  actions.sort((a, b) => b.timestamp - a.timestamp)
  return actions[0] || null
}

// ── PIN Gate ──────────────────────────────────────────────────────────────────
function PinGate({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const submit = () => {
    const member = TEAM_MEMBERS[pin]
    if (member) {
      sessionStorage.setItem('homeos_auth', '1')
      sessionStorage.setItem('homeos_user_name', member)
      onUnlock(member)
    } else {
      setError(true)
      setShake(true)
      setPin('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 360, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, background: G_LITE, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: 24 }}>
          🏠
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>HomeOS.ng</h1>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 1.75 + 'rem' }}>Enter your personal PIN to continue</p>

        <div style={{ animation: shake ? 'shake 0.4s ease' : 'none' }}>
          <input
            type="password"
            placeholder="Your PIN"
            value={pin}
            onChange={e => { setPin(e.target.value); setError(false) }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            maxLength={8}
            style={{
              width: '100%', padding: '10px 14px', fontSize: 16, letterSpacing: '0.2em',
              border: `1.5px solid ${error ? '#EF4444' : '#E5E7EB'}`, borderRadius: 8,
              outline: 'none', marginBottom: '0.75rem', textAlign: 'center',
              background: error ? '#FEF2F2' : '#fff'
            }}
            autoFocus
          />
          {error && <p style={{ fontSize: 12, color: '#EF4444', marginBottom: '0.75rem' }}>Wrong PIN. Try again.</p>}
          <button
            onClick={submit}
            style={{ width: '100%', padding: '10px', background: G, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500 }}
          >
            Enter
          </button>
        </div>

        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: '1.25rem' }}>
          Peregrine Solutions · Internal tool
        </p>
      </div>
      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 60%{transform:translateX(8px)} }`}</style>
    </div>
  )
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function Bar({ done, total, height = 6 }) {
  const p = pct(done, total)
  return (
    <div style={{ height, borderRadius: height / 2, background: '#F3F4F6', overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: height / 2, background: G, width: `${p}%`, transition: 'width 0.35s ease' }} />
    </div>
  )
}

// ── Task Group ────────────────────────────────────────────────────────────────
function Group({ group, gi, tab, checked, onToggle, userName }) {
  const keys   = group.items.map((_, ii) => taskKey(tab, gi, ii))
  const done   = keys.filter(k => checked[k]).length
  const allDone = done === group.items.length
  const p      = pct(done, group.items.length)

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${allDone ? G : '#E5E7EB'}`,
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'border-color 0.2s'
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: allDone ? G_LITE : '#F9FAFB',
        borderBottom: '1px solid #E5E7EB'
      }}>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.04em',
          background: group.phase === 1 ? G : AMBER_BG,
          color: group.phase === 1 ? '#fff' : AMBER
        }}>
          Phase {group.phase}
        </span>
        <span style={{ fontWeight: 500, fontSize: 14, color: '#1A1A1A', flex: 1 }}>{group.title}</span>
        <span style={{ fontSize: 12, color: allDone ? G : '#9CA3AF', fontWeight: allDone ? 600 : 400 }}>
          {done}/{group.items.length}
        </span>
      </div>

      {/* Progress */}
      <div style={{ padding: '0 16px' }}>
        <Bar done={done} total={group.items.length} height={3} />
      </div>

      {/* Items */}
      {group.items.map((item, ii) => {
        const k    = taskKey(tab, gi, ii)
        const isDone = !!checked[k]
        const meta   = checked[`${k}__meta`]

        return (
          <label key={ii} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 16px',
            borderTop: '1px solid #F3F4F6',
            background: isDone ? G_LITE : 'transparent',
            cursor: 'pointer', transition: 'background 0.15s'
          }}>
            <input
              type="checkbox"
              checked={isDone}
              onChange={() => onToggle(k, userName)}
              style={{ marginTop: 2, width: 16, height: 16 }}
            />
            <div style={{ flex: 1 }}>
              <span style={{
                fontSize: 13, lineHeight: 1.5, color: isDone ? '#9CA3AF' : '#1A1A1A',
                textDecoration: isDone ? 'line-through' : 'none'
              }}>
                {item}
              </span>
              {isDone && meta && (
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  ✓ {meta.by} · {meta.at}
                </div>
              )}
            </div>
          </label>
        )
      })}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed]       = useState(() => !!sessionStorage.getItem('homeos_auth'))
  const [userName, setUserName]   = useState(() => sessionStorage.getItem('homeos_user_name') || localStorage.getItem('homeos_name') || '')
  const [nameSet, setNameSet]     = useState(() => !!(sessionStorage.getItem('homeos_user_name') || localStorage.getItem('homeos_name')))
  const [tab, setTab]             = useState('business')
  const [phaseFilter, setPhase]   = useState(0)
  const [checked, setChecked]     = useState(() => {
    // Initialise synchronously so the UI shows cached progress
    // before onSnapshot fires (usually < 1 second).
    try {
      const raw = localStorage.getItem('homeos_tasks')
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  })
  const [connected, setConnected] = useState(() => {
    // If we have cached tasks in localStorage, show Online immediately
    // rather than flashing "Connecting..." on every page load.
    // onSnapshot will correct this to the real value within milliseconds.
    try {
      const raw = localStorage.getItem('homeos_tasks')
      if (!raw) return false
      const data = JSON.parse(raw)
      return !!(data && Object.keys(data).length > 0)
    } catch { return false }
  })
  const [showReconnect, setShowReconnect] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [lastAction, setLastAction] = useState(null)
  const [syncing, setSyncing]     = useState(false)
  const [activeUsers, setActiveUsers] = useState([])

  const TASK_STORAGE_KEY = 'homeos_tasks'

  const loadLocalTasks = useCallback(async () => {
    const raw = localStorage.getItem(TASK_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  }, [])

  const saveLocalTasks = useCallback(async (data) => {
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(data))
    return data
  }, [])

  const loadClientTasks = useCallback(async () => {
    const ref = doc(db, 'homeos', 'tasks')
    const snap = await getDoc(ref)
    return snap.exists() ? snap.data() : null
  }, [])

  const loadCachedTasks = useCallback(async () => {
    return loadLocalTasks()
  }, [loadLocalTasks])

  const toggleClientTask = useCallback(async (key, name, isChecked, time) => {
    // Single Firestore write with merge — no read needed since we already
    // know isChecked from the checked state. Previously this did getDoc +
    // setDoc (full document overwrite), which was 2x slower.
    const ref = doc(db, 'homeos', 'tasks')
    const update = {
      [key]: isChecked,
      [`${key}__meta`]: isChecked ? { by: name || 'Team', at: time } : null,
    }
    await setDoc(ref, update, { merge: true })
  }, [])

  const loadTasks = useCallback(async () => {
    setSyncing(true)
    const cached = await loadLocalTasks()

    // Show cached data instantly while the live fetch happens
    if (Object.keys(cached).length > 0) setChecked(cached)

    // ── Primary: Firestore SDK directly (Lagos → Firebase, no Render hop) ──
    try {
      const data = await loadClientTasks()
      if (data && Object.keys(data).length > 0) {
        setChecked(data)
        await saveLocalTasks(data)
        setLastUpdate(new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }))
        setConnected(true)
        setSyncing(false)
        return
      }
    } catch (error) {
      console.warn('Firestore SDK load failed, trying REST API', error)
    }

    // ── Fallback: REST API on Render (slower — extra round-trip through Oregon) ──
    try {
      if (!API_BASE) throw new Error('No backend API configured')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(`${API_BASE}/api/tasks`, { signal: controller.signal })
      clearTimeout(timeout)
      if (!response.ok) throw new Error('Failed to load tasks')
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) throw new Error('Invalid backend response')
      const data = await response.json()
      if (data && Object.keys(data).length > 0) {
        setChecked(data)
        await saveLocalTasks(data)
        setLastUpdate(new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }))
        setConnected(true)
      } else if (Object.keys(cached).length > 0) {
        setChecked(cached)
        setConnected(true)
      }
    } catch (error) {
      console.warn('REST API also unavailable, using cache', error)
      if (Object.keys(cached).length > 0) setChecked(cached)
      setConnected(Object.keys(cached).length > 0)
    } finally {
      setSyncing(false)
    }
  }, [loadClientTasks, loadLocalTasks, saveLocalTasks])

  useEffect(() => {
    setLastAction(getLatestAction(checked))
  }, [checked])

  useEffect(() => {
    if (!authed || !nameSet) return

    const ref = doc(db, 'homeos', 'tasks')
    setConnected(true)

    // onSnapshot is the SOLE source of truth for remote state.
    //
    // Previously loadTasks() (getDoc / REST API) was also calling setChecked,
    // racing against onSnapshot and overwriting other users' changes with
    // stale cached data. That was why Joy's checks never appeared for Damilare.
    //
    // Now: checked is initialised synchronously from localStorage (fast first
    // render), then onSnapshot takes over and is the only thing that updates
    // state from Firestore for the lifetime of the session.
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return
      const data = snap.data()
      if (!data || Object.keys(data).length === 0) return
      setChecked(data)
      setConnected(true)
      setLastUpdate(new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }))
      try { localStorage.setItem('homeos_tasks', JSON.stringify(data)) } catch {}
    }, (error) => {
      console.error('Realtime listener error:', error)
      setConnected(false)
    })

    const onOffline = () => setConnected(false)
    const onOnline  = () => setConnected(true)  // onSnapshot auto-resumes — no reload needed
    window.addEventListener('offline', onOffline)
    window.addEventListener('online',  onOnline)

    return () => {
      unsubscribe()
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online',  onOnline)
    }
  }, [authed, nameSet])

  useEffect(() => {
    if (!authed || !nameSet) return
    setShowReconnect(false)
    if (connected) return

    const timer = setTimeout(() => {
      setShowReconnect(true)
    }, 1000)

    return () => clearTimeout(timer)
  }, [authed, nameSet, connected])

  useEffect(() => {
    if (!authed || !nameSet || !userName) return

    const presenceId = userName.trim().replace(/\s+/g, '_').toLowerCase()

    // Always use Firestore client SDK directly for presence.
    // Previously, when API_BASE was set, the app polled Render every 5s
    // (Nigeria → Oregon → Firestore → back), adding ~500-700ms per poll.
    // Direct Firestore writes + onSnapshot are real-time and ~4x faster.
    const presenceCollection = collection(db, 'homeos_presence')
    const presenceRef = doc(presenceCollection, presenceId)

    const updatePresence = async () => {
      try {
        await setDoc(presenceRef, {
          name: userName,
          tab,
          lastSeen: serverTimestamp(),
        }, { merge: true })
      } catch (error) {
        console.warn('Presence update failed:', error)
      }
    }

    updatePresence()
    const presenceInterval = setInterval(updatePresence, 5000)

    const presenceQuery = query(collection(db, 'homeos_presence'), orderBy('lastSeen', 'desc'))
    const unsubscribePresence = onSnapshot(presenceQuery, (snap) => {
      const now = Date.now()
      const users = snap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((user) => {
          if (!user.name) return false
          // Only show users active in the last 30 seconds
          if (user.lastSeen?.toMillis) {
            return (now - user.lastSeen.toMillis()) < 30000
          }
          return true
        })
      setActiveUsers(users)
    }, (error) => {
      console.warn('Presence listener failed:', error)
    })

    return () => {
      clearInterval(presenceInterval)
      unsubscribePresence()
    }
  }, [authed, nameSet, userName, tab])

  // ── Toggle task ───────────────────────────────────────────────────────────
  const toggle = useCallback(async (key, name) => {
    const now = new Date()
    const time = now.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) +
      ' ' + now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
    const isChecked = !checked[key]

    // Optimistic update — instant UI feedback while the write is in flight.
    // Using functional setState so this always merges onto the latest state,
    // not the stale closure value of `checked`.
    let optimisticUpdate
    setChecked(prev => {
      optimisticUpdate = {
        ...prev,
        [key]: isChecked,
        [`${key}__meta`]: isChecked ? { by: name || 'Team', at: time } : null,
      }
      return optimisticUpdate
    })
    setLastUpdate(time)
    // Save optimistic state to localStorage for offline resilience
    try { localStorage.setItem('homeos_tasks', JSON.stringify({
      ...checked,
      [key]: isChecked,
      [`${key}__meta`]: isChecked ? { by: name || 'Team', at: time } : null,
    })) } catch {}

    // ── Primary: Firestore SDK directly (fast — no round-trip through Render) ──
    try {
      await toggleClientTask(key, name, isChecked, time)
      setConnected(true)
      return // onSnapshot will sync the confirmed state
    } catch (error) {
      console.warn('Firestore SDK toggle failed, trying REST API', error)
    }

    // ── Fallback: REST API on Render (slower) ──
    try {
      if (!API_BASE) throw new Error('No backend API configured')
      const response = await fetch(`${API_BASE}/api/tasks/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, userName: name, isChecked })
      })
      if (!response.ok) throw new Error('Failed to toggle task')
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) throw new Error('Invalid backend response')
      setConnected(true)
      return // onSnapshot will sync the confirmed state
    } catch (error) {
      console.error('All toggle methods failed — reverting', error)
      setConnected(false)
      // Revert the optimistic update since nothing was saved
      setChecked((current) => ({
        ...current,
        [key]: !isChecked,
        [`${key}__meta`]: current[`${key}__meta`] ?? null,
      }))
    }
  }, [saveLocalTasks, toggleClientTask])

  // ── Name setup ────────────────────────────────────────────────────────────
  const saveName = (n) => {
    const trimmed = n.trim()
    if (!trimmed) return
    localStorage.setItem('homeos_name', trimmed)
    setUserName(trimmed)
    setNameSet(true)
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    sessionStorage.removeItem('homeos_auth')
    sessionStorage.removeItem('homeos_user_name')
    setAuthed(false)
    setUserName('')
    setNameSet(false)
    setChecked({})
  }
  if (!authed) return (
    <PinGate onUnlock={(name) => {
      setAuthed(true)
      setUserName(name)
      setNameSet(true)
    }} />
  )

  // ── Name gate ─────────────────────────────────────────────────────────────
  if (!nameSet) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ width: '100%', maxWidth: 360, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: '1rem' }}>👋</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Who are you?</h2>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: '1.5rem' }}>So we know who checked things off</p>
          <input
            type="text"
            placeholder="Your first name"
            defaultValue={userName}
            id="nameInput"
            onKeyDown={e => e.key === 'Enter' && saveName(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: '1.5px solid #E5E7EB', borderRadius: 8, outline: 'none', marginBottom: '0.75rem', textAlign: 'center' }}
            autoFocus
          />
          <button
            onClick={() => saveName(document.getElementById('nameInput').value)}
            style={{ width: '100%', padding: '10px', background: G, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500 }}
          >
            Let's go
          </button>
        </div>
      </div>
    )
  }

  // ── Data setup ────────────────────────────────────────────────────────────
  const data     = tab === 'business' ? BUSINESS : DEV
  const filtered = phaseFilter === 0 ? data : data.filter(g => g.phase === phaseFilter)
  const aKeys    = allKeys(data, tab)
  const totalDone = aKeys.filter(k => checked[k]).length
  const p1Keys   = phaseKeys(data, tab, 1)
  const p2Keys   = phaseKeys(data, tab, 2)
  const p1Done   = p1Keys.filter(k => checked[k]).length
  const p2Done   = p2Keys.filter(k => checked[k]).length

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      {/* Top nav */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.95)',
        borderBottom: '1px solid #E5E7EB',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 1.25rem', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, background: G, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 700 }}>H</div>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#1A1A1A' }}>HomeOS.ng</span>
          <span style={{ fontSize: 13, color: '#9CA3AF' }}>Launch Tracker</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: connected || showReconnect ? '#059669' : '#EF4444' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected || showReconnect ? '#059669' : '#EF4444' }} />
              {connected ? (lastUpdate ? `Updated ${lastUpdate}` : 'Live') : (showReconnect ? 'Online' : 'Connecting...')}
            </div>
            {activeUsers.length > 0 && (
              <div style={{ fontSize: 10, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>
                Active: {activeUsers.map((u) => u.name).join(', ')}
              </div>
            )}
            {lastAction && (
              <div style={{ fontSize: 10, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>
                Last action: {lastAction.by} checked "{lastAction.taskLabel}" at {lastAction.at}
              </div>
            )}
          </div>
          {/* Name chip — identity is set by PIN, not manually changeable */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 12, padding: '4px 10px', background: G_LITE, color: G, borderRadius: 20, fontWeight: 500 }}>
              {userName}
            </div>
            <button
              onClick={logout}
              title="Switch user"
              style={{
                fontSize: 11, padding: '4px 8px', background: 'transparent',
                color: '#9CA3AF', border: '1px solid #E5E7EB', borderRadius: 20,
                fontWeight: 500, cursor: 'pointer', lineHeight: 1.4
              }}
            >
              ↩ Exit
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1.25rem' }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
          {[
            { label: 'Total tasks', value: aKeys.length, sub: `${totalDone} done` },
            { label: 'Overall', value: `${pct(totalDone, aKeys.length)}%`, sub: tab === 'business' ? 'Business' : 'Dev' },
            { label: 'Phase 1', value: `${pct(p1Done, p1Keys.length)}%`, sub: `${p1Done}/${p1Keys.length} tasks` },
            { label: 'Phase 2', value: `${pct(p2Done, p2Keys.length)}%`, sub: `${p2Done}/${p2Keys.length} tasks` },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#1A1A1A', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Overall progress bar */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
            <span>Overall {tab} progress</span>
            <span style={{ fontWeight: 500, color: G }}>{pct(totalDone, aKeys.length)}%</span>
          </div>
          <Bar done={totalDone} total={aKeys.length} height={8} />
        </div>

        {/* Tab + phase controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1.25rem', alignItems: 'center' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[['business', '💼', 'Business'], ['dev', '💻', 'Dev & Product']].map(([id, emoji, label]) => (
              <button key={id} onClick={() => { setTab(id); setPhase(0) }} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: tab === id ? 500 : 400,
                border: `${tab === id ? '1.5px' : '1px'} solid ${tab === id ? G : '#E5E7EB'}`,
                background: tab === id ? G_LITE : '#fff',
                color: tab === id ? G : '#6B7280'
              }}>
                <span>{emoji}</span>{label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          {/* Phase filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[[0, 'All'], [1, 'Phase 1'], [2, 'Phase 2']].map(([v, label]) => (
              <button key={v} onClick={() => setPhase(v)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12,
                border: phaseFilter === v ? `1px solid ${G}` : '1px solid #E5E7EB',
                background: phaseFilter === v ? G : 'transparent',
                color: phaseFilter === v ? '#fff' : '#6B7280'
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Task groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(group => {
            const gi = data.indexOf(group)
            return (
              <Group
                key={`${tab}-${gi}`}
                group={group}
                gi={gi}
                tab={tab}
                checked={checked}
                onToggle={toggle}
                userName={userName}
              />
            )
          })}
        </div>

        <div style={{ textAlign: 'center', padding: '2rem 0 1rem', fontSize: 12, color: '#D1D5DB' }}>
          Peregrine Solutions · HomeOS.ng · Internal use only
        </div>
      </div>
    </div>
  )
}
