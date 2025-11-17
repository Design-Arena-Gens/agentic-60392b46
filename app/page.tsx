'use client'

import Draggable from 'react-draggable'
import React from 'react'

// Simple Windows-like web desktop with Notepad, Terminal, and Files (localStorage-backed)

type AppId = 'notepad' | 'terminal' | 'files' | 'about'

type WindowState = {
  id: string
  appId: AppId
  title: string
  minimized: boolean
  maximized: boolean
  zIndex: number
  position: { x: number; y: number }
  size: { w: number; h: number }
}

const initialZ = 10

function useWindowsManager() {
  const [windows, setWindows] = React.useState<WindowState[]>([])
  const [zTop, setZTop] = React.useState(initialZ)

  const focusWindow = React.useCallback((id: string) => {
    setWindows(ws => ws.map(w => w.id === id ? { ...w, zIndex: zTop + 1 } : w))
    setZTop(z => z + 1)
  }, [zTop])

  const openApp = React.useCallback((appId: AppId) => {
    setZTop(z => z + 1)
    const id = `${appId}-${Date.now()}`
    const titleMap: Record<AppId, string> = {
      notepad: 'Notepad',
      terminal: 'Terminal',
      files: 'Files',
      about: 'About Web Windows'
    }
    const sizeMap: Record<AppId, { w: number; h: number }> = {
      notepad: { w: 720, h: 480 },
      terminal: { w: 700, h: 420 },
      files: { w: 820, h: 520 },
      about: { w: 520, h: 360 }
    }
    const posBase = 60 + (windows.length * 28)
    const newWin: WindowState = {
      id,
      appId,
      title: titleMap[appId],
      minimized: false,
      maximized: false,
      zIndex: zTop + 1,
      position: { x: posBase, y: posBase },
      size: sizeMap[appId]
    }
    setWindows(ws => [...ws, newWin])
  }, [windows.length, zTop])

  const closeWindow = React.useCallback((id: string) => {
    setWindows(ws => ws.filter(w => w.id !== id))
  }, [])

  const toggleMinimize = React.useCallback((id: string) => {
    setWindows(ws => ws.map(w => w.id === id ? { ...w, minimized: !w.minimized } : w))
  }, [])

  const toggleMaximize = React.useCallback((id: string) => {
    setWindows(ws => ws.map(w => w.id === id ? { ...w, maximized: !w.maximized } : w))
  }, [])

  const updatePosition = React.useCallback((id: string, x: number, y: number) => {
    setWindows(ws => ws.map(w => w.id === id ? { ...w, position: { x, y } } : w))
  }, [])

  return { windows, openApp, focusWindow, closeWindow, toggleMinimize, toggleMaximize, updatePosition }
}

