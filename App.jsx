// ═══════════════════════════════════════════════════════════════════════════════
// WEBOS DESKFLOW v2.0 — MERGED PRODUCTION BUILD
// Kernel: Zustand WindowManager + IPC System Bus + Virtual File System
// Intelligence: Cortex AI with real OS control
// Apps: 12 fully functional applications
// Architecture: src/core + src/store + src/apps + src/desktop
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useReducer, createContext, useContext } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 0: DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:          "#080E1D",
  surface:     "rgba(14,22,44,0.75)",
  glass:       "rgba(255,255,255,0.055)",
  glassBorder: "rgba(255,255,255,0.11)",
  primary:     "#0DA2E7",
  accent:      "#CC66FF",
  green:       "#28C840",
  amber:       "#FEBC2E",
  red:         "#FF5F57",
  text:        "#F1F5F9",
  textSub:     "#94A3B8",
  textMute:    "#475569",
  font:        "'Space Grotesk', system-ui, sans-serif",
  mono:        "'JetBrains Mono', 'Fira Code', monospace",
};

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1: IPC SYSTEM BUS  (store/systemBus)
// Central nervous system — all inter-process communication flows through here
// ─────────────────────────────────────────────────────────────────────────────
const _busListeners = [];
const SystemBus = {
  emit(event) {
    _busListeners.forEach(l => { try { l(event); } catch(e){} });
  },
  subscribe(listener) {
    _busListeners.push(listener);
    return () => {
      const i = _busListeners.indexOf(listener);
      if (i > -1) _busListeners.splice(i, 1);
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2: VIRTUAL FILE SYSTEM  (core/fileSystem)
// ─────────────────────────────────────────────────────────────────────────────
const _buildVFS = () => ({
  name: "/", type: "folder",
  children: [
    { name: "Desktop",   type: "folder", children: [
      { name: "readme.txt",    type: "file", content: "Welcome to WebOS DeskFlow v2.0\n\nPowered by Cortex AI.\nBuilt on: React + IPC System Bus + Virtual File System\n\nType 'help' in Terminal to get started." },
      { name: "todo.txt",      type: "file", content: "[ ] Build the OS\n[x] Add IPC Bus\n[x] Wire Cortex AI\n[ ] Ship it" },
    ]},
    { name: "Documents", type: "folder", children: [
      { name: "notes.md",      type: "file", content: "# My Notes\n\nStart writing here..." },
      { name: "project.md",    type: "file", content: "# WebOS DeskFlow\n\n## Architecture\n- Window Manager (Zustand)\n- System Bus (IPC)\n- Virtual File System\n- Cortex AI\n- 12 Built-in Apps" },
    ]},
    { name: "Music",     type: "folder", children: [
      { name: "ambient.mp3",   type: "file", content: "[Binary audio data]" },
      { name: "lo-fi.wav",     type: "file", content: "[Binary audio data]" },
    ]},
    { name: "Code",      type: "folder", children: [
      { name: "index.html",    type: "file", content: "<!DOCTYPE html>\n<html>\n<head><title>Hello</title></head>\n<body><h1>Hello from WebOS!</h1></body>\n</html>" },
      { name: "app.jsx",       type: "file", content: "export default function App() {\n  return <div>My App</div>;\n}" },
    ]},
    { name: "System",    type: "folder", children: [
      { name: "os.conf",       type: "file", content: "VERSION=2.0\nKERNEL=WebOS\nAI=Cortex\nTHEME=dark" },
    ]},
  ]
});

let _vfsRoot = _buildVFS();
let _vfsPath = [];

const VFS = {
  pwd: () => "/" + _vfsPath.join("/"),
  _getNode(path) {
    let node = _vfsRoot;
    for (const part of path) {
      if (!node.children) return null;
      node = node.children.find(c => c.name === part);
      if (!node) return null;
    }
    return node;
  },
  ls(path = _vfsPath) {
    const node = this._getNode(path);
    if (!node?.children) return [];
    return node.children.map(c => c.type === "folder" ? `📁 ${c.name}/` : `📄 ${c.name}`);
  },
  cd(dir) {
    if (dir === "..") { _vfsPath.pop(); return true; }
    if (dir === "/")  { _vfsPath = []; return true; }
    const next = [..._vfsPath, dir];
    const node = this._getNode(next);
    if (node?.type === "folder") { _vfsPath = next; return true; }
    return false;
  },
  cat(name) {
    const node = this._getNode([..._vfsPath, name]);
    if (!node || node.type !== "file") return null;
    return node.content || "";
  },
  touch(name, content = "") {
    const node = this._getNode(_vfsPath);
    if (!node?.children) return false;
    if (!node.children.find(c => c.name === name)) {
      node.children.push({ name, type: "file", content });
    }
    return true;
  },
  write(name, content) {
    const node = this._getNode([..._vfsPath, name]);
    if (node?.type === "file") { node.content = content; return true; }
    return this.touch(name, content);
  },
  mkdir(name) {
    const node = this._getNode(_vfsPath);
    if (!node?.children) return false;
    if (!node.children.find(c => c.name === name)) {
      node.children.push({ name, type: "folder", children: [] });
    }
    return true;
  },
  rm(name) {
    const node = this._getNode(_vfsPath);
    if (!node?.children) return false;
    const i = node.children.findIndex(c => c.name === name);
    if (i > -1) { node.children.splice(i, 1); return true; }
    return false;
  },
  tree(path = _vfsPath, indent = "") {
    const node = this._getNode(path);
    if (!node?.children) return "";
    return node.children.map(c => {
      const line = indent + (c.type === "folder" ? `📁 ${c.name}` : `📄 ${c.name}`);
      if (c.type === "folder" && c.children?.length) {
        return line + "\n" + this.tree([...path, c.name], indent + "  ");
      }
      return line;
    }).join("\n");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 3: TERMINAL COMMAND SYSTEM  (core/terminalCommands)
// Connected to IPC Bus + VFS
// ─────────────────────────────────────────────────────────────────────────────
const buildTerminalCommands = (dispatch, appendHistory) => ({
  help: () => `WebOS DeskFlow Terminal v2.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
System:   help · date · whoami · uname · uptime · neofetch · clear
Windows:  open <app> · close <app> · focus <app> · ls-windows
Files:    ls · cd <dir> · pwd · cat <file> · touch <file> · mkdir <dir> · rm <name> · tree
Theme:    theme dark · theme light · theme navy
AI:       ai <query>
OS:       shutdown · restart
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Apps: ai notepad code files calc terminal paint tasks settings browser media vault`,

  date:    () => new Date().toString(),
  whoami:  () => "guest@deskflow-os",
  uname:   () => "WebOS DeskFlow 2.0 (React/IPC/VFS)",
  uptime:  () => `System uptime: ${Math.floor(performance.now() / 60000)}m ${Math.floor((performance.now() % 60000) / 1000)}s`,
  pwd:     () => VFS.pwd(),
  ls:      (args) => {
    const items = VFS.ls();
    return items.length ? items.join("  ") : "(empty)";
  },
  cd:      ([dir]) => {
    if (!dir) return VFS.pwd();
    return VFS.cd(dir) ? `→ ${VFS.pwd()}` : `cd: ${dir}: No such directory`;
  },
  cat:     ([name]) => {
    if (!name) return "Usage: cat <filename>";
    const c = VFS.cat(name);
    return c !== null ? c : `cat: ${name}: No such file`;
  },
  touch:   ([name]) => { VFS.touch(name || "untitled.txt"); return `Created: ${name}`; },
  mkdir:   ([name]) => { VFS.mkdir(name || "folder"); return `Created directory: ${name}`; },
  rm:      ([name]) => VFS.rm(name) ? `Removed: ${name}` : `rm: ${name}: Not found`,
  tree:    () => VFS.tree() || "(empty)",
  echo:    (args) => args.join(" "),
  clear:   () => "__CLEAR__",
  open:    ([app]) => {
    if (!app) return "Usage: open <appid>";
    SystemBus.emit({ type: "OPEN_APP", payload: { id: app } });
    return `Opening ${app}...`;
  },
  close:   ([app]) => {
    if (!app) return "Usage: close <appid>";
    SystemBus.emit({ type: "CLOSE_APP", payload: { id: app } });
    return `Closing ${app}...`;
  },
  focus:   ([app]) => {
    SystemBus.emit({ type: "FOCUS_APP", payload: { id: app } });
    return `Focused: ${app}`;
  },
  "ls-windows": () => {
    SystemBus.emit({ type: "LIST_WINDOWS", payload: {} });
    return "(see task manager)";
  },
  theme:   ([mode]) => {
    if (!mode) return "Usage: theme [dark|light|navy]";
    SystemBus.emit({ type: "THEME_CHANGE", payload: { theme: mode } });
    return `Theme → ${mode}`;
  },
  shutdown: () => {
    setTimeout(() => SystemBus.emit({ type: "SHUTDOWN" }), 800);
    return "Initiating shutdown sequence...";
  },
  restart: () => {
    setTimeout(() => window.location.reload(), 1000);
    return "Restarting WebOS...";
  },
  neofetch: () => `
  ██████╗ ███████╗███████╗██╗  ██╗
  ██╔══██╗██╔════╝██╔════╝██║ ██╔╝   WebOS DeskFlow v2.0
  ██║  ██║█████╗  ███████╗█████╔╝    ─────────────────────────
  ██║  ██║██╔══╝  ╚════██║██╔═██╗    Kernel:  IPC System Bus
  ██████╔╝███████╗███████║██║  ██╗   AI:      Cortex (Claude)
  ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝   Theme:   Glassmorphism
                                       Apps:    12 installed`,
  ai: async (args) => {
    const query = args.join(" ");
    if (!query) return "Usage: ai <your query>";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 300,
          system: "You are Cortex, WebOS terminal AI. Be concise. Max 3 sentences.",
          messages: [{ role: "user", content: query }]
        })
      });
      const d = await res.json();
      return d.content?.map(c => c.text || "").join("") || "No response";
    } catch { return "Cortex: connection error"; }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 4: AI COMMAND PARSER  (core/aiCommandParser)
// Parses natural language → IPC events
// ─────────────────────────────────────────────────────────────────────────────
const APP_IDS = ["ai","notepad","code","files","calc","terminal","paint","tasks","settings","browser","media","vault"];

const parseAICommand = (text) => {
  const t = text.toLowerCase();
  const actions = [];

  // Open app
  for (const id of APP_IDS) {
    if (t.includes(`open ${id}`) || t.includes(`launch ${id}`) || t.includes(`start ${id}`)) {
      actions.push({ type: "OPEN_APP", payload: { id } });
    }
  }
  // Close app
  for (const id of APP_IDS) {
    if (t.includes(`close ${id}`)) {
      actions.push({ type: "CLOSE_APP", payload: { id } });
    }
  }
  // Theme
  if (t.includes("dark mode") || t.includes("dark theme")) actions.push({ type: "THEME_CHANGE", payload: { theme: "dark" } });
  if (t.includes("light mode") || t.includes("light theme")) actions.push({ type: "THEME_CHANGE", payload: { theme: "light" } });

  return actions;
};

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 5: APP REGISTRY  (registry/appRegistry)
// ─────────────────────────────────────────────────────────────────────────────
const APP_REGISTRY = [
  { id: "ai",       title: "Cortex AI",     icon: "🤖", w: 540, h: 600, desc: "AI OS assistant" },
  { id: "notepad",  title: "Notepad",        icon: "📝", w: 500, h: 460, desc: "Text editor + VFS save" },
  { id: "code",     title: "Code Studio",   icon: "💻", w: 740, h: 560, desc: "Live HTML/CSS/JS editor" },
  { id: "files",    title: "File Explorer", icon: "📁", w: 580, h: 480, desc: "Virtual file system" },
  { id: "calc",     title: "Calculator",    icon: "🧮", w: 320, h: 480, desc: "Scientific calculator" },
  { id: "terminal", title: "Terminal",      icon: "⬛", w: 620, h: 440, desc: "Full CLI + VFS + IPC" },
  { id: "paint",    title: "PixelPaint",    icon: "🎨", w: 660, h: 540, desc: "Canvas drawing app" },
  { id: "tasks",    title: "Task Manager",  icon: "📊", w: 500, h: 400, desc: "Process monitor" },
  { id: "settings", title: "Settings",      icon: "⚙️",  w: 440, h: 420, desc: "System preferences" },
  { id: "browser",  title: "Web Browser",   icon: "🌐", w: 700, h: 540, desc: "Embedded browser" },
  { id: "media",    title: "Media Player",  icon: "🎵", w: 440, h: 400, desc: "Audio player" },
  { id: "vault",    title: "DevVault",      icon: "🔐", w: 500, h: 460, desc: "Password manager" },
];

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 6: WINDOW MANAGER  (store/windowManager)
// Zustand-style reducer — prevRect + layout + snap/restore
// ─────────────────────────────────────────────────────────────────────────────
let _zCounter = 100;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

function wmReducer(state, action) {
  switch (action.type) {
    case "OPEN": {
      const existing = state.find(w => w.id === action.appId);
      if (existing) return state.map(w => w.id === action.appId
        ? { ...w, minimized: false, zIndex: ++_zCounter } : w);
      const app = APP_REGISTRY.find(a => a.id === action.appId);
      if (!app) return state;
      const vw = window.innerWidth, vh = window.innerHeight;
      const x = clamp(Math.random() * (vw - app.w - 100) + 60, 20, vw - app.w - 20);
      const y = clamp(Math.random() * (vh - app.h - 120) + 40, 20, vh - app.h - 60);
      return [...state, {
        id: app.id, title: app.title, icon: app.icon,
        x, y, w: app.w, h: app.h,
        minimized: false, layout: "floating",
        prevRect: null, zIndex: ++_zCounter,
      }];
    }
    case "CLOSE":    return state.filter(w => w.id !== action.id);
    case "FOCUS":    return state.map(w => w.id === action.id ? { ...w, zIndex: ++_zCounter } : w);
    case "MINIMIZE": return state.map(w => w.id === action.id ? { ...w, minimized: true } : w);
    case "MAXIMIZE": {
      const vw = window.innerWidth, vh = window.innerHeight - 52;
      return state.map(w => {
        if (w.id !== action.id) return w;
        if (w.layout === "maximized") {
          if (!w.prevRect) return { ...w, layout: "floating" };
          return { ...w, ...w.prevRect, layout: "floating", prevRect: null };
        }
        return { ...w, prevRect: { x:w.x, y:w.y, w:w.w, h:w.h },
          x:0, y:0, w:vw, h:vh, layout:"maximized" };
      });
    }
    case "SNAP": {
      const vw = window.innerWidth, vh = window.innerHeight - 52;
      return state.map(w => {
        if (w.id !== action.id) return w;
        const prevRect = w.layout === "floating" ? {x:w.x,y:w.y,w:w.w,h:w.h} : w.prevRect;
        if (action.zone === "left")  return {...w, prevRect, x:0, y:0, w:Math.floor(vw/2), h:vh, layout:"snapped-left"};
        if (action.zone === "right") return {...w, prevRect, x:Math.floor(vw/2), y:0, w:Math.floor(vw/2), h:vh, layout:"snapped-right"};
        return w;
      });
    }
    case "RESTORE":
      return state.map(w => {
        if (w.id !== action.id || !w.prevRect) return w.id === action.id ? {...w, layout:"floating"} : w;
        return { ...w, ...w.prevRect, layout:"floating", prevRect:null };
      });
    case "MOVE": {
      return state.map(w => {
        if (w.id !== action.id) return w;
        // If dragging from maximized/snapped, restore first
        if (w.layout !== "floating") {
          const pr = w.prevRect || { x:100, y:100, w:w.w||500, h:w.h||400 };
          return { ...w, ...pr, x:action.x, y:action.y, layout:"floating", prevRect:null };
        }
        return { ...w, x: action.x, y: action.y };
      });
    }
    case "RESIZE": return state.map(w => w.id !== action.id ? w
      : { ...w, w: Math.max(280, action.w), h: Math.max(180, action.h), layout:"floating" });
    default: return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 7: THEME STORE
// ─────────────────────────────────────────────────────────────────────────────
const WALLPAPERS = {
  dark:     "radial-gradient(ellipse at 15% 55%, rgba(13,162,231,0.09) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(204,102,255,0.09) 0%, transparent 55%), #080E1D",
  navy:     "radial-gradient(ellipse at 30% 60%, rgba(13,162,231,0.12) 0%, transparent 55%), radial-gradient(ellipse at 70% 20%, rgba(100,120,255,0.07) 0%, transparent 50%), #0A1535",
  charcoal: "radial-gradient(ellipse at 70% 30%, rgba(204,102,255,0.07) 0%, transparent 50%), #0F1119",
};

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 8: WINDOW CHROME
// ─────────────────────────────────────────────────────────────────────────────
function TrafficLight({ color, label, onClick }) {
  const [h, setH] = useState(false);
  return (
    <div onClick={e => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width:13, height:13, borderRadius:"50%", background:color, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:8, fontWeight:800, color:"rgba(0,0,0,0.65)",
        transform: h ? "scale(1.25)" : "scale(1)", transition:"transform 0.1s",
        boxShadow: h ? `0 0 6px ${color}88` : "none" }}>
      {h ? label : ""}
    </div>
  );
}

function OSWindow({ win, dispatch, children }) {
  const isMaxOrSnap = win.layout !== "floating";
  const dragRef = useRef(null);

  const startDrag = useCallback(e => {
    if (isMaxOrSnap) {
      // Restore under cursor
      const pr = win.prevRect || { x: 100, y: 60, w: win.w, h: win.h };
      dispatch({ type:"MOVE", id:win.id, x: e.clientX - pr.w/2, y: e.clientY - 20 });
    }
    e.preventDefault();
    const startX = e.clientX - win.x, startY = e.clientY - win.y;
    const vw = window.innerWidth, vh = window.innerHeight;
    let snapZone = null;

    const move = e => {
      const nx = e.clientX - startX;
      const ny = e.clientY - startY;
      const cx = clamp(nx, 0, vw - (win.w||500));
      const cy = clamp(ny, 0, vh - 52 - (win.h||400));
      dispatch({ type:"MOVE", id:win.id, x:cx, y:cy });
      // Snap ghost zones
      snapZone = nx < 8 ? "left" : nx > vw - 8 ? "right" : null;
    };
    const up = () => {
      if (snapZone) dispatch({ type:"SNAP", id:win.id, zone:snapZone });
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }, [win, dispatch, isMaxOrSnap]);

  const startResize = useCallback(e => {
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, sw = win.w, sh = win.h;
    const move = e => dispatch({ type:"RESIZE", id:win.id,
      w: sw + e.clientX - sx, h: sh + e.clientY - sy });
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }, [win, dispatch]);

  const style = isMaxOrSnap
    ? { position:"fixed", top:0, left: win.layout === "snapped-right" ? window.innerWidth/2 : 0,
        width: win.layout === "maximized" ? "100vw" : "50vw",
        height:"calc(100vh - 52px)", zIndex:win.zIndex }
    : { position:"fixed", top:win.y, left:win.x, width:win.w, height:win.h, zIndex:win.zIndex };

  if (win.minimized) return null;

  return (
    <div style={{ ...style, display:"flex", flexDirection:"column",
      background:"rgba(10,16,36,0.84)", backdropFilter:"blur(32px) saturate(200%)",
      WebkitBackdropFilter:"blur(32px) saturate(200%)",
      border:"1px solid rgba(255,255,255,0.115)",
      borderRadius: isMaxOrSnap ? 0 : 13,
      boxShadow:"0 36px 90px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04) inset",
      overflow:"hidden", willChange:"transform",
      transition:"border-radius 0.2s, box-shadow 0.15s",
    }} onMouseDown={() => dispatch({ type:"FOCUS", id:win.id })}>

      {/* Title Bar */}
      <div ref={dragRef} onMouseDown={startDrag}
        onDoubleClick={() => dispatch({ type:"MAXIMIZE", id:win.id })}
        style={{ display:"flex", alignItems:"center", padding:"9px 14px", gap:7, flexShrink:0,
          background:"rgba(255,255,255,0.035)", borderBottom:"1px solid rgba(255,255,255,0.07)",
          cursor: isMaxOrSnap ? "default" : "move", userSelect:"none" }}>
        <div style={{ display:"flex", gap:6, marginRight:6 }}>
          <TrafficLight color={T.red}   label="✕" onClick={() => dispatch({ type:"CLOSE",    id:win.id })} />
          <TrafficLight color={T.amber} label="–" onClick={() => dispatch({ type:"MINIMIZE", id:win.id })} />
          <TrafficLight color={T.green} label="⤢" onClick={() => dispatch({ type:"MAXIMIZE", id:win.id })} />
        </div>
        <span style={{ fontSize:12.5, fontWeight:600, color:T.text, fontFamily:T.font, opacity:0.9 }}>
          {win.icon} {win.title}
        </span>
        {win.layout !== "floating" && (
          <span style={{ marginLeft:"auto", fontSize:10, color:T.textSub, padding:"2px 6px",
            background:"rgba(255,255,255,0.06)", borderRadius:4, border:"1px solid rgba(255,255,255,0.1)" }}>
            {win.layout}
          </span>
        )}
      </div>

      {/* App content */}
      <div style={{ flex:1, overflow:"hidden", position:"relative" }}>{children}</div>

      {/* Resize handle */}
      {!isMaxOrSnap && (
        <div onMouseDown={startResize}
          style={{ position:"absolute", bottom:0, right:0, width:18, height:18,
            cursor:"nwse-resize", borderRadius:"0 0 13px 0",
            background:"linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.12) 40%)" }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 9: APPLICATIONS
// ─────────────────────────────────────────────────────────────────────────────

// ── APP: CORTEX AI ────────────────────────────────────────────────────────────
function AppCortexAI() {
  const [msgs, setMsgs] = useState([
    { role:"assistant", content:"Cortex online. I can chat, answer questions, and control this OS.\n\nTry: \"open terminal\" or \"switch to dark mode\"" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role:"user", content: input.trim() };
    setMsgs(m => [...m, userMsg]);
    const text = input.trim();
    setInput("");
    setLoading(true);

    // Parse IPC commands first
    const cmds = parseAICommand(text);
    cmds.forEach(c => SystemBus.emit(c));

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:800,
          system: `You are Cortex — the core AI of WebOS DeskFlow. You have real control over the OS via IPC.
Available apps: ${APP_REGISTRY.map(a=>a.id).join(", ")}.
When user asks to open/close apps or change theme, acknowledge that you've sent the OS command.
Be concise, intelligent, slightly futuristic. Current VFS path: ${VFS.pwd()}`,
          messages: [...msgs, userMsg].map(m => ({ role:m.role, content:m.content })),
        })
      });
      const data = await res.json();
      const reply = data.content?.map(c => c.text||"").join("") || "Error.";
      setMsgs(m => [...m, { role:"assistant", content:reply }]);
    } catch {
      setMsgs(m => [...m, { role:"assistant", content:"Connection error." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", fontFamily:T.font }}>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
        {msgs.map((m,i) => (
          <div key={i} style={{ display:"flex", justifyContent: m.role==="user" ? "flex-end" : "flex-start" }}>
            {m.role === "assistant" && (
              <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#0DA2E7,#CC66FF)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, marginRight:8, flexShrink:0 }}>🤖</div>
            )}
            <div style={{ maxWidth:"78%", padding:"10px 14px", lineHeight:1.65, fontSize:13.5,
              borderRadius: m.role==="user" ? "16px 16px 3px 16px" : "4px 16px 16px 16px",
              background: m.role==="user"
                ? "linear-gradient(135deg,#0DA2E7,#0770A8)"
                : "rgba(255,255,255,0.06)",
              border: m.role==="assistant" ? "1px solid rgba(255,255,255,0.09)" : "none",
              color: T.text,
              boxShadow: m.role==="user" ? "0 4px 18px rgba(13,162,231,0.28)" : "none",
              whiteSpace:"pre-wrap",
            }}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", gap:5, padding:"8px 14px", alignItems:"center" }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:T.primary,
                animation:`osPulse 1.1s ease-in-out ${i*0.18}s infinite` }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding:"10px 12px", borderTop:"1px solid rgba(255,255,255,0.07)",
        display:"flex", gap:7, background:"rgba(0,0,0,0.15)" }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==="Enter" && send()}
          placeholder="Chat or issue OS commands..."
          style={{ flex:1, background:"rgba(255,255,255,0.065)", border:"1px solid rgba(255,255,255,0.11)",
            borderRadius:8, padding:"9px 12px", color:T.text, fontSize:13.5, outline:"none", fontFamily:T.font }} />
        <OSBtn onClick={send} disabled={loading} accent>↑</OSBtn>
      </div>
    </div>
  );
}

// ── APP: NOTEPAD (VFS-connected) ──────────────────────────────────────────────
function AppNotepad() {
  const [content, setContent] = useState(() => localStorage.getItem("os_note") || "");
  const [filename, setFilename] = useState("untitled.txt");
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem("os_note", content);
    VFS.write(filename, content);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  const openFromVFS = () => {
    const c = VFS.cat(filename);
    if (c !== null) setContent(c);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", fontFamily:T.font }}>
      <div style={{ padding:"6px 10px", borderBottom:"1px solid rgba(255,255,255,0.07)",
        display:"flex", gap:6, alignItems:"center", background:"rgba(0,0,0,0.1)" }}>
        <input value={filename} onChange={e => setFilename(e.target.value)}
          style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:5, padding:"3px 8px", color:T.text, fontSize:11.5, outline:"none",
            fontFamily:T.mono, width:150 }} />
        <OSBtn onClick={save}>{saved ? "✓ Saved" : "💾 Save"}</OSBtn>
        <OSBtn onClick={openFromVFS}>📂 Load VFS</OSBtn>
        <OSBtn onClick={() => setContent("")}>🗑 Clear</OSBtn>
        <span style={{ marginLeft:"auto", fontSize:11, color:T.textMute }}>
          {content.length} chars · {content.split("\n").length} lines
        </span>
      </div>
      <textarea value={content} onChange={e => setContent(e.target.value)}
        style={{ flex:1, background:"transparent", border:"none", outline:"none",
          color:T.text, fontFamily:T.mono, fontSize:13, padding:"12px 14px",
          resize:"none", lineHeight:1.75 }}
        placeholder="Start typing... (Ctrl+S to save)" />
    </div>
  );
}

// ── APP: CODE STUDIO ──────────────────────────────────────────────────────────
const DEFAULT_CODE = `<!DOCTYPE html>
<html>
<head>
<style>
  body {
    margin: 0;
    background: #080E1D;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    font-family: 'Space Grotesk', sans-serif;
    color: #0DA2E7;
  }
  h1 {
    font-size: 2.5rem;
    text-shadow: 0 0 30px #0DA2E7, 0 0 60px #CC66FF44;
    animation: pulse 2s ease-in-out infinite alternate;
  }
  @keyframes pulse {
    from { text-shadow: 0 0 20px #0DA2E7; color: #0DA2E7; }
    to   { text-shadow: 0 0 40px #CC66FF; color: #CC66FF; }
  }
</style>
</head>
<body>
  <h1>WebOS DeskFlow ✨</h1>
</body>
</html>`;

function AppCode() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [preview, setPreview] = useState(DEFAULT_CODE);
  const [autoRun, setAutoRun] = useState(false);

  useEffect(() => { if (autoRun) setPreview(code); }, [code, autoRun]);

  return (
    <div style={{ display:"flex", height:"100%", flexDirection:"column" }}>
      <div style={{ padding:"5px 10px", borderBottom:"1px solid rgba(255,255,255,0.07)",
        display:"flex", gap:6, alignItems:"center", background:"rgba(0,0,0,0.1)", flexShrink:0 }}>
        <OSBtn onClick={() => setPreview(code)} accent>▶ Run</OSBtn>
        <label style={{ display:"flex", alignItems:"center", gap:4, fontSize:11.5, color:T.textSub, cursor:"pointer" }}>
          <input type="checkbox" checked={autoRun} onChange={e => setAutoRun(e.target.checked)} />
          Auto-run
        </label>
        <OSBtn onClick={() => setCode(DEFAULT_CODE)}>Reset</OSBtn>
        <span style={{ marginLeft:"auto", fontSize:11, color:T.textMute, fontFamily:T.mono }}>HTML/CSS/JS</span>
      </div>
      <div style={{ flex:1, display:"flex" }}>
        <div style={{ flex:1, borderRight:"1px solid rgba(255,255,255,0.07)", overflow:"hidden" }}>
          <textarea value={code} onChange={e => setCode(e.target.value)}
            style={{ width:"100%", height:"100%", background:"rgba(0,0,0,0.3)",
              border:"none", outline:"none", color:"#93E07A",
              fontFamily:T.mono, fontSize:12.5, padding:"10px 12px",
              resize:"none", lineHeight:1.7, tabSize:2 }} />
        </div>
        <div style={{ flex:1, background:"white" }}>
          <iframe srcDoc={preview} style={{ width:"100%", height:"100%", border:"none" }}
            title="preview" sandbox="allow-scripts" />
        </div>
      </div>
    </div>
  );
}

// ── APP: FILE EXPLORER (VFS-connected) ────────────────────────────────────────
function AppFiles() {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n+1);
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [newName, setNewName] = useState("");
  const [mode, setMode] = useState(null); // "newfile" | "newfolder"

  const currentNode = VFS._getNode(_vfsPath);
  const items = currentNode?.children || [];

  const open = (item) => {
    if (item.type === "folder") { VFS.cd(item.name); setSelected(null); setPreview(null); refresh(); }
    else { setSelected(item.name); setPreview(item.content || ""); }
  };

  const openInNotepad = (name) => {
    SystemBus.emit({ type:"OPEN_APP", payload:{ id:"notepad" } });
    // IPC: file-to-app pipe
    setTimeout(() => SystemBus.emit({ type:"FILE_OPEN", payload:{ filename:name, content: VFS.cat(name) } }), 300);
  };

  return (
    <div style={{ display:"flex", height:"100%", fontFamily:T.font }}>
      {/* Sidebar */}
      <div style={{ width:150, borderRight:"1px solid rgba(255,255,255,0.07)", padding:8,
        display:"flex", flexDirection:"column", gap:2, overflowY:"auto", background:"rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize:10, fontWeight:700, color:T.textMute, letterSpacing:1, marginBottom:6, padding:"0 4px" }}>LOCATIONS</div>
        {VFS._getNode([])?.children?.filter(c => c.type==="folder").map(f => (
          <div key={f.name} onClick={() => { _vfsPath=[f.name]; setSelected(null); refresh(); }}
            style={{ padding:"5px 8px", borderRadius:5, cursor:"pointer", fontSize:12,
              color:T.text, background:_vfsPath[0]===f.name?"rgba(13,162,231,0.18)":"transparent",
              transition:"background 0.1s", display:"flex", alignItems:"center", gap:5 }}>
            📁 {f.name}
          </div>
        ))}
        <div style={{ marginTop:"auto", borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:8 }}>
          <div style={{ fontSize:11, color:T.textMute, padding:"2px 4px" }}>{VFS.pwd()}</div>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"6px 10px", borderBottom:"1px solid rgba(255,255,255,0.07)",
          display:"flex", gap:5, alignItems:"center", background:"rgba(0,0,0,0.1)", flexShrink:0 }}>
          <OSBtn onClick={() => { VFS.cd(".."); refresh(); }}>⬆</OSBtn>
          <OSBtn onClick={() => { _vfsPath=[]; refresh(); }}>⌂</OSBtn>
          <span style={{ fontSize:11.5, color:T.textSub, fontFamily:T.mono }}>{VFS.pwd()}</span>
          <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
            <OSBtn onClick={() => setMode("newfile")}>+ File</OSBtn>
            <OSBtn onClick={() => setMode("newfolder")}>+ Dir</OSBtn>
          </div>
        </div>
        {mode && (
          <div style={{ padding:"6px 10px", borderBottom:"1px solid rgba(255,255,255,0.07)",
            display:"flex", gap:5, alignItems:"center", background:"rgba(13,162,231,0.05)" }}>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder={mode==="newfile"?"filename.txt":"folder name"}
              autoFocus
              onKeyDown={e => { if(e.key==="Enter"){ mode==="newfile"?VFS.touch(newName):VFS.mkdir(newName); setNewName(""); setMode(null); refresh(); }}}
              style={{ flex:1, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)",
                borderRadius:5, padding:"4px 8px", color:T.text, fontSize:12, outline:"none" }} />
            <OSBtn accent onClick={() => { mode==="newfile"?VFS.touch(newName):VFS.mkdir(newName); setNewName(""); setMode(null); refresh(); }}>Create</OSBtn>
            <OSBtn onClick={() => { setMode(null); setNewName(""); }}>✕</OSBtn>
          </div>
        )}
        <div style={{ flex:1, padding:10, display:"flex", flexWrap:"wrap", gap:6,
          alignContent:"flex-start", overflowY:"auto" }}>
          {items.map(item => (
            <div key={item.name}
              onDoubleClick={() => open(item)}
              onClick={() => setSelected(item.name)}
              onContextMenu={e => { e.preventDefault(); VFS.rm(item.name); refresh(); }}
              style={{ width:88, padding:"10px 4px", borderRadius:8, cursor:"pointer", textAlign:"center",
                background: selected===item.name ? "rgba(13,162,231,0.18)" : "rgba(255,255,255,0.04)",
                border:`1px solid ${selected===item.name ? "rgba(13,162,231,0.35)" : "rgba(255,255,255,0.07)"}`,
                transition:"all 0.12s" }}>
              <div style={{ fontSize:26 }}>{item.type==="folder"?"📁":"📄"}</div>
              <div style={{ fontSize:10.5, color:T.text, marginTop:3, wordBreak:"break-all", lineHeight:1.3 }}>{item.name}</div>
            </div>
          ))}
          {items.length===0 && <div style={{ color:T.textMute, fontSize:13, padding:20 }}>(empty folder)</div>}
        </div>
        {preview !== null && (
          <div style={{ height:120, borderTop:"1px solid rgba(255,255,255,0.07)", padding:"8px 12px",
            background:"rgba(0,0,0,0.15)", display:"flex", flexDirection:"column", gap:4 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:11, color:T.textSub, fontFamily:T.mono }}>{selected}</span>
              <OSBtn onClick={() => openInNotepad(selected)}>Open in Notepad</OSBtn>
            </div>
            <pre style={{ fontSize:11.5, color:T.text, margin:0, fontFamily:T.mono,
              whiteSpace:"pre-wrap", overflowY:"auto", flex:1 }}>{preview.slice(0,300)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ── APP: CALCULATOR ───────────────────────────────────────────────────────────
function AppCalc() {
  const [display, setDisplay] = useState("0");
  const [expr, setExpr] = useState("");
  const [memory, setMemory] = useState(0);

  const press = (val) => {
    if (val==="C")   { setDisplay("0"); setExpr(""); return; }
    if (val==="CE")  { setDisplay("0"); setExpr(expr.slice(0,-1)||""); return; }
    if (val==="M+")  { setMemory(m => m + parseFloat(display||0)); return; }
    if (val==="MR")  { const s=String(memory); setExpr(s); setDisplay(s); return; }
    if (val==="MC")  { setMemory(0); return; }
    if (val==="+/-") { const s=String(-parseFloat(display)); setExpr(s); setDisplay(s); return; }
    if (val==="%")   { const s=String(parseFloat(expr||display)/100); setExpr(s); setDisplay(s); return; }
    if (val==="=") {
      try {
        const r = Function('"use strict";return (' + expr + ")")();
        setDisplay(String(Number(r.toFixed(10))));
        setExpr(String(r));
      } catch { setDisplay("Error"); setExpr(""); }
      return;
    }
    const next = (expr==="0"||expr==="Error") && !"+-*/".includes(val) ? val : expr + val;
    setExpr(next); setDisplay(next.slice(-16));
  };

  const rows = [
    ["MC","MR","M+","%"],
    ["C","CE","(",")"],
    ["7","8","9","/"],
    ["4","5","6","*"],
    ["1","2","3","-"],
    ["0",".","=","+"],
  ];
  const accent = ["/","*","-","+","="];
  const muted  = ["MC","MR","M+","%","C","CE","(",")"];

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", padding:14, gap:8, fontFamily:T.font }}>
      <div style={{ background:"rgba(0,0,0,0.35)", borderRadius:10, padding:"12px 14px",
        border:"1px solid rgba(255,255,255,0.07)", textAlign:"right" }}>
        <div style={{ fontSize:10.5, color:T.textMute, minHeight:14, fontFamily:T.mono }}>{expr.slice(-24)}</div>
        <div style={{ fontSize:30, color:T.text, fontWeight:300, letterSpacing:-0.5, marginTop:2, fontFamily:T.mono }}>
          {display.slice(-14)}
        </div>
        {memory!==0 && <div style={{ fontSize:10, color:T.primary }}>M: {memory}</div>}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, flex:1 }}>
        {rows.flat().map(b => (
          <button key={b} onClick={() => press(b)}
            style={{ borderRadius:8, border:"1px solid rgba(255,255,255,0.09)", cursor:"pointer",
              fontSize:15, fontWeight:600, fontFamily:T.font,
              background: accent.includes(b) ? "linear-gradient(135deg,#0DA2E7,#0770A8)"
                : muted.includes(b) ? "rgba(255,255,255,0.05)"
                : "rgba(255,255,255,0.08)",
              color: accent.includes(b) ? "#fff" : muted.includes(b) ? T.textSub : T.text,
              transition:"transform 0.08s, background 0.1s",
              boxShadow: accent.includes(b) ? "0 2px 12px rgba(13,162,231,0.25)" : "none" }}>
            {b}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── APP: TERMINAL (IPC + VFS + AI) ────────────────────────────────────────────
function AppTerminal() {
  const [history, setHistory] = useState([
    { type:"sys", text:"WebOS DeskFlow Terminal v2.0" },
    { type:"sys", text:`Type 'help' for commands. IPC Bus: ONLINE · VFS: ONLINE · Cortex: ONLINE` },
    { type:"sys", text:`Path: ${VFS.pwd()}` },
  ]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bottomRef = useRef(null);
  const cmds = useRef(null);

  useEffect(() => {
    cmds.current = buildTerminalCommands(null, setHistory);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [history]);

  const run = async () => {
    if (!input.trim()) return;
    const raw = input.trim();
    setCmdHistory(h => [raw, ...h.slice(0,49)]);
    setHistIdx(-1);
    setHistory(h => [...h, { type:"in", text:`${VFS.pwd()} $ ${raw}` }]);
    setInput("");

    const [cmd, ...args] = raw.split(" ");
    const handler = cmds.current?.[cmd.toLowerCase()];

    if (!handler) {
      setHistory(h => [...h, { type:"err", text:`command not found: ${cmd}` }]);
      return;
    }

    const result = handler instanceof Function ? handler(args) : handler;
    if (result && typeof result.then === "function") {
      setHistory(h => [...h, { type:"out", text:"..." }]);
      const r = await result;
      setHistory(h => { const n=[...h]; n[n.length-1]={ type:"out", text:r }; return n; });
    } else if (result === "__CLEAR__") {
      setHistory([]);
    } else if (result) {
      setHistory(h => [...h, { type:"out", text:String(result) }]);
    }
  };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column",
      background:"rgba(4,8,18,0.6)", fontFamily:T.mono }}>
      <div style={{ flex:1, overflowY:"auto", padding:"10px 14px", display:"flex", flexDirection:"column", gap:2 }}>
        {history.map((h,i) => (
          <div key={i} style={{ fontSize:12.5, lineHeight:1.55, whiteSpace:"pre-wrap",
            color: h.type==="in" ? T.primary : h.type==="sys" ? T.accent : h.type==="err" ? T.red : "#93E07A" }}>
            {h.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display:"flex", padding:"8px 12px", borderTop:"1px solid rgba(255,255,255,0.07)",
        gap:6, alignItems:"center", background:"rgba(0,0,0,0.2)" }}>
        <span style={{ color:T.primary, fontSize:12.5 }}>{VFS.pwd()} $</span>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key==="Enter") run();
            if (e.key==="ArrowUp") {
              const ni = Math.min(histIdx+1, cmdHistory.length-1);
              setHistIdx(ni); setInput(cmdHistory[ni]||"");
            }
            if (e.key==="ArrowDown") {
              const ni = Math.max(histIdx-1, -1);
              setHistIdx(ni); setInput(ni===-1?"":cmdHistory[ni]||"");
            }
          }}
          style={{ flex:1, background:"transparent", border:"none", outline:"none",
            color:"#93E07A", fontFamily:T.mono, fontSize:12.5 }}
          placeholder="enter command..."
          autoFocus
        />
      </div>
    </div>
  );
}

// ── APP: PIXELPAINT ───────────────────────────────────────────────────────────
function AppPaint() {
  const canvasRef = useRef(null);
  const [color, setColor] = useState("#0DA2E7");
  const [size, setSize] = useState(8);
  const [tool, setTool] = useState("brush");
  const drawing = useRef(false);
  const lastPos = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = 900; c.height = 700;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0A0F1E";
    ctx.fillRect(0, 0, 900, 700);
  }, []);

  const getPos = e => {
    const r = canvasRef.current.getBoundingClientRect();
    const sx = canvasRef.current.width / r.width;
    const sy = canvasRef.current.height / r.height;
    return [(e.clientX - r.left) * sx, (e.clientY - r.top) * sy];
  };

  const draw = e => {
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const [x, y] = getPos(e);
    ctx.lineWidth = tool==="eraser" ? size*3 : size;
    ctx.strokeStyle = tool==="eraser" ? "#0A0F1E" : color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (lastPos.current) { ctx.beginPath(); ctx.moveTo(...lastPos.current); ctx.lineTo(x,y); ctx.stroke(); }
    lastPos.current = [x,y];
  };

  const COLORS = ["#FF5F57","#FEBC2E","#28C840","#0DA2E7","#CC66FF","#FF6B9D","#FFE66D","#4ECDC4","#A8FF78","#FFFFFF","#334155","#000000"];

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"6px 10px", borderBottom:"1px solid rgba(255,255,255,0.07)",
        display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", background:"rgba(0,0,0,0.1)", flexShrink:0 }}>
        {COLORS.map(c => (
          <div key={c} onClick={() => { setColor(c); setTool("brush"); }}
            style={{ width:17, height:17, borderRadius:4, background:c, cursor:"pointer",
              border: color===c&&tool==="brush" ? "2px solid white" : "2px solid transparent",
              boxShadow: color===c&&tool==="brush" ? `0 0 6px ${c}` : "none",
              transition:"all 0.1s" }} />
        ))}
        <input type="color" value={color} onChange={e => { setColor(e.target.value); setTool("brush"); }}
          style={{ width:22, height:22, border:"none", background:"none", cursor:"pointer", padding:0 }} />
        <span style={{ color:T.textSub, fontSize:11 }}>|</span>
        <OSBtn onClick={() => setTool("eraser")}
          style={{ background: tool==="eraser" ? "rgba(255,95,87,0.25)" : undefined }}>⬜ Eraser</OSBtn>
        <input type="range" min={1} max={50} value={size} onChange={e => setSize(+e.target.value)}
          style={{ width:70 }} />
        <span style={{ fontSize:11, color:T.textSub }}>{size}px</span>
        <OSBtn onClick={() => {
          const ctx = canvasRef.current.getContext("2d");
          ctx.fillStyle="#0A0F1E"; ctx.fillRect(0,0,900,700);
        }}>🗑 Clear</OSBtn>
        <OSBtn onClick={() => {
          const a = document.createElement("a");
          a.href = canvasRef.current.toDataURL();
          a.download = "deskflow-art.png"; a.click();
        }}>⬇ Save</OSBtn>
      </div>
      <div style={{ flex:1, overflow:"hidden", cursor:"crosshair" }}>
        <canvas ref={canvasRef}
          style={{ width:"100%", height:"100%", display:"block" }}
          onMouseDown={e => { drawing.current=true; lastPos.current=null; draw(e); }}
          onMouseMove={draw}
          onMouseUp={() => { drawing.current=false; lastPos.current=null; }}
          onMouseLeave={() => { drawing.current=false; lastPos.current=null; }} />
      </div>
    </div>
  );
}

// ── APP: TASK MANAGER ─────────────────────────────────────────────────────────
function AppTaskManager({ windows, dispatch }) {
  const [, tick] = useState(0);
  useEffect(() => { const iv = setInterval(() => tick(n=>n+1), 2000); return () => clearInterval(iv); }, []);
  const uptime = Math.floor(performance.now()/1000);

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", fontFamily:T.font }}>
      <div style={{ padding:"8px 14px", borderBottom:"1px solid rgba(255,255,255,0.07)",
        display:"flex", gap:16, alignItems:"center", background:"rgba(0,0,0,0.1)", flexShrink:0 }}>
        <Stat label="Processes" value={windows.length} />
        <Stat label="Uptime" value={`${Math.floor(uptime/60)}m ${uptime%60}s`} />
        <Stat label="IPC Bus" value="LIVE" color={T.green} />
        <Stat label="VFS" value="MOUNTED" color={T.primary} />
        <Stat label="Cortex" value="ONLINE" color={T.accent} />
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"8px 10px" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ fontSize:10.5, color:T.textMute, borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
              {["PID","APP","LAYOUT","Z-INDEX","STATUS","ACTION"].map(h => (
                <th key={h} style={{ textAlign:"left", padding:"4px 8px", fontWeight:700, letterSpacing:0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {windows.map((w,i) => (
              <tr key={w.id} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:12.5, color:T.text }}>
                <td style={{ padding:"7px 8px", color:T.textMute, fontFamily:T.mono }}>{1000+i}</td>
                <td style={{ padding:"7px 8px" }}>{w.icon} {w.title}</td>
                <td style={{ padding:"7px 8px" }}>
                  <span style={{ padding:"1px 6px", borderRadius:3, fontSize:10.5, fontFamily:T.mono,
                    background:"rgba(204,102,255,0.12)", color:T.accent }}>{w.layout}</span>
                </td>
                <td style={{ padding:"7px 8px", fontFamily:T.mono, color:T.textSub }}>{w.zIndex}</td>
                <td style={{ padding:"7px 8px" }}>
                  <span style={{ padding:"2px 7px", borderRadius:4, fontSize:10.5,
                    background: w.minimized ? "rgba(254,188,46,0.15)" : "rgba(40,200,64,0.15)",
                    color: w.minimized ? T.amber : T.green }}>{w.minimized?"minimized":"active"}</span>
                </td>
                <td style={{ padding:"7px 8px" }}>
                  <button onClick={() => dispatch({ type:"CLOSE", id:w.id })}
                    style={{ background:"rgba(255,95,87,0.18)", border:"1px solid rgba(255,95,87,0.3)",
                      borderRadius:4, color:T.red, cursor:"pointer", padding:"2px 8px",
                      fontSize:11, fontFamily:T.font }}>Kill</button>
                </td>
              </tr>
            ))}
            {windows.length===0 && (
              <tr><td colSpan={6} style={{ padding:24, textAlign:"center", color:T.textMute, fontSize:13 }}>No processes</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
      <div style={{ fontSize:9.5, color:T.textMute, fontWeight:700, letterSpacing:0.8 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:700, color: color || T.text, fontFamily:T.mono }}>{value}</div>
    </div>
  );
}

// ── APP: SETTINGS ─────────────────────────────────────────────────────────────
function AppSettings({ theme, setTheme }) {
  const themes = [
    { id:"dark",     label:"Dark Void",    preview:"#080E1D" },
    { id:"navy",     label:"Deep Navy",    preview:"#0A1535" },
    { id:"charcoal", label:"Charcoal",     preview:"#0F1119" },
  ];
  return (
    <div style={{ height:"100%", overflowY:"auto", padding:20, fontFamily:T.font, display:"flex", flexDirection:"column", gap:20 }}>
      <SettingsSection title="WALLPAPER / THEME">
        <div style={{ display:"flex", gap:8 }}>
          {themes.map(t => (
            <div key={t.id} onClick={() => setTheme(t.id)}
              style={{ flex:1, padding:"14px 8px", borderRadius:9, cursor:"pointer", textAlign:"center",
                background:t.preview,
                border:`2px solid ${theme===t.id ? T.primary : "rgba(255,255,255,0.09)"}`,
                color:T.text, fontSize:12, fontWeight:600,
                boxShadow: theme===t.id ? `0 0 18px ${T.primary}44` : "none",
                transition:"all 0.18s" }}>{t.label}</div>
          ))}
        </div>
      </SettingsSection>
      <SettingsSection title="SYSTEM INFO">
        {[
          ["OS",       "WebOS DeskFlow v2.0"],
          ["Kernel",   "IPC System Bus + VFS"],
          ["AI",       "Cortex (Claude Sonnet)"],
          ["Renderer", "React 18 + Glassmorphism"],
          ["Apps",     `${APP_REGISTRY.length} installed`],
          ["VFS",      VFS.pwd()],
          ["IPC",      `${_busListeners.length} listeners`],
          ["Build",    new Date().toLocaleDateString()],
        ].map(([k,v]) => (
          <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0",
            borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:12.5 }}>
            <span style={{ color:T.textSub }}>{k}</span>
            <span style={{ color:T.text, fontFamily:T.mono, fontSize:12 }}>{v}</span>
          </div>
        ))}
      </SettingsSection>
      <SettingsSection title="IPC BUS EVENTS">
        <div style={{ fontSize:11.5, color:T.textSub, lineHeight:1.8, fontFamily:T.mono }}>
          OPEN_APP · CLOSE_APP · FOCUS_APP<br/>
          THEME_CHANGE · FILE_OPEN<br/>
          TERMINAL_OUTPUT · SHUTDOWN
        </div>
      </SettingsSection>
    </div>
  );
}
function SettingsSection({ title, children }) {
  return (
    <div>
      <div style={{ fontSize:10, fontWeight:700, color:T.textMute, letterSpacing:1.5, marginBottom:10 }}>{title}</div>
      {children}
    </div>
  );
}

// ── APP: WEB BROWSER ──────────────────────────────────────────────────────────
function AppBrowser() {
  const [url, setUrl] = useState("https://example.com");
  const [src, setSrc] = useState("");
  const [loading, setLoading] = useState(false);
  const load = () => {
    let u = url.trim();
    if (!u.startsWith("http")) u = "https://" + u;
    setLoading(true);
    setSrc(u);
    setTimeout(() => setLoading(false), 1200);
  };
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"6px 10px", borderBottom:"1px solid rgba(255,255,255,0.07)",
        display:"flex", gap:5, alignItems:"center", background:"rgba(0,0,0,0.1)", flexShrink:0 }}>
        <OSBtn onClick={() => {}}>◀</OSBtn>
        <OSBtn onClick={() => {}}>▶</OSBtn>
        <OSBtn onClick={() => { setSrc(""); setTimeout(() => setSrc(url),50); }}>↺</OSBtn>
        <input value={url} onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key==="Enter" && load()}
          style={{ flex:1, background:"rgba(255,255,255,0.065)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:6, padding:"5px 10px", color:T.text, fontSize:12.5, outline:"none",
            fontFamily:T.mono }} />
        <OSBtn accent onClick={load}>Go</OSBtn>
      </div>
      {loading && <div style={{ height:2, background:`linear-gradient(90deg, ${T.primary}, ${T.accent})`,
        animation:"browserLoad 1s ease-out" }} />}
      <div style={{ flex:1, position:"relative", background:"white" }}>
        {src ? (
          <iframe src={src} style={{ width:"100%", height:"100%", border:"none" }}
            title="browser" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
        ) : (
          <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center",
            justifyContent:"center", background:T.bg, gap:14 }}>
            <div style={{ fontSize:52 }}>🌐</div>
            <div style={{ color:T.textSub, fontSize:13, fontFamily:T.font }}>Enter a URL and press Go</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
              {["google.com","github.com","example.com"].map(s => (
                <div key={s} onClick={() => { setUrl(s); setTimeout(load,50); }}
                  style={{ padding:"5px 12px", borderRadius:20, background:"rgba(255,255,255,0.07)",
                    border:"1px solid rgba(255,255,255,0.1)", cursor:"pointer", color:T.textSub, fontSize:12 }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── APP: MEDIA PLAYER ─────────────────────────────────────────────────────────
function AppMedia() {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [vol, setVol] = useState(80);
  const [current, setCurrent] = useState(0);
  const tracks = [
    { title:"Ambient Zero",  artist:"DeskFlow OST",   dur:"3:24", color:"#0DA2E7" },
    { title:"Glass Horizon", artist:"Cortex Beats",   dur:"4:11", color:"#CC66FF" },
    { title:"Neural Loop",   artist:"WebOS Radio",    dur:"2:58", color:"#28C840" },
    { title:"IPC Dreams",    artist:"System Bus",     dur:"5:02", color:"#FEBC2E" },
  ];
  useEffect(() => {
    let iv;
    if (playing) iv = setInterval(() => setProgress(p => p >= 100 ? (setCurrent(c=>(c+1)%tracks.length),0) : p+0.4), 120);
    return () => clearInterval(iv);
  }, [playing]);

  const t = tracks[current];
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", padding:18, gap:14,
      fontFamily:T.font, alignItems:"center" }}>
      {/* Disc */}
      <div style={{ width:110, height:110, borderRadius:"50%", flexShrink:0,
        background:`conic-gradient(${t.color}, ${T.accent}, ${t.color})`,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:42,
        boxShadow:`0 0 40px ${t.color}55, 0 0 80px ${t.color}22`,
        animation: playing ? "osSpin 5s linear infinite" : "none",
        position:"relative" }}>
        <div style={{ width:30, height:30, borderRadius:"50%", background:T.bg,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🎵</div>
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:15, fontWeight:700, color:T.text }}>{t.title}</div>
        <div style={{ fontSize:12, color:T.textSub }}>{t.artist}</div>
      </div>
      {/* Progress */}
      <div style={{ width:"100%", height:4, background:"rgba(255,255,255,0.08)", borderRadius:2, cursor:"pointer" }}
        onClick={e => { const r=e.currentTarget.getBoundingClientRect(); setProgress(((e.clientX-r.left)/r.width)*100); }}>
        <div style={{ width:`${progress}%`, height:"100%", borderRadius:2, transition:"width 0.1s",
          background:`linear-gradient(90deg,${t.color},${T.accent})` }} />
      </div>
      {/* Controls */}
      <div style={{ display:"flex", gap:12, alignItems:"center" }}>
        <MediaBtn onClick={() => setCurrent(c => (c-1+tracks.length)%tracks.length)}>⏮</MediaBtn>
        <MediaBtn big onClick={() => setPlaying(p=>!p)} color={t.color}>{playing?"⏸":"▶"}</MediaBtn>
        <MediaBtn onClick={() => setCurrent(c => (c+1)%tracks.length)}>⏭</MediaBtn>
      </div>
      {/* Volume */}
      <div style={{ display:"flex", gap:8, alignItems:"center", width:"100%" }}>
        <span style={{ fontSize:13 }}>🔊</span>
        <input type="range" min={0} max={100} value={vol} onChange={e => setVol(+e.target.value)} style={{ flex:1 }} />
        <span style={{ fontSize:11, color:T.textMute, width:30 }}>{vol}%</span>
      </div>
      {/* Track list */}
      <div style={{ width:"100%", borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:10,
        display:"flex", flexDirection:"column", gap:4 }}>
        {tracks.map((track,i) => (
          <div key={i} onClick={() => { setCurrent(i); setProgress(0); }}
            style={{ display:"flex", justifyContent:"space-between", padding:"6px 10px",
              borderRadius:6, cursor:"pointer",
              background: current===i ? `rgba(${track.color.replace('#','').match(/.{2}/g).map(x=>parseInt(x,16)).join(',')},0.12)` : "transparent",
              border: current===i ? `1px solid ${track.color}44` : "1px solid transparent",
              transition:"all 0.14s" }}>
            <div>
              <div style={{ fontSize:12.5, color:T.text }}>{i===current?"▶ ":""}{track.title}</div>
              <div style={{ fontSize:11, color:T.textSub }}>{track.artist}</div>
            </div>
            <div style={{ fontSize:11.5, color:T.textMute, alignSelf:"center", fontFamily:T.mono }}>{track.dur}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function MediaBtn({ children, onClick, big, color }) {
  return (
    <button onClick={onClick}
      style={{ width:big?50:38, height:big?50:38, borderRadius:"50%",
        border:`1px solid rgba(255,255,255,0.14)`,
        background: big ? `linear-gradient(135deg,${color||T.primary},${T.accent})` : "rgba(255,255,255,0.07)",
        color:"white", fontSize:big?17:14, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow: big ? `0 4px 18px ${(color||T.primary)}44` : "none" }}>
      {children}
    </button>
  );
}

// ── APP: DEVVAULT ─────────────────────────────────────────────────────────────
function AppVault() {
  const [entries, setEntries] = useState(() => {
    try { return JSON.parse(localStorage.getItem("os_vault")||"[]"); } catch { return []; }
  });
  const [form, setForm] = useState({ site:"", user:"", pass:"" });
  const [show, setShow] = useState({});
  const [search, setSearch] = useState("");

  const persist = (next) => { setEntries(next); localStorage.setItem("os_vault", JSON.stringify(next)); };

  const add = () => {
    if (!form.site||!form.user||!form.pass) return;
    persist([...entries, { ...form, id:Date.now() }]);
    setForm({ site:"", user:"", pass:"" });
  };
  const del = (id) => persist(entries.filter(e=>e.id!==id));
  const copy = (text) => navigator.clipboard.writeText(text);

  const filtered = entries.filter(e =>
    e.site.toLowerCase().includes(search.toLowerCase()) ||
    e.user.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", fontFamily:T.font }}>
      <div style={{ padding:"8px 12px", borderBottom:"1px solid rgba(255,255,255,0.07)",
        display:"flex", gap:6, alignItems:"center", background:"rgba(0,0,0,0.1)", flexWrap:"wrap", flexShrink:0 }}>
        <input value={form.site} onChange={e=>setForm(f=>({...f,site:e.target.value}))}
          placeholder="site" style={IS} />
        <input value={form.user} onChange={e=>setForm(f=>({...f,user:e.target.value}))}
          placeholder="username" style={IS} />
        <input value={form.pass} onChange={e=>setForm(f=>({...f,pass:e.target.value}))}
          placeholder="password" type="password" style={IS}
          onKeyDown={e=>e.key==="Enter"&&add()} />
        <OSBtn accent onClick={add}>+ Add</OSBtn>
      </div>
      <div style={{ padding:"6px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)", flexShrink:0 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Search vault..."
          style={{ ...IS, width:"100%", fontSize:12 }} />
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:10, display:"flex", flexDirection:"column", gap:7 }}>
        {filtered.map(e => (
          <div key={e.id} style={{ padding:"10px 14px", borderRadius:8,
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:T.text }}>🔗 {e.site}</div>
              <div style={{ fontSize:12, color:T.textSub, marginTop:2 }}>
                {e.user} · {show[e.id] ? e.pass : "••••••••"}
              </div>
            </div>
            <div style={{ display:"flex", gap:5 }}>
              <OSBtn onClick={() => setShow(s=>({...s,[e.id]:!s[e.id]}))}>👁</OSBtn>
              <OSBtn onClick={() => copy(e.pass)}>📋</OSBtn>
              <button onClick={() => del(e.id)}
                style={{ ...BS, background:"rgba(255,95,87,0.18)", border:"1px solid rgba(255,95,87,0.28)", color:T.red }}>
                🗑
              </button>
            </div>
          </div>
        ))}
        {filtered.length===0 && (
          <div style={{ textAlign:"center", color:T.textMute, fontSize:13, padding:30 }}>
            {entries.length===0 ? "Vault is empty" : "No matches"}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────
const BS = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)",
  borderRadius:6, color:T.text, cursor:"pointer", padding:"4px 9px",
  fontSize:12, fontFamily:T.font, transition:"background 0.12s",
};
const IS = {
  background:"rgba(255,255,255,0.065)", border:"1px solid rgba(255,255,255,0.1)",
  borderRadius:6, color:T.text, padding:"5px 9px", fontSize:12.5, outline:"none",
  fontFamily:T.font,
};
function OSBtn({ onClick, children, style, accent, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...BS, ...style,
        background: accent ? "linear-gradient(135deg,#0DA2E7,#0770A8)" : BS.background,
        boxShadow: accent ? "0 2px 12px rgba(13,162,231,0.22)" : "none",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer" }}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP RENDERER
// ─────────────────────────────────────────────────────────────────────────────
function renderApp(id, windows, dispatch, theme, setTheme) {
  switch(id) {
    case "ai":       return <AppCortexAI />;
    case "notepad":  return <AppNotepad />;
    case "code":     return <AppCode />;
    case "files":    return <AppFiles />;
    case "calc":     return <AppCalc />;
    case "terminal": return <AppTerminal />;
    case "paint":    return <AppPaint />;
    case "tasks":    return <AppTaskManager windows={windows} dispatch={dispatch} />;
    case "settings": return <AppSettings theme={theme} setTheme={setTheme} />;
    case "browser":  return <AppBrowser />;
    case "media":    return <AppMedia />;
    case "vault":    return <AppVault />;
    default:         return <div style={{ padding:20, color:T.textMute }}>App not found</div>;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 10: DESKTOP + TASKBAR + OS CHROME
// ─────────────────────────────────────────────────────────────────────────────
function DesktopIcon({ app, onOpen }) {
  const [h, setH] = useState(false);
  return (
    <div onDoubleClick={onOpen} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width:72, display:"flex", flexDirection:"column", alignItems:"center", gap:4,
        padding:"8px 4px", borderRadius:8, cursor:"pointer",
        background: h ? "rgba(255,255,255,0.07)" : "transparent",
        transition:"background 0.15s", fontFamily:T.font }}>
      <div style={{ fontSize:28, filter: h ? `drop-shadow(0 0 10px ${T.primary}99)` : "none",
        transition:"filter 0.2s" }}>{app.icon}</div>
      <div style={{ fontSize:10, color:"rgba(255,255,255,0.82)", textAlign:"center",
        textShadow:"0 1px 5px rgba(0,0,0,0.9)", fontWeight:500, lineHeight:1.2,
        maxWidth:70, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        background: h ? "rgba(0,0,0,0.4)" : "transparent", padding:"1px 3px", borderRadius:3 }}>
        {app.title}
      </div>
    </div>
  );
}

function DockIcon({ app, win, dispatch, launch }) {
  const [h, setH] = useState(false);
  const focused = win && !win.minimized;
  const click = () => {
    if (!win) { launch(app.id); return; }
    if (win.minimized) dispatch({ type:"OPEN", appId:app.id });
    else if (focused) dispatch({ type:"MINIMIZE", id:app.id });
    else dispatch({ type:"FOCUS", id:app.id });
  };
  return (
    <div style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
      <div onClick={click} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{ width:37, height:37, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:19, cursor:"pointer",
          background: focused ? "rgba(13,162,231,0.22)" : h ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.055)",
          border:`1px solid ${focused ? "rgba(13,162,231,0.38)" : h ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"}`,
          transform: h ? "translateY(-3px) scale(1.13)" : "translateY(0) scale(1)",
          transition:"all 0.15s",
          boxShadow: focused ? `0 4px 18px rgba(13,162,231,0.28)` : h ? "0 6px 18px rgba(0,0,0,0.4)" : "none",
        }}>{app.icon}</div>
      {win && <div style={{ width:4, height:4, borderRadius:"50%",
        background: focused ? T.primary : T.textMute, transition:"background 0.2s" }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT: WEBOS DESKFLOW
// ─────────────────────────────────────────────────────────────────────────────
export default function WebOSDeskFlow() {
  const [windows, dispatch] = useReducer(wmReducer, []);
  const [theme, setThemeState] = useState(localStorage.getItem("os_theme")||"dark");
  const [startOpen, setStartOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [time, setTime] = useState(new Date());
  const [notifs, setNotifs] = useState(["WebOS DeskFlow v2.0 ready","IPC Bus online","Cortex AI connected"]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [shutdown, setShutdown] = useState(false);

  // Theme setter that also persists + IPC broadcasts
  const setTheme = (t) => { setThemeState(t); localStorage.setItem("os_theme",t); };

  // IPC Bus subscriber — window manager + theme
  useEffect(() => {
    const unsub = SystemBus.subscribe(event => {
      switch(event.type) {
        case "OPEN_APP":
          dispatch({ type:"OPEN", appId: event.payload.id });
          break;
        case "CLOSE_APP":
          dispatch({ type:"CLOSE", id: event.payload.id });
          break;
        case "FOCUS_APP":
          dispatch({ type:"FOCUS", id: event.payload.id });
          break;
        case "THEME_CHANGE":
          setTheme(event.payload.theme);
          setNotifs(n => [`Theme → ${event.payload.theme}`, ...n.slice(0,4)]);
          break;
        case "SHUTDOWN":
          setShutdown(true);
          break;
        case "FILE_OPEN":
          setNotifs(n => [`File opened: ${event.payload.filename}`, ...n.slice(0,4)]);
          break;
      }
    });
    return unsub;
  }, []);

  // Clock
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Keyboard
  useEffect(() => {
    const down = e => {
      if ((e.metaKey||e.ctrlKey) && e.key==="k") { e.preventDefault(); setCmdOpen(o=>!o); setCmdQuery(""); }
      if (e.key==="Escape") { setCmdOpen(false); setStartOpen(false); setNotifOpen(false); }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  const launch = (id) => {
    dispatch({ type:"OPEN", appId:id });
    setStartOpen(false);
    setCmdOpen(false);
  };

  const filteredApps = APP_REGISTRY.filter(a =>
    !cmdQuery || a.title.toLowerCase().includes(cmdQuery.toLowerCase()) || a.id.includes(cmdQuery.toLowerCase())
  );

  // Shutdown screen
  if (shutdown) return (
    <div style={{ width:"100vw", height:"100vh", background:"#000", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:16, fontFamily:T.font }}>
      <div style={{ fontSize:48 }}>⬛</div>
      <div style={{ fontSize:18, color:"rgba(255,255,255,0.6)", fontWeight:300 }}>WebOS DeskFlow shutting down...</div>
      <div style={{ fontSize:12, color:"rgba(255,255,255,0.2)" }}>It is safe to close this tab.</div>
      <button onClick={() => window.location.reload()}
        style={{ marginTop:20, padding:"8px 20px", border:"1px solid rgba(255,255,255,0.2)",
          borderRadius:8, background:"transparent", color:"rgba(255,255,255,0.5)",
          cursor:"pointer", fontFamily:T.font, fontSize:13 }}>Restart</button>
    </div>
  );

  return (
    <div style={{ width:"100vw", height:"100vh", overflow:"hidden",
      background: WALLPAPERS[theme] || WALLPAPERS.dark,
      position:"relative", fontFamily:T.font, userSelect:"none" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.14); border-radius:2px; }
        @keyframes osPulse { 0%,100%{opacity:0.35;transform:scale(0.75)} 50%{opacity:1;transform:scale(1.1)} }
        @keyframes osSpin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes osSlideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes osFadeIn  { from{opacity:0;transform:scale(0.97)translateY(6px)} to{opacity:1;transform:scale(1)translateY(0)} }
        @keyframes browserLoad { from{width:0} to{width:100%} }
        input[type=range] { accent-color: #0DA2E7; }
        button:hover { filter: brightness(1.1); }
      `}</style>

      {/* Desktop icons — left column */}
      <div style={{ position:"absolute", top:20, left:16, display:"grid",
        gridTemplateRows:"repeat(auto-fill,76px)", gap:4 }}>
        {APP_REGISTRY.map(app => (
          <DesktopIcon key={app.id} app={app} onOpen={() => launch(app.id)} />
        ))}
      </div>

      {/* Clock top-right */}
      <div style={{ position:"absolute", top:16, right:20, textAlign:"right", pointerEvents:"none" }}>
        <div style={{ fontSize:12.5, color:"rgba(255,255,255,0.45)", fontWeight:500 }}>
          {time.toLocaleDateString("en-IE",{weekday:"short",month:"short",day:"numeric"})}
        </div>
        <div style={{ fontSize:24, color:"rgba(255,255,255,0.82)", fontWeight:200, letterSpacing:0.5, fontFamily:T.mono }}>
          {time.toLocaleTimeString("en-IE",{hour:"2-digit",minute:"2-digit"})}
        </div>
      </div>

      {/* Windows */}
      {windows.map(win => (
        <OSWindow key={win.id} win={win} dispatch={dispatch}>
          {renderApp(win.id, windows, dispatch, theme, setTheme)}
        </OSWindow>
      ))}

      {/* START MENU */}
      {startOpen && (
        <div onClick={() => setStartOpen(false)}
          style={{ position:"fixed", inset:0, zIndex:9000 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ position:"absolute", bottom:60, left:"50%", transform:"translateX(-50%)",
              width:580, background:"rgba(7,12,28,0.94)", backdropFilter:"blur(36px) saturate(200%)",
              border:"1px solid rgba(255,255,255,0.11)", borderRadius:16,
              boxShadow:"0 40px 100px rgba(0,0,0,0.75)", padding:20,
              animation:"osSlideUp 0.22s ease-out" }}>
            <div style={{ fontSize:10.5, fontWeight:700, color:T.textMute, letterSpacing:1.2, marginBottom:14 }}>
              ALL APPLICATIONS
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {APP_REGISTRY.map(app => (
                <div key={app.id} onClick={() => launch(app.id)}
                  style={{ padding:"13px 6px", borderRadius:10, cursor:"pointer", textAlign:"center",
                    background:"rgba(255,255,255,0.045)", border:"1px solid rgba(255,255,255,0.075)",
                    transition:"all 0.14s", display:"flex", flexDirection:"column", gap:5, alignItems:"center" }}
                  onMouseEnter={e => { e.currentTarget.style.background="rgba(13,162,231,0.14)"; e.currentTarget.style.borderColor="rgba(13,162,231,0.32)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.045)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.075)"; }}>
                  <div style={{ fontSize:26 }}>{app.icon}</div>
                  <div style={{ fontSize:10.5, fontWeight:600, color:T.text, lineHeight:1.2 }}>{app.title}</div>
                  <div style={{ fontSize:9.5, color:T.textMute, lineHeight:1.2 }}>{app.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:14, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.07)",
              display:"flex", justifyContent:"space-between", fontSize:11, color:T.textMute }}>
              <span>⌘K — Command Palette</span>
              <span>IPC Bus: {_busListeners.length} listeners · {windows.length} processes</span>
            </div>
          </div>
        </div>
      )}

      {/* COMMAND PALETTE */}
      {cmdOpen && (
        <div onClick={() => setCmdOpen(false)}
          style={{ position:"fixed", inset:0, zIndex:10000, background:"rgba(0,0,0,0.55)",
            backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width:560, background:"rgba(6,10,22,0.97)", backdropFilter:"blur(36px)",
              border:"1px solid rgba(255,255,255,0.14)", borderRadius:14,
              boxShadow:"0 50px 120px rgba(0,0,0,0.85)", overflow:"hidden",
              animation:"osFadeIn 0.14s ease-out" }}>
            <div style={{ display:"flex", alignItems:"center", padding:"14px 16px", gap:10,
              borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize:16, color:T.primary }}>⌘</span>
              <input autoFocus value={cmdQuery} onChange={e => setCmdQuery(e.target.value)}
                placeholder="Launch app or ask Cortex..."
                style={{ flex:1, background:"transparent", border:"none", outline:"none",
                  color:T.text, fontSize:15, fontFamily:T.font }} />
              <kbd style={{ padding:"2px 6px", border:"1px solid rgba(255,255,255,0.13)",
                borderRadius:4, fontSize:10.5, color:T.textMute, fontFamily:T.mono }}>ESC</kbd>
            </div>
            <div style={{ padding:8, maxHeight:380, overflowY:"auto" }}>
              <div style={{ fontSize:9.5, fontWeight:700, color:T.textMute, letterSpacing:1.2,
                padding:"4px 10px", marginBottom:2 }}>APPLICATIONS</div>
              {filteredApps.map(app => (
                <div key={app.id} onClick={() => launch(app.id)}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px",
                    borderRadius:8, cursor:"pointer", transition:"background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(13,162,231,0.13)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <span style={{ fontSize:20 }}>{app.icon}</span>
                  <div>
                    <div style={{ color:T.text, fontSize:13.5, fontWeight:500 }}>{app.title}</div>
                    <div style={{ color:T.textMute, fontSize:11 }}>{app.desc}</div>
                  </div>
                  <span style={{ marginLeft:"auto", fontSize:10, color:T.textMute, fontFamily:T.mono }}>{app.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION CENTER */}
      {notifOpen && (
        <div style={{ position:"fixed", right:14, bottom:60, width:290, zIndex:8000,
          background:"rgba(7,12,28,0.94)", backdropFilter:"blur(28px)",
          border:"1px solid rgba(255,255,255,0.11)", borderRadius:13, padding:12,
          boxShadow:"0 24px 70px rgba(0,0,0,0.65)", animation:"osSlideUp 0.18s ease-out" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontSize:10.5, fontWeight:700, color:T.textMute, letterSpacing:1 }}>NOTIFICATIONS</span>
            <OSBtn onClick={() => setNotifs([])}>Clear</OSBtn>
          </div>
          {notifs.map((n,i) => (
            <div key={i} style={{ padding:"8px 10px", borderRadius:7,
              background:"rgba(13,162,231,0.08)", border:"1px solid rgba(13,162,231,0.18)",
              marginBottom:5, fontSize:12, color:T.text, display:"flex", justifyContent:"space-between" }}>
              <span>🔔 {n}</span>
              <span onClick={() => setNotifs(ns=>ns.filter((_,j)=>j!==i))}
                style={{ cursor:"pointer", color:T.textMute, fontSize:14 }}>×</span>
            </div>
          ))}
          {notifs.length===0 && <div style={{ fontSize:12, color:T.textMute, textAlign:"center", padding:12 }}>All clear</div>}
        </div>
      )}

      {/* TASKBAR */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, height:52,
        background:"rgba(5,9,20,0.9)", backdropFilter:"blur(28px) saturate(200%)",
        borderTop:"1px solid rgba(255,255,255,0.09)",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 14px", zIndex:8500 }}>

        {/* Start */}
        <button onClick={() => setStartOpen(o=>!o)}
          style={{ width:38, height:38, borderRadius:9, cursor:"pointer", fontSize:17,
            display:"flex", alignItems:"center", justifyContent:"center",
            background: startOpen ? "rgba(13,162,231,0.28)" : "rgba(255,255,255,0.065)",
            border:`1px solid ${startOpen ? "rgba(13,162,231,0.38)" : "rgba(255,255,255,0.1)"}`,
            color:T.text, transition:"all 0.15s",
            boxShadow: startOpen ? "0 0 18px rgba(13,162,231,0.3)" : "none" }}>
          ⬛
        </button>

        {/* Dock */}
        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          {APP_REGISTRY.map(app => (
            <DockIcon key={app.id} app={app}
              win={windows.find(w => w.id===app.id)}
              dispatch={dispatch} launch={launch} />
          ))}
        </div>

        {/* Right tray */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={() => setNotifOpen(o=>!o)}
            style={{ ...BS, fontSize:15, padding:"5px 8px", position:"relative" }}>
            🔔
            {notifs.length > 0 && (
              <span style={{ position:"absolute", top:1, right:1, width:7, height:7,
                borderRadius:"50%", background:T.accent }} />
            )}
          </button>
          <button onClick={() => launch("settings")}
            style={{ ...BS, fontSize:15, padding:"5px 8px" }}>⚙️</button>
          <div style={{ fontSize:12, color:T.textSub, fontFamily:T.mono,
            background:"rgba(255,255,255,0.04)", padding:"4px 8px", borderRadius:5,
            border:"1px solid rgba(255,255,255,0.07)" }}>
            {time.toLocaleTimeString("en-IE",{hour:"2-digit",minute:"2-digit"})}
          </div>
        </div>
      </div>
    </div>
  );
}
