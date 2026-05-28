import { useState, useEffect, useCallback } from 'react'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { BUSINESS, DEV } from './data.js'

// ── Constants ─────────────────────────────────────────────────────────────────
const TEAM_PIN = '2604'   // change this to your preferred team PIN
const G        = '#1A6B3C'
const G_LITE   = '#E8F5EE'
const AMBER_BG = '#FFFBEB'
const AMBER    = '#D97706'

// ── Helpers ───────────────────────────────────────────────────────────────────
const taskKey  = (tab, gi, ii) => `${tab}__${gi}__${ii}`
const pct      = (done, total) => total === 0 ? 0 : Math.round((done / total) * 100)
const allKeys  = (data, tab) => data.flatMap((g, gi) => g.items.map((_, ii) => taskKey(tab, gi, ii)))
const phaseKeys = (data, tab, phase) =>
  data.filter(g => g.phase === phase).flatMap(g => {
    const gi = data.indexOf(g)
    return g.items.map((_, ii) => taskKey(tab, gi, ii))
  })

// ── PIN Gate ──────────────────────────────────────────────────────────────────
function PinGate({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const submit = () => {
    if (pin === TEAM_PIN) {
      sessionStorage.setItem('homeos_auth', '1')
      onUnlock()
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
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 1.75 + 'rem' }}>Launch Tracker — Team Access</p>

        <div style={{ animation: shake ? 'shake 0.4s ease' : 'none' }}>
          <input
            type="password"
            placeholder="Enter team PIN"
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
  const [userName, setUserName]   = useState(() => localStorage.getItem('homeos_name') || '')
  const [nameSet, setNameSet]     = useState(() => !!localStorage.getItem('homeos_name'))
  const [tab, setTab]             = useState('business')
  const [phaseFilter, setPhase]   = useState(0)
  const [checked, setChecked]     = useState({})
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [syncing, setSyncing]     = useState(false)

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
    try {
      const ref = doc(db, 'homeos', 'tasks')
      const snap = await getDoc(ref)
      if (snap.exists()) return snap.data()
    } catch (error) {
      console.warn('Firestore client load failed, using local fallback', error)
    }
    return loadLocalTasks()
  }, [loadLocalTasks])

  const toggleClientTask = useCallback(async (key, name) => {
    const now = new Date()
    const time = now.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) +
      ' ' + now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })

    try {
      const ref = doc(db, 'homeos', 'tasks')
      const snap = await getDoc(ref)
      const data = snap.exists() ? snap.data() : {}
      const isChecked = !data[key]
      const update = {
        ...data,
        [key]: isChecked,
        [`${key}__meta`]: isChecked ? { by: name || 'Team', at: time } : null,
      }
      await setDoc(ref, update)
      return update
    } catch (error) {
      console.warn('Firestore client toggle failed, using local fallback', error)
      const data = await loadLocalTasks()
      const isChecked = !data[key]
      const update = {
        ...data,
        [key]: isChecked,
        [`${key}__meta`]: isChecked ? { by: name || 'Team', at: time } : null,
      }
      return saveLocalTasks(update)
    }
  }, [])

  const loadTasks = useCallback(async () => {
    setSyncing(true)
    const cached = await loadLocalTasks()
    if (Object.keys(cached).length) {
      setChecked(cached)
      setLastUpdate(new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }))
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    try {
      try {
        const response = await fetch('/api/tasks', { signal: controller.signal })
        clearTimeout(timeout)
        if (!response.ok) throw new Error('Failed to load tasks')
        const data = await response.json()
        const finalData = data || cached
        setChecked(finalData)
        saveLocalTasks(finalData)
        setLastUpdate(new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }))
        setConnected(true)
        return
      } catch (error) {
        clearTimeout(timeout)
        console.warn('Backend unavailable or slow, using cache/fallback', error)
      }

      const data = await loadClientTasks()
      const finalData = data || cached
      setChecked(finalData)
      saveLocalTasks(finalData)
      setLastUpdate(new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }))
      setConnected(!!Object.keys(finalData).length)
    } catch (error) {
      console.error('Firestore fallback failed', error)
      setConnected(false)
    } finally {
      setSyncing(false)
    }
  }, [loadClientTasks, loadLocalTasks, saveLocalTasks])

  useEffect(() => {
    if (!authed) return
    loadTasks()
    const interval = setInterval(loadTasks, 2000)
    const onFocus = () => loadTasks()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [authed, loadTasks])

  // ── Toggle task ───────────────────────────────────────────────────────────
  const toggle = useCallback(async (key, name) => {
    const now = new Date()
    const time = now.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) +
      ' ' + now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
    const isChecked = !checked[key]
    const optimisticUpdate = {
      ...checked,
      [key]: isChecked,
      [`${key}__meta`]: isChecked ? { by: name || 'Team', at: time } : null,
    }

    setChecked(optimisticUpdate)
    setLastUpdate(time)
    setConnected(true)
    saveLocalTasks(optimisticUpdate)

    try {
      const response = await fetch('/api/tasks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, userName: name })
      })
      if (!response.ok) throw new Error('Failed to toggle task')
      const data = await response.json()
      setChecked(data || optimisticUpdate)
      saveLocalTasks(data || optimisticUpdate)
      setLastUpdate(new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }))
      setConnected(true)
      return
    } catch (error) {
      console.warn('Backend toggle failed, falling back to Firestore client', error)
    }

    try {
      const data = await toggleClientTask(key, name)
      setChecked(data || optimisticUpdate)
      saveLocalTasks(data || optimisticUpdate)
      setLastUpdate(new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }))
      setConnected(true)
    } catch (error) {
      console.error('Firestore toggle fallback failed', error)
      setConnected(false)
      setChecked((current) => ({
        ...current,
        [key]: !isChecked,
        [`${key}__meta`]: current[`${key}__meta`]
      }))
    }
  }, [checked, saveLocalTasks, toggleClientTask])

  // ── Name setup ────────────────────────────────────────────────────────────
  const saveName = (n) => {
    const trimmed = n.trim()
    if (!trimmed) return
    localStorage.setItem('homeos_name', trimmed)
    setUserName(trimmed)
    setNameSet(true)
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!authed) return <PinGate onUnlock={() => setAuthed(true)} />

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
          {/* Connection status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: connected ? '#059669' : '#EF4444' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#059669' : '#EF4444' }} />
            {connected ? (lastUpdate ? `Updated ${lastUpdate}` : 'Live') : 'Reconnecting...'}
          </div>
          {/* Name chip */}
          <div
            onClick={() => { setNameSet(false) }}
            style={{ fontSize: 12, padding: '4px 10px', background: G_LITE, color: G, borderRadius: 20, fontWeight: 500, cursor: 'pointer' }}
            title="Click to change name"
          >
            {userName}
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