function useClock() {
  const [now, setNow] = React.useState<Date>(new Date())
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function DesktopIcon({ emoji, label, onOpen }: { emoji: string; label: string; onOpen: () => void }) {
  return (
    <div className="desktop-icon" onDoubleClick={onOpen} title="Double-click to open">
      <div className="emoji">{emoji}</div>
      <div className="label">{label}</div>
    </div>
  )
}

function StartMenu({ visible, onLaunch }: { visible: boolean; onLaunch: (app: AppId) => void }) {
  if (!visible) return null
  const items: { id: AppId; label: string; emoji: string }[] = [
    { id: 'notepad', label: 'Notepad', emoji: '??' },
    { id: 'terminal', label: 'Terminal', emoji: '??' },
    { id: 'files', label: 'Files', emoji: '???' },
    { id: 'about', label: 'About', emoji: '??' },
  ]
  return (
    <div className="start-menu" role="menu">
      <div className="start-menu-header">Web Windows</div>
      <div className="start-menu-grid">
        {items.map(it => (
          <div key={it.id} className="start-card" onClick={() => onLaunch(it.id)}>
            <div className="emoji">{it.emoji}</div>
            <div>{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Taskbar({
  windows,
  onStart,
  onToggleMin,
  onFocus
}: {
  windows: WindowState[]
  onStart: () => void
  onToggleMin: (id: string) => void
  onFocus: (id: string) => void
}) {
  const clock = useClock()
  const sorted = [...windows].sort((a, b) => b.zIndex - a.zIndex)
  const topId = sorted[0]?.id
  return (
    <div className="taskbar">
      <div className="start-button" onClick={onStart}>
        <span>??</span> <span>Start</span>
      </div>
      {windows.map(w => (
        <div
          key={w.id}
          className={"task-item" + (topId === w.id && !w.minimized ? '' : ' inactive')}
          onClick={() => (w.minimized ? onToggleMin(w.id) : onFocus(w.id))}
          title={w.title}
        >
          <span>{iconForApp(w.appId)}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title}</span>
        </div>
      ))}
      <div className="task-spacer" />
      <div className="task-clock">{clock}</div>
    </div>
  )
}

function iconForApp(app: AppId): string {
  switch (app) {
    case 'notepad': return '??'
    case 'terminal': return '??'
    case 'files': return '???'
    case 'about': return '??'
  }
}

function WindowFrame({ win, onClose, onMin, onMax, onFocus, onDragStop, children }: {
  win: WindowState
  onClose: (id: string) => void
  onMin: (id: string) => void
  onMax: (id: string) => void
  onFocus: (id: string) => void
  onDragStop: (id: string, x: number, y: number) => void
  children: React.ReactNode
}) {
  const bounds = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight - 44 }
  const style: React.CSSProperties = win.maximized ? {
    left: 0,
    top: 0,
    width: '100vw',
    height: `calc(100vh - 44px)`,
  } : {
    left: win.position.x,
    top: win.position.y,
    width: win.size.w,
    height: win.size.h,
  }
  if (win.minimized) return null
  return (
    <Draggable
      handle=".window-titlebar"
      onStart={() => onFocus(win.id)}
      onStop={(_, data) => onDragStop(win.id, data.x, data.y)}
      position={win.maximized ? { x: 0, y: 0 } : { x: win.position.x, y: win.position.y }}
      disabled={win.maximized}
      bounds={{ left: 0, top: 0, right: bounds.right - 100, bottom: bounds.bottom - 60 }}
    >
      <div className="window-frame" style={{ ...style, zIndex: win.zIndex }} onMouseDown={() => onFocus(win.id)}>
        <div className="window-titlebar">
          <span>{iconForApp(win.appId)}</span>
          <div className="window-title">{win.title}</div>
          <div className="window-controls">
            <button className="win-btn" aria-label="Minimize" onClick={() => onMin(win.id)}>?</button>
            <button className="win-btn" aria-label="Maximize" onClick={() => onMax(win.id)}>{win.maximized ? '??' : '??'}</button>
            <button className="win-btn" aria-label="Close" onClick={() => onClose(win.id)}>?</button>
          </div>
        </div>
        <div className="window-body">
          {children}
        </div>
      </div>
    </Draggable>
  )
}

function NotepadApp({ storageKey }: { storageKey: string }) {
  const [text, setText] = React.useState<string>('')
  React.useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved != null) setText(saved)
  }, [storageKey])
  const save = () => localStorage.setItem(storageKey, text)
  const clear = () => setText('')
  const lorem = () => setText(prev => prev + (prev ? '\n' : '') + 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  return (
    <div className="app-shell">
      <div className="notepad-toolbar">
        <button className="win-btn" onClick={save}>Save</button>
        <button className="win-btn" onClick={clear}>Clear</button>
        <button className="win-btn" onClick={lorem}>Insert Lorem</button>
      </div>
      <textarea className="notepad-editor" value={text} onChange={e => setText(e.target.value)} placeholder="Start typing..." />
    </div>
  )
}

function TerminalApp() {
  const [lines, setLines] = React.useState<string[]>(['Web Windows Terminal. Type `help` to list commands.'])
  const [input, setInput] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const append = (t: string) => setLines(ls => [...ls, t])

  const run = (raw: string) => {
    const cmd = raw.trim()
    if (!cmd) return
    append(`> ${cmd}`)
    const [name, ...rest] = cmd.split(/\s+/)
    const arg = rest.join(' ')
    switch (name) {
      case 'help':
        append('Commands: help, echo, date, whoami, clear, ls, open <app>')
        break
      case 'echo':
        append(arg)
        break
      case 'date':
        append(new Date().toString())
        break
      case 'whoami':
        append('guest')
        break
      case 'clear':
        setLines([])
        break
      case 'ls':
        append('apps: notepad terminal files about')
        break
      default:
        append(`Command not found: ${name}`)
    }
  }

  React.useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <div className="terminal" onClick={() => inputRef.current?.focus()}>
      {lines.map((l, i) => (
        <div key={i} className="terminal-line">{l}</div>
      ))}
      <div className="terminal-line">
        <span>$ </span>
        <input
          ref={inputRef}
          className="terminal-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { run(input); setInput('') } }}
        />
      </div>
    </div>
  )
}

function FilesApp() {
  type FileItem = { id: string; name: string; content: string }
  const STORAGE = 'webwindows.files'
  const [files, setFiles] = React.useState<FileItem[]>([])
  const [selected, setSelected] = React.useState<FileItem | null>(null)
  const [editing, setEditing] = React.useState('')

  React.useEffect(() => {
    const raw = localStorage.getItem(STORAGE)
    if (raw) {
      try { setFiles(JSON.parse(raw)) } catch {}
    }
  }, [])

  const persist = (next: FileItem[]) => {
    setFiles(next)
    localStorage.setItem(STORAGE, JSON.stringify(next))
  }

  const createFile = () => {
    const name = prompt('New file name?', `note-${files.length + 1}.txt`)
    if (!name) return
    const f: FileItem = { id: `${Date.now()}`, name, content: '' }
    persist([f, ...files])
  }
  const del = (id: string) => {
    const next = files.filter(f => f.id !== id)
    persist(next)
    if (selected?.id === id) { setSelected(null); setEditing('') }
  }
  const save = () => {
    if (!selected) return
    const next = files.map(f => f.id === selected.id ? { ...f, content: editing } : f)
    persist(next)
  }

  return (
    <div className="app-shell" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: '100%' }}>
      <div style={{ borderRight: '1px solid #cfdbf2', background:'#ffffff' }}>
        <div style={{ display:'flex', gap:8, padding:10 }}>
          <button className="win-btn" onClick={createFile}>New</button>
          <button className="win-btn" onClick={() => selected && del(selected.id)} disabled={!selected}>Delete</button>
        </div>
        <div className="files-grid">
          {files.map(f => (
            <div key={f.id} className="file-card" onClick={() => { setSelected(f); setEditing(f.content) }}>
              <div>?? {f.name}</div>
              <div style={{ color:'#5b6f99', fontSize:12 }}>{Math.max(1, f.content.length)} chars</div>
            </div>
          ))}
          {files.length === 0 && <div style={{ padding:10, color:'#5b6f99' }}>No files yet. Create one!</div>}
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateRows: '40px 1fr' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0 10px', borderBottom:'1px solid #cfdbf2', background:'#ffffff' }}>
          <div style={{ fontWeight:700, color:'#0b2a5b' }}>{selected ? selected.name : 'No file selected'}</div>
          <div style={{ marginLeft: 'auto', display:'flex', gap:8 }}>
            <button className="win-btn" onClick={save} disabled={!selected}>Save</button>
          </div>
        </div>
        <div>
          {selected ? (
            <textarea className="notepad-editor" style={{ height: '100%' }} value={editing} onChange={e => setEditing(e.target.value)} />
          ) : (
            <div style={{ padding: 16, color:'#5b6f99' }}>Select a file on the left to view/edit.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function AboutApp() {
  return (
    <div className="app-shell" style={{ lineHeight: 1.6 }}>
      <h3 style={{ marginTop: 0, color:'#0b2a5b' }}>About Web Windows</h3>
      <p>This is a Windows-like desktop experience built for the web. It runs entirely in your browser and can be deployed on serverless platforms.</p>
      <ul>
        <li>Notepad: simple text editor with local save</li>
        <li>Terminal: toy shell with a handful of commands</li>
        <li>Files: mock file explorer stored in localStorage</li>
      </ul>
      <p>Tip: Double-click desktop icons or use the Start menu.</p>
    </div>
  )
}

export default function Page() {
  const { windows, openApp, focusWindow, closeWindow, toggleMinimize, toggleMaximize, updatePosition } = useWindowsManager()
  const [startOpen, setStartOpen] = React.useState(false)

  React.useEffect(() => {
    // Open welcome About window on first load
    if (windows.length === 0) openApp('about')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="desktop-background">
      <div className="desktop-icons">
        <DesktopIcon emoji="??" label="Notepad" onOpen={() => openApp('notepad')} />
        <DesktopIcon emoji="??" label="Terminal" onOpen={() => openApp('terminal')} />
        <DesktopIcon emoji="???" label="Files" onOpen={() => openApp('files')} />
        <DesktopIcon emoji="??" label="About" onOpen={() => openApp('about')} />
      </div>

      {windows.map(w => (
        <WindowFrame key={w.id}
          win={w}
          onClose={closeWindow}
          onMin={toggleMinimize}
          onMax={toggleMaximize}
          onFocus={focusWindow}
          onDragStop={updatePosition}
        >
          {w.appId === 'notepad' && <NotepadApp storageKey={`notepad.${w.id}`} />}
          {w.appId === 'terminal' && <TerminalApp />}
          {w.appId === 'files' && <FilesApp />}
          {w.appId === 'about' && <AboutApp />}
        </WindowFrame>
      ))}

      <Taskbar
        windows={windows}
        onStart={() => setStartOpen(v => !v)}
        onToggleMin={toggleMinimize}
        onFocus={focusWindow}
      />

      <StartMenu visible={startOpen} onLaunch={(app) => { openApp(app); setStartOpen(false) }} />
    </div>
  )
}
