import React, { useState, useEffect, useRef } from 'react';
import { Tldraw, useEditor, AssetRecordType, createShapeId, toRichText, getSnapshot, loadSnapshot, DefaultColorStyle, DefaultSizeStyle, DefaultDashStyle, DefaultFillStyle } from 'tldraw';
import 'tldraw/tldraw.css';
import './App.css';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Peer } from 'peerjs';
import html2canvas from 'html2canvas';

const myScriptConfig = {
  applicationKey: 'f6d5e18e-f44f-4335-a2b4-e3e9f733a746',
  hmacKey: '2facdb53-dc6d-4834-997e-bfc4dfed270f',
};

async function generateHMAC(applicationKey, hmacKey, stringifiedBody) {
  const userKey = applicationKey + hmacKey;
  const enc = new TextEncoder();
  const keyMaterial = enc.encode(userKey);
  const data = enc.encode(stringifiedBody);

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );

  const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, data);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Ultra-Fast Mobile Photo Picker Companion View (No Live Camera - HTTP & WebRTC Dual Transfer)
function MobilePhotoUploadView() {
  const params = new URLSearchParams(window.location.search);
  const sessionToken = params.get('session');
  const fileInputRef = useRef(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [photoSent, setPhotoSent] = useState(false);
  const connRef = useRef(null);
  const [peerStatus, setPeerStatus] = useState('🟢 Mobile Companion Ready!');

  useEffect(() => {
    if (!sessionToken) return;

    try {
      const peer = new Peer({ debug: 1 });

      peer.on('open', () => {
        const conn = peer.connect(sessionToken);
        connRef.current = conn;

        conn.on('open', () => {
          setPeerStatus("🟢 Connected to Whiteboard!");
        });
      });
    } catch (e) {
      console.warn("PeerJS init skipped, fallback to HTTP upload.");
    }
  }, [sessionToken]);

  const handleFileSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setSelectedPhotoUrl(evt.target.result);
    };
    reader.readAsDataURL(file);
  };

  const sendPhotoToBoard = async () => {
    if (!selectedPhotoUrl) return;
    setIsSending(true);

    let sentSuccess = false;

    // 1. WebRTC PeerJS Transfer
    if (connRef.current && connRef.current.open) {
      try {
        connRef.current.send({ type: 'snapshot', dataUrl: selectedPhotoUrl });
        sentSuccess = true;
      } catch (e) { }
    }

    // 2. Local HTTP Fast API Transfer (Guaranteed 100% delivery over Wi-Fi!)
    try {
      const resp = await fetch('/api/mobile-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: sessionToken, dataUrl: selectedPhotoUrl })
      });
      if (resp.ok) {
        sentSuccess = true;
      }
    } catch (err) {
      console.error("HTTP Upload error:", err);
    }

    setIsSending(false);

    if (sentSuccess) {
      setPhotoSent(true);
      setSelectedPhotoUrl(null);
      setSelectedFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setPhotoSent(false), 3000);
    } else {
      alert("⚠️ Could not send photo to whiteboard. Please make sure your phone is connected to the same Wi-Fi!");
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(circle at top, #1e293b 0%, #0f172a 100%)',
      color: 'white', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      zIndex: 10000, overflowY: 'auto'
    }}>
      <div style={{ background: 'rgba(30, 41, 59, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>

        <div style={{ fontSize: '40px', marginBottom: '6px' }}>📱</div>
        <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '900', color: '#38bdf8' }}>
          ViewBoard Mobile Share
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#94a3b8' }}>
          Select any photo from your phone to instantly display it on the whiteboard!
        </p>

        <div style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', color: '#4ade80', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: '700', display: 'inline-block', marginBottom: '20px' }}>
          {peerStatus}
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Photo Selection Area */}
        {selectedPhotoUrl ? (
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <img
              src={selectedPhotoUrl}
              alt="Selected"
              style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: '16px', border: '2px solid #38bdf8', background: '#000', padding: '4px' }}
            />
            <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              📷 {selectedFileName}
            </div>
            <button
              onClick={() => { setSelectedPhotoUrl(null); setSelectedFileName(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(15, 23, 42, 0.85)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '50%', width: '28px', height: '28px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{
              padding: '36px 20px', borderRadius: '20px', border: '2px dashed rgba(56, 189, 248, 0.5)',
              background: 'rgba(15, 23, 42, 0.5)', cursor: 'pointer', marginBottom: '20px',
              transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🖼️</div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#38bdf8' }}>Choose Photo from Phone</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Tap to select from Photo Gallery or Camera Roll</div>
          </div>
        )}

        {photoSent && (
          <div style={{ padding: '12px', background: '#10b981', color: 'white', borderRadius: '14px', fontSize: '14px', fontWeight: '800', marginBottom: '16px', boxShadow: '0 10px 25px rgba(16,185,129,0.4)' }}>
            ✅ Photo Sent to Whiteboard Canvas!
          </div>
        )}

        {/* Action Button */}
        {selectedPhotoUrl ? (
          <button
            onClick={sendPhotoToBoard}
            disabled={isSending}
            style={{
              width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white', fontSize: '16px', fontWeight: '900', cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(16,185,129,0.4)', transition: 'all 0.2s'
            }}
          >
            {isSending ? 'Sending...' : '📤 Send Photo to Whiteboard Canvas'}
          </button>
        ) : (
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{
              width: '100%', padding: '14px', borderRadius: '16px', border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: 'white', fontSize: '15px', fontWeight: '800', cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(59,130,246,0.35)'
            }}
          >
            📁 Select Photo to Send
          </button>
        )}
      </div>
    </div>
  );
}

// SVG Analog Clock Component
function AnalogClockView({ date, size = 180, isGlow = true }) {
  const seconds = date.getSeconds();
  const minutes = date.getMinutes();
  const hours = date.getHours() % 12;

  const secondDeg = seconds * 6;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours * 30 + minutes * 0.5;

  const center = size / 2;
  const radius = center - 12;

  return (
    <svg width={size} height={size} style={{ filter: isGlow ? 'drop-shadow(0 0 16px rgba(99, 102, 241, 0.4))' : 'none' }}>
      <circle cx={center} cy={center} r={radius} fill="url(#clockBg)" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="3" />
      <defs>
        <radialGradient id="clockBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
      </defs>

      {/* Hour markers */}
      {[...Array(12)].map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const r1 = radius - 8;
        const r2 = radius - 18;
        return (
          <line
            key={i}
            x1={center + r1 * Math.cos(angle)}
            y1={center + r1 * Math.sin(angle)}
            x2={center + r2 * Math.cos(angle)}
            y2={center + r2 * Math.sin(angle)}
            stroke={i % 3 === 0 ? '#38bdf8' : 'rgba(255,255,255,0.4)'}
            strokeWidth={i % 3 === 0 ? '3' : '1.5'}
          />
        );
      })}

      {/* Hour hand */}
      <line
        x1={center} y1={center}
        x2={center + (radius * 0.45) * Math.sin(hourDeg * Math.PI / 180)}
        y2={center - (radius * 0.45) * Math.cos(hourDeg * Math.PI / 180)}
        stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round"
      />

      {/* Minute hand */}
      <line
        x1={center} y1={center}
        x2={center + (radius * 0.68) * Math.sin(minuteDeg * Math.PI / 180)}
        y2={center - (radius * 0.68) * Math.cos(minuteDeg * Math.PI / 180)}
        stroke="#818cf8" strokeWidth="3" strokeLinecap="round"
      />

      {/* Second hand */}
      <line
        x1={center} y1={center}
        x2={center + (radius * 0.82) * Math.sin(secondDeg * Math.PI / 180)}
        y2={center - (radius * 0.82) * Math.cos(secondDeg * Math.PI / 180)}
        stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"
      />

      {/* Center cap */}
      <circle cx={center} cy={center} r="5" fill="#ef4444" />
    </svg>
  );
}

const LiveClockBadge = React.memo(function LiveClockBadge({ onClick }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatHHMM = (date) => {
    let h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, '0');
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${m}`;
  };

  return (
    <button
      onClick={onClick}
      style={{
        height: '32px', padding: '0 12px',
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)',
        borderRadius: '9999px', fontSize: '11.5px', fontWeight: '800',
        display: 'flex', alignItems: 'center', gap: '6px',
        cursor: 'pointer', whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)',
        transition: 'all 0.15s ease', flexShrink: 0
      }}
      title="Click for Exam Timer & Fullscreen Clock"
    >
      <span style={{ fontSize: '13px' }}>🕒</span>
      <span>{formatHHMM(time)}</span>
    </button>
  );
});

function ConversionToolbar() {
  const editor = useEditor();
  const [selectedSize, setSelectedSize] = useState('normal');
  const [selectedFont, setSelectedFont] = useState('sans');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notesPreview, setNotesPreview] = useState([]);
  const [notebookLinesOn, setNotebookLinesOn] = useState(false);
  const [boardColor, setBoardColor] = useState('default');
  const [boardColorDropdownOpen, setBoardColorDropdownOpen] = useState(false);

  // Active TLDraw Drawing Tool State
  const [activeTool, setActiveTool] = useState('select');

  useEffect(() => {
    if (!editor) return;
    const updateActiveTool = () => {
      try {
        const toolId = editor.currentTool?.id;
        if (toolId) {
          setActiveTool(prev => (prev === toolId ? prev : toolId));
        }
      } catch (e) { }
    };
    updateActiveTool();
    const unlisten = editor.store.listen(updateActiveTool);
    return () => {
      try { unlisten(); } catch (e) { }
    };
  }, [editor]);

  const selectDrawingTool = (toolId) => {
    if (toolId !== 'eraser') {
      setEraserMode('complete');
    }
    if (!editor) return;
    try {
      editor.setCurrentTool(toolId);
    } catch (e) {
      console.error("Set tool error:", e);
    }
  };

  // Integrated Style Panel (Picture 1) States & Handlers
  const [stylePanelOpen, setStylePanelOpen] = useState(false);
  const [stylePanelPos, setStylePanelPos] = useState({ top: 60, left: 16, right: 'auto' });
  const [activePenColor, setActivePenColor] = useState('black');
  const [activePenSize, setActivePenSize] = useState('m');
  const [strokeSliderValue, setStrokeSliderValue] = useState(38);
  const [activePenDash, setActivePenDash] = useState('draw');
  const [activePenFill, setActivePenFill] = useState('none');
  const styleBtnRef = useRef(null);
  const stylePanelRef = useRef(null);

  // Integrated Eraser Popover Menu States & Handlers
  const [eraserMenuOpen, setEraserMenuOpen] = useState(false);
  const [eraserMenuPos, setEraserMenuPos] = useState({ top: 60, left: 16 });
  const [eraserMode, setEraserMode] = useState('complete');
  const eraserBtnRef = useRef(null);
  const eraserMenuRef = useRef(null);

  const getBoardBgHex = (boardColorId) => {
    const bgMap = {
      default: 'black',
      black: 'white',
      blue: 'white',
      orange: 'white',
      purple: 'white',
      green: 'white',
      grey: 'white',
      yellow: 'black',
      pink: 'white'
    };
    return bgMap[boardColorId] || 'black';
  };

  const handleSelectCompleteEraser = () => {
    setEraserMode('complete');
    setEraserMenuOpen(false);
    if (!editor) return;
    try {
      editor.setCurrentTool('eraser');
    } catch (e) { }
  };

  const handleSelectSelectiveEraser = () => {
    setEraserMode('selective');
    setEraserMenuOpen(false);
    if (!editor) return;
    try {
      editor.setCurrentTool('draw');
      const eraserColor = getBoardBgHex(boardColor);
      editor.setStyleForNextShapes(DefaultColorStyle, eraserColor);
      editor.setStyleForNextShapes(DefaultSizeStyle, 's');
    } catch (e) { }
  };

  const handleToggleEraserMenu = () => {
    if (!eraserMenuOpen && eraserBtnRef.current) {
      const rect = eraserBtnRef.current.getBoundingClientRect();
      setEraserMenuPos({ top: Math.round(rect.bottom + 12), left: Math.max(16, Math.min(rect.left - 40, window.innerWidth - 270)) });
    }
    setEraserMenuOpen(!eraserMenuOpen);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (eraserMenuRef.current && !eraserMenuRef.current.contains(event.target) &&
        eraserBtnRef.current && !eraserBtnRef.current.contains(event.target)) {
        setEraserMenuOpen(false);
      }
    }
    if (eraserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [eraserMenuOpen]);

  const tldrawColors = [
    { id: 'black', hex: '#1e293b' },
    { id: 'grey', hex: '#94a3b8' },
    { id: 'light-violet', hex: '#c084fc' },
    { id: 'violet', hex: '#a855f7' },
    { id: 'blue', hex: '#3b82f6' },
    { id: 'light-blue', hex: '#38bdf8' },
    { id: 'yellow', hex: '#eab308' },
    { id: 'orange', hex: '#f97316' },
    { id: 'green', hex: '#22c55e' },
    { id: 'light-green', hex: '#4ade80' },
    { id: 'light-red', hex: '#f87171' },
    { id: 'red', hex: '#ef4444' }
  ];

  const tldrawSizes = [
    { id: 's', label: 'S' },
    { id: 'm', label: 'M' },
    { id: 'l', label: 'L' },
    { id: 'xl', label: 'XL' }
  ];

  const tldrawDashes = [
    { id: 'draw', label: 'Draw' },
    { id: 'solid', label: 'Solid' },
    { id: 'dashed', label: 'Dash' },
    { id: 'dotted', label: 'Dot' }
  ];

  const tldrawFills = [
    { id: 'none', label: 'None' },
    { id: 'semi', label: 'Semi' },
    { id: 'solid', label: 'Solid' },
    { id: 'pattern', label: 'Pat' }
  ];

  const handleSetPenColor = (colorId) => {
    setActivePenColor(colorId);
    if (!editor) return;
    try {
      editor.setStyleForNextShapes(DefaultColorStyle, colorId);
      if (editor.getSelectedShapes().length > 0) {
        editor.setStyleForSelectedShapes(DefaultColorStyle, colorId);
      }
    } catch (e) { }
  };

  const handleSetPenSize = (sizeId) => {
    setActivePenSize(sizeId);
    const sliderVal = sizeId === 's' ? 15 : sizeId === 'm' ? 38 : sizeId === 'l' ? 63 : 88;
    setStrokeSliderValue(sliderVal);
    if (!editor) return;
    try {
      editor.setStyleForNextShapes(DefaultSizeStyle, sizeId);
      if (editor.getSelectedShapes().length > 0) {
        editor.setStyleForSelectedShapes(DefaultSizeStyle, sizeId);
      }
    } catch (e) { }
  };

  const handleStrokeSliderChange = (val) => {
    setStrokeSliderValue(val);
    let sizeId = 'm';
    if (val <= 25) sizeId = 's';
    else if (val <= 50) sizeId = 'm';
    else if (val <= 75) sizeId = 'l';
    else sizeId = 'xl';

    if (sizeId !== activePenSize) {
      setActivePenSize(sizeId);
    }
    if (!editor) return;
    try {
      editor.setStyleForNextShapes(DefaultSizeStyle, sizeId);
      if (editor.getSelectedShapes().length > 0) {
        editor.setStyleForSelectedShapes(DefaultSizeStyle, sizeId);
      }
    } catch (e) { }
  };

  const handleSetPenDash = (dashId) => {
    setActivePenDash(dashId);
    if (!editor) return;
    try {
      editor.setStyleForNextShapes(DefaultDashStyle, dashId);
      if (editor.getSelectedShapes().length > 0) {
        editor.setStyleForSelectedShapes(DefaultDashStyle, dashId);
      }
    } catch (e) { }
  };

  const handleSetPenFill = (fillId) => {
    setActivePenFill(fillId);
    if (!editor) return;
    try {
      editor.setStyleForNextShapes(DefaultFillStyle, fillId);
      if (editor.getSelectedShapes().length > 0) {
        editor.setStyleForSelectedShapes(DefaultFillStyle, fillId);
      }
    } catch (e) { }
  };

  const handleToggleStylePanel = () => {
    if (!stylePanelOpen && styleBtnRef.current) {
      const rect = styleBtnRef.current.getBoundingClientRect();
      setStylePanelPos({ top: Math.round(rect.bottom + 12), left: Math.max(16, Math.min(rect.left - 60, window.innerWidth - 240)), right: 'auto' });
    }
    setStylePanelOpen(!stylePanelOpen);
  };

  // Close Style panel on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (stylePanelRef.current && !stylePanelRef.current.contains(event.target) &&
        styleBtnRef.current && !styleBtnRef.current.contains(event.target)) {
        setStylePanelOpen(false);
      }
    }
    if (stylePanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [stylePanelOpen]);

  // 3-Stage Clock Widget States
  const [clockStage, setClockStage] = useState('badge');
  const [clockMode, setClockMode] = useState('digital');
  const [examStartTime, setExamStartTime] = useState('09:00');
  const [examEndTime, setExamEndTime] = useState('12:00');
  const [now, setNow] = useState(new Date());

  const handleEnterFullscreenClock = () => {
    setClockStage('fullscreen');
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => { });
      }
    } catch (e) { }
  };

  const handleExitFullscreenClock = () => {
    setClockStage('exam_panel');
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
      }
    } catch (e) { }
  };

  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        setClockStage(prev => (prev === 'fullscreen' ? 'exam_panel' : prev));
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const boardColorOptions = [
    { id: 'default', name: 'White', bg: '#ffffff' },
    { id: 'black', name: 'Black', bg: '#0f172a' },
    { id: 'blue', name: 'Blue', bg: '#1e3a8a' },
    { id: 'orange', name: 'Orange', bg: '#9a3412' },
    { id: 'purple', name: 'Purple', bg: '#581c87' },
    { id: 'green', name: 'Green', bg: '#14532d' },
    { id: 'grey', name: 'Grey', bg: '#334155' },
    { id: 'yellow', name: 'Yellow', bg: '#a16207' },
    { id: 'pink', name: 'Pink', bg: '#9d174d' },
  ];

  // User Authentication & Local Saved Boards
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('viewboard_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [savedBoards, setSavedBoards] = useState(() => {
    try {
      const saved = localStorage.getItem('viewboard_saved_boards');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [activeBoardId, setActiveBoardId] = useState(null);
  const [activeBoardTitle, setActiveBoardTitle] = useState('Untitled Board');

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [saveBoardModalOpen, setSaveBoardModalOpen] = useState(false);
  const [boardTitleInput, setBoardTitleInput] = useState('');
  const [savedBoardsModalOpen, setSavedBoardsModalOpen] = useState(false);
  const [saveNotification, setSaveNotification] = useState('');
  const [searchBoardQuery, setSearchBoardQuery] = useState('');

  // Mobile Companion 5-Minute Session States
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [mobileLink, setMobileLink] = useState('');
  const [customHost, setCustomHost] = useState('');
  const [currentSessionToken, setCurrentSessionToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [mobileSessionActive, setMobileSessionActive] = useState(false);
  const [mobileTimeLeft, setMobileTimeLeft] = useState(300); // 5 minutes (300s)

  const peerRef = useRef(null);
  const isConvertingRef = useRef(false);
  const accountDropdownRef = useRef(null);
  const accountBtnRef = useRef(null);
  const takeawayBtnRef = useRef(null);
  const colorDropdownRef = useRef(null);
  const colorBtnRef = useRef(null);

  const [accountMenuPos, setAccountMenuPos] = useState({ top: 60, right: 16 });
  const [takeawayMenuPos, setTakeawayMenuPos] = useState({ top: 60, left: 16 });
  const [colorMenuPos, setColorMenuPos] = useState({ top: 60, left: 16 });

  // Draggable Time Badge & Exam Timer States
  const [timePos, setTimePos] = useState({ x: window.innerWidth - 170, y: 16 });
  const [isDraggingTime, setIsDraggingTime] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const elementStartPos = useRef({ x: 0, y: 0 });
  const dragDistanceRef = useRef(0);

  const [examActive, setExamActive] = useState(false);
  const [isTimeExpanded, setIsTimeExpanded] = useState(false);

  const formatDuration = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const calculateExamProgress = () => {
    if (!examActive || !examStartTime || !examEndTime) {
      return { active: false, progressPct: 0, color: '#22c55e', remainingText: '', status: 'no_exam' };
    }

    const today = new Date();
    const [startH, startM] = examStartTime.split(':').map(Number);
    const [endH, endM] = examEndTime.split(':').map(Number);

    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startH, startM, 0);
    let endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endH, endM, 0);

    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }

    const nowMs = today.getTime();
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    if (nowMs < startMs) {
      const waitSec = Math.round((startMs - nowMs) / 1000);
      return { active: true, progressPct: 0, color: '#22c55e', remainingText: `Starts in ${formatDuration(waitSec)}`, status: 'upcoming' };
    }

    if (nowMs >= endMs) {
      return { active: true, progressPct: 100, color: '#ef4444', remainingText: 'Exam Completed!', status: 'completed' };
    }

    const totalDuration = endMs - startMs;
    const elapsed = nowMs - startMs;
    const pct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    const remainingSec = Math.round((endMs - nowMs) / 1000);

    let barColor = '#22c55e'; // Green
    if (pct >= 85) {
      barColor = '#ef4444'; // Red
    } else if (pct >= 60) {
      barColor = '#f97316'; // Orange
    } else if (pct >= 30) {
      barColor = '#eab308'; // Yellow
    }

    return {
      active: true,
      progressPct: pct,
      color: barColor,
      remainingText: `${formatDuration(remainingSec)} remaining`,
      status: 'in_progress'
    };
  };

  const handleApplyExamSchedule = () => {
    if (!examStartTime || !examEndTime) {
      showNotification("Please select both Exam Start and Ending times.");
      return;
    }
    setExamActive(true);
    showNotification("✅ Exam schedule updated!");
  };

  const handleTimeMouseDown = (e) => {
    setIsDraggingTime(true);
    dragDistanceRef.current = 0;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartPos.current = { x: clientX, y: clientY };
    elementStartPos.current = { ...timePos };
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDraggingTime) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - dragStartPos.current.x;
      const deltaY = clientY - dragStartPos.current.y;

      dragDistanceRef.current = Math.hypot(deltaX, deltaY);

      const newX = Math.max(10, Math.min(window.innerWidth - 140, elementStartPos.current.x + deltaX));
      const newY = Math.max(10, Math.min(window.innerHeight - 50, elementStartPos.current.y + deltaY));
      setTimePos({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setIsDraggingTime(false);
      if (dragDistanceRef.current < 6) {
        setClockStage('exam_panel');
      }
    };

    if (isDraggingTime) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove);
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDraggingTime]);

  const handleToggleUserDropdown = () => {
    if (!userDropdownOpen && accountBtnRef.current) {
      const rect = accountBtnRef.current.getBoundingClientRect();
      setAccountMenuPos({ top: Math.round(rect.bottom + 8), right: Math.max(12, Math.round(window.innerWidth - rect.right)) });
    }
    setUserDropdownOpen(!userDropdownOpen);
  };

  const handleToggleTakeawayDropdown = () => {
    if (!dropdownOpen) {
      refreshNotesFromBoard();
      if (takeawayBtnRef.current) {
        const rect = takeawayBtnRef.current.getBoundingClientRect();
        setTakeawayMenuPos({ top: Math.round(rect.bottom + 8), left: Math.round(rect.left) });
      }
    }
    setDropdownOpen(!dropdownOpen);
  };

  const handleToggleColorDropdown = () => {
    if (!boardColorDropdownOpen && colorBtnRef.current) {
      const rect = colorBtnRef.current.getBoundingClientRect();
      setColorMenuPos({ top: Math.round(rect.bottom + 8), left: Math.round(rect.left) });
    }
    setBoardColorDropdownOpen(!boardColorDropdownOpen);
  };

  // Close Account dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target) &&
        accountBtnRef.current && !accountBtnRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen]);

  // Close Color dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(event.target) &&
        colorBtnRef.current && !colorBtnRef.current.contains(event.target)) {
        setBoardColorDropdownOpen(false);
      }
    }
    if (boardColorDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [boardColorDropdownOpen]);

  // Clock Ticker
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // 5-Minute Mobile Session Countdown Ticker
  useEffect(() => {
    if (!mobileSessionActive || mobileTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setMobileTimeLeft(prev => {
        if (prev <= 1) {
          setMobileSessionActive(false);
          setIsConnected(false);
          setMobileModalOpen(false);
          showNotification("⏰ Mobile 5-minute session expired.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mobileSessionActive, mobileTimeLeft]);

  const formatMMSS = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const showNotification = (msg) => {
    setSaveNotification(msg);
    setTimeout(() => setSaveNotification(''), 3500);
  };

  const addPhotoToCanvas = (dataUrl) => {
    if (!editor || !dataUrl) return;
    try {
      const img = new window.Image();
      img.onload = () => {
        const naturalW = img.naturalWidth || 600;
        const naturalH = img.naturalHeight || 450;
        const aspect = naturalW / naturalH;

        // Calculate crisp display dimensions preserving original full aspect ratio
        let displayW = 480;
        let displayH = Math.round(480 / aspect);

        if (aspect < 0.8) {
          // Vertical portrait mobile photo
          displayH = 520;
          displayW = Math.round(520 * aspect);
        }

        const assetId = AssetRecordType.createId();
        const newShapeId = createShapeId();

        const centerX = Math.max(50, (window.innerWidth / 2) - (displayW / 2));
        const centerY = Math.max(50, (window.innerHeight / 2) - (displayH / 2));

        editor.store.put([{
          id: assetId, typeName: 'asset', type: 'image', meta: {},
          props: { w: displayW, h: displayH, name: 'Mobile Photo', isAnimated: false, mimeType: 'image/jpeg', src: dataUrl }
        }]);

        editor.createShape({
          id: newShapeId,
          type: 'image', x: centerX, y: centerY,
          isLocked: false,
          props: { assetId: assetId, w: displayW, h: displayH }
        });

        try {
          editor.bringToFront([newShapeId]);
          editor.setSelectedShapes([newShapeId]);
        } catch (e) { }

        showNotification("📸 Full Photo added to Whiteboard Canvas!");
      };
      img.src = dataUrl;
    } catch (err) {
      console.error("Add photo error:", err);
    }
  };

  // Poll Local HTTP API + Listen to BroadcastChannel & LocalStorage continuously for 5 minutes
  useEffect(() => {
    if (!currentSessionToken || !mobileSessionActive || mobileTimeLeft <= 0) return;

    let bc;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel('vb_channel_' + currentSessionToken);
        bc.onmessage = (event) => {
          if (event.data && event.data.type === 'snapshot' && event.data.dataUrl) {
            setIsConnected(true);
            addPhotoToCanvas(event.data.dataUrl);
          }
        };
      }
    } catch (e) {}

    const handleStorageChange = (e) => {
      if (e.key === 'vb_photo_' + currentSessionToken && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.dataUrl) {
            setIsConnected(true);
            addPhotoToCanvas(parsed.dataUrl);
            localStorage.removeItem('vb_photo_' + currentSessionToken);
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const pollInterval = setInterval(async () => {
      try {
        const resp = await fetch(`/api/mobile-poll?session=${currentSessionToken}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.photos && data.photos.length > 0) {
            setIsConnected(true);
            data.photos.forEach(photoDataUrl => {
              addPhotoToCanvas(photoDataUrl);
            });
          }
        }
      } catch (e) { }
    }, 150);

    return () => {
      if (bc) try { bc.close(); } catch (e) {}
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [currentSessionToken, mobileSessionActive, mobileTimeLeft, editor]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('viewboard_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('viewboard_user');
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('viewboard_saved_boards', JSON.stringify(savedBoards));
    } catch (e) {
      console.error("Local storage save error:", e);
    }
  }, [savedBoards]);

  useEffect(() => {
    const container = document.querySelector('.tl-container') || document.body;
    boardColorOptions.forEach(opt => container.classList.remove(`board-bg-${opt.id}`));
    container.classList.add(`board-bg-${boardColor}`);
  }, [boardColor]);

  useEffect(() => {
    const container = document.querySelector('.tl-container') || document.body;
    if (notebookLinesOn) {
      container.classList.add('notebook-lines-active');
    } else {
      container.classList.remove('notebook-lines-active');
    }
    return () => {
      container.classList.remove('notebook-lines-active');
    };
  }, [notebookLinesOn]);

  // Helper: Extract actual high-resolution ink stroke points & bounds from tldraw draw shapes
  const extractStrokesFromShapes = (shapesToExtract) => {
    if (!editor || !shapesToExtract || shapesToExtract.length === 0) {
      return { strokes: [], minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, drawnWidth: 0, drawnHeight: 0 };
    }

    // Sort shapes spatially (top-to-bottom, left-to-right) so handwriting stroke sequence is in reading order
    const sortedShapes = [...shapesToExtract].sort((a, b) => {
      const boundsA = editor.getShapePageBounds(a);
      const boundsB = editor.getShapePageBounds(b);
      const topA = boundsA ? boundsA.y : a.y;
      const topB = boundsB ? boundsB.y : b.y;
      if (Math.abs(topA - topB) > 35) return topA - topB;
      const leftA = boundsA ? boundsA.x : a.x;
      const leftB = boundsB ? boundsB.y : b.y;
      return leftA - leftB;
    });

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const rawStrokes = [];

    sortedShapes.forEach(shape => {
      const bounds = editor.getShapePageBounds(shape);
      const pageX = shape.x || 0;
      const pageY = shape.y || 0;

      if (bounds) {
        if (bounds.x < minX) minX = bounds.x;
        if (bounds.y < minY) minY = bounds.y;
        if (bounds.x + bounds.w > maxX) maxX = bounds.x + bounds.w;
        if (bounds.y + bounds.h > maxY) maxY = bounds.y + bounds.h;
      }

      // Check tldraw stroke segments (shape.props.segments)
      const segments = shape.props?.segments;
      if (Array.isArray(segments) && segments.length > 0) {
        segments.forEach(seg => {
          if (Array.isArray(seg.points) && seg.points.length > 0) {
            const xArr = [];
            const yArr = [];
            seg.points.forEach(pt => {
              const absX = Math.round(pageX + pt.x);
              const absY = Math.round(pageY + pt.y);
              if (absX < minX) minX = absX;
              if (absY < minY) minY = absY;
              if (absX > maxX) maxX = absX;
              if (absY > maxY) maxY = absY;
              xArr.push(absX);
              yArr.push(absY);
            });
            if (xArr.length > 0) {
              rawStrokes.push({ x: xArr, y: yArr });
            }
          }
        });
      } else if (Array.isArray(shape.props?.points) && shape.props.points.length > 0) {
        const xArr = [];
        const yArr = [];
        shape.props.points.forEach(pt => {
          const absX = Math.round(pageX + pt.x);
          const absY = Math.round(pageY + pt.y);
          if (absX < minX) minX = absX;
          if (absY < minY) minY = absY;
          if (absX > maxX) maxX = absX;
          if (absY > maxY) maxY = absY;
          xArr.push(absX);
          yArr.push(absY);
        });
        if (xArr.length > 0) {
          rawStrokes.push({ x: xArr, y: yArr });
        }
      } else {
        // Fallback to shape geometry vertices
        try {
          const geometry = editor.getShapeGeometry(shape);
          if (geometry) {
            const pts = geometry.vertices || geometry.points;
            if (Array.isArray(pts) && pts.length > 0) {
              const xArr = [];
              const yArr = [];
              pts.forEach(pt => {
                const absX = Math.round(pageX + pt.x);
                const absY = Math.round(pageY + pt.y);
                if (absX < minX) minX = absX;
                if (absY < minY) minY = absY;
                if (absX > maxX) maxX = absX;
                if (absY > maxY) maxY = absY;
                xArr.push(absX);
                yArr.push(absY);
              });
              if (xArr.length > 0) rawStrokes.push({ x: xArr, y: yArr });
            }
          }
        } catch (e) { }
      }
    });

    if (minX === Infinity) minX = 0;
    if (minY === Infinity) minY = 0;
    if (maxX === -Infinity) maxX = minX + 100;
    if (maxY === -Infinity) maxY = minY + 50;

    const drawnWidth = Math.max(30, maxX - minX);
    const drawnHeight = Math.max(20, maxY - minY);

    // Normalize stroke coordinates to padded bounding box starting at (30, 30)
    const normalizedStrokes = rawStrokes.map(st => ({
      x: st.x.map(px => Math.round(px - minX + 30)),
      y: st.y.map(py => Math.round(py - minY + 30))
    }));

    const normWidth = Math.ceil(drawnWidth + 60);
    const normHeight = Math.ceil(drawnHeight + 60);

    return {
      strokes: normalizedStrokes,
      rawStrokes,
      minX,
      minY,
      maxX,
      maxY,
      drawnWidth,
      drawnHeight,
      width: normWidth,
      height: normHeight
    };
  };

  const cleanLatexFormula = (rawText) => {
    if (!rawText) return "";
    let str = rawText.trim();
    if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
      str = str.slice(1, -1).trim();
    }
    if (str.startsWith('\\[') && str.endsWith('\\]')) {
      str = str.slice(2, -2).trim();
    } else if (str.startsWith('\\(') && str.endsWith('\\)')) {
      str = str.slice(2, -2).trim();
    } else if (str.startsWith('$$') && str.endsWith('$$')) {
      str = str.slice(2, -2).trim();
    }
    return str;
  };

  const createFallbackMathSvg = (latexStr, w, h) => {
    const escaped = latexStr
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const svgWidth = Math.max(120, Math.round(w));
    const svgHeight = Math.max(40, Math.round(h));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
      <rect width="100%" height="100%" fill="none"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#0f172a" font-family="Cambria Math, STIX Two Math, KaTeX_Math, Times New Roman, serif" font-size="${Math.max(16, Math.min(32, Math.round(svgHeight * 0.5)))}px" font-weight="600">${escaped}</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };

  // Perform Handwriting -> Math Equation Conversion
  const convertSelectedStrokesToMath = async () => {
    if (!editor || isConvertingRef.current) return;
    const selectedShapes = editor.getSelectedShapes().filter(s => s.type === 'draw');
    const shapesToConvert = selectedShapes.length > 0 ? selectedShapes : editor.getCurrentPageShapes().filter(s => s.type === 'draw');

    if (shapesToConvert.length === 0) {
      showNotification('✏️ Draw a math formula first!');
      return;
    }

    isConvertingRef.current = true;
    showNotification('✍️ Identifying handwriting & math equation...');

    try {
      const extracted = extractStrokesFromShapes(shapesToConvert);
      const { strokes, minX, minY, drawnWidth, drawnHeight, width, height } = extracted;

      if (strokes.length === 0) {
        isConvertingRef.current = false;
        showNotification('⚠️ Could not extract stroke points.');
        return;
      }

      const payload = {
        width: width,
        height: height,
        contentType: "Math",
        strokeGroups: [{ strokes: strokes }]
      };

      const stringifiedBody = JSON.stringify(payload);
      const hmacSignature = await generateHMAC(myScriptConfig.applicationKey, myScriptConfig.hmacKey, stringifiedBody);

      const response = await fetch("/myscript-api/api/v4.0/iink/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "applicationKey": myScriptConfig.applicationKey,
          "hmac": hmacSignature,
          "Accept": "application/x-latex"
        },
        body: stringifiedBody
      });

      if (response.ok) {
        const rawLatex = await response.text();
        const latexStr = cleanLatexFormula(rawLatex);

        if (latexStr) {
          editor.deleteShapes(shapesToConvert.map(s => s.id));

          const imageUrl = "https://latex.codecogs.com/svg.image?" + encodeURIComponent(latexStr);

          const renderImageOnCanvas = (srcUrl) => {
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const aspect = (img.naturalWidth && img.naturalHeight) ? (img.naturalWidth / img.naturalHeight) : (drawnWidth / drawnHeight);

              let scaleMult = 1.0;
              if (selectedSize === 'small') scaleMult = 0.8;
              if (selectedSize === 'normal' || selectedSize === 'auto') scaleMult = 1.0;
              if (selectedSize === 'large') scaleMult = 1.25;
              if (selectedSize === 'xlarge') scaleMult = 1.6;

              let targetHeight = drawnHeight * scaleMult;
              let displayHeight = Math.max(22, Math.round(targetHeight));
              let displayWidth = Math.max(30, Math.round(displayHeight * aspect));

              const targetWidth = drawnWidth * scaleMult;
              if (displayWidth > targetWidth * 1.35) {
                displayWidth = Math.max(30, Math.round(targetWidth));
                displayHeight = Math.max(22, Math.round(displayWidth / aspect));
              }

              const posX = minX + Math.max(0, (drawnWidth - displayWidth) / 2);
              const posY = minY + Math.max(0, (drawnHeight - displayHeight) / 2);

              const assetId = AssetRecordType.createId();
              const newShapeId = createShapeId();

              editor.store.put([{
                id: assetId, typeName: 'asset', type: 'image', meta: {},
                props: { w: displayWidth, h: displayHeight, name: latexStr, isAnimated: false, mimeType: 'image/svg+xml', src: srcUrl }
              }]);

              editor.createShape({
                id: newShapeId,
                type: 'image', x: posX, y: posY,
                meta: { isEquation: true, latex: latexStr },
                props: { assetId: assetId, w: displayWidth, h: displayHeight }
              });

              setNotesPreview(prev => [...prev, { type: 'math', content: latexStr }]);
              showNotification(`✨ Math Recognized: ${latexStr}`);
              isConvertingRef.current = false;
            };

            img.onerror = () => {
              // If CodeCogs fails, fallback to local SVG math renderer
              if (srcUrl !== createFallbackMathSvg(latexStr, drawnWidth, drawnHeight)) {
                renderImageOnCanvas(createFallbackMathSvg(latexStr, drawnWidth, drawnHeight));
              } else {
                showNotification('⚠️ Image render error.');
                isConvertingRef.current = false;
              }
            };
            img.src = srcUrl;
          };

          renderImageOnCanvas(imageUrl);
        } else {
          showNotification('⚠️ No math recognized.');
          isConvertingRef.current = false;
        }
      } else {
        showNotification('⚠️ Math conversion API error.');
        isConvertingRef.current = false;
      }
    } catch (err) {
      console.error("Math convert error:", err);
      showNotification("Failed to convert math.");
      isConvertingRef.current = false;
    }
  };

  // Perform Handwriting -> Text Conversion
  const convertSelectedStrokesToText = async () => {
    if (!editor || isConvertingRef.current) return;
    const selectedShapes = editor.getSelectedShapes().filter(s => s.type === 'draw');
    const shapesToConvert = selectedShapes.length > 0 ? selectedShapes : editor.getCurrentPageShapes().filter(s => s.type === 'draw');

    if (shapesToConvert.length === 0) {
      showNotification('✏️ Draw or write some text first!');
      return;
    }

    isConvertingRef.current = true;
    showNotification('✍️ Identifying handwriting text...');

    try {
      const extracted = extractStrokesFromShapes(shapesToConvert);
      const { strokes, minX, minY, drawnHeight, width, height } = extracted;

      if (strokes.length === 0) {
        isConvertingRef.current = false;
        showNotification('⚠️ Could not extract stroke points.');
        return;
      }

      const payload = {
        width: width,
        height: height,
        contentType: "Text",
        strokeGroups: [{ strokes: strokes }]
      };

      const stringifiedBody = JSON.stringify(payload);
      const hmacSignature = await generateHMAC(myScriptConfig.applicationKey, myScriptConfig.hmacKey, stringifiedBody);

      const response = await fetch("/myscript-api/api/v4.0/iink/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "applicationKey": myScriptConfig.applicationKey,
          "hmac": hmacSignature,
          "Accept": "text/plain"
        },
        body: stringifiedBody
      });

      if (response.ok) {
        const recognizedText = (await response.text()).trim();
        if (recognizedText) {
          editor.deleteShapes(shapesToConvert.map(s => s.id));

          let scaleMult = 1.0;
          if (selectedSize === 'small') scaleMult = 0.8;
          if (selectedSize === 'normal' || selectedSize === 'auto') scaleMult = 1.0;
          if (selectedSize === 'large') scaleMult = 1.25;
          if (selectedSize === 'xlarge') scaleMult = 1.6;

          const targetHeight = drawnHeight * scaleMult;

          let fontSize = 'm';
          if (targetHeight <= 32) fontSize = 's';
          else if (targetHeight <= 64) fontSize = 'm';
          else if (targetHeight <= 96) fontSize = 'l';
          else fontSize = 'xl';

          const newTextShapeId = createShapeId();

          editor.createShape({
            id: newTextShapeId,
            type: 'text', x: minX, y: minY,
            props: {
              richText: toRichText(recognizedText),
              size: fontSize,
              font: (selectedFont === 'sans-serif' ? 'sans' : selectedFont === 'monospace' ? 'mono' : selectedFont === 'cursive' ? 'draw' : selectedFont)
            }
          });

          // Match exact handwriting height for big/small letters
          setTimeout(() => {
            try {
              const bounds = editor.getShapePageBounds(newTextShapeId);
              if (bounds && bounds.h > 0) {
                const scaleFactor = targetHeight / bounds.h;
                if (scaleFactor > 0.1 && Math.abs(scaleFactor - 1) > 0.03) {
                  if (typeof editor.scaleShape === 'function') {
                    editor.scaleShape(newTextShapeId, scaleFactor, scaleFactor);
                  } else {
                    editor.updateShape({
                      id: newTextShapeId,
                      type: 'text',
                      props: { scale: scaleFactor }
                    });
                  }
                }
              }
            } catch (err) {
              console.error("Scale shape error:", err);
            }
          }, 20);

          setNotesPreview(prev => [...prev, { type: 'text', content: recognizedText }]);
          showNotification(`✨ Text Recognized: ${recognizedText}`);
        } else {
          showNotification('⚠️ No text recognized.');
        }
      } else {
        showNotification('⚠️ Text recognition API error.');
      }
    } catch (err) {
      console.error("Text convert error:", err);
      showNotification("Failed to convert text.");
    } finally {
      isConvertingRef.current = false;
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authForm.email || !authForm.password || !authForm.name) {
      setAuthError('Please fill in all fields.');
      return;
    }
    const newUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: authForm.name,
      email: authForm.email
    };
    setCurrentUser(newUser);
    setAuthModalOpen(false);
    setAuthForm({ name: '', email: '', password: '' });
    showNotification(`Welcome, ${newUser.name}! Account created.`);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authForm.email || !authForm.password) {
      setAuthError('Please enter email and password.');
      return;
    }
    const nameFromEmail = authForm.email.split('@')[0];
    const user = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
      email: authForm.email
    };
    setCurrentUser(user);
    setAuthModalOpen(false);
    setAuthForm({ name: '', email: '', password: '' });
    showNotification(`Welcome back, ${user.name}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserDropdownOpen(false);
    showNotification('Signed out successfully.');
  };

  const handleSaveBoard = (customTitle) => {
    if (!editor) return;
    const finalTitle = (customTitle || boardTitleInput || activeBoardTitle || 'Untitled Board').trim();

    try {
      const snapshot = getSnapshot(editor.store);
      const boardId = activeBoardId || ('board_' + Date.now());
      const nowStr = new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

      const newBoardItem = {
        id: boardId,
        userId: currentUser ? currentUser.id : 'guest',
        title: finalTitle,
        updatedAt: nowStr,
        boardColor: boardColor,
        notebookLinesOn: notebookLinesOn,
        snapshot: snapshot
      };

      setSavedBoards(prev => {
        const existingIdx = prev.findIndex(b => b.id === boardId);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = newBoardItem;
          return updated;
        } else {
          return [newBoardItem, ...prev];
        }
      });

      setActiveBoardId(boardId);
      setActiveBoardTitle(finalTitle);
      setSaveBoardModalOpen(false);
      showNotification(`Saved "${finalTitle}" successfully!`);
    } catch (err) {
      console.error("Save board error:", err);
      showNotification("Failed to save board progress.");
    }
  };

  const handleLoadBoard = (boardItem) => {
    if (!editor || !boardItem || !boardItem.snapshot) return;
    try {
      loadSnapshot(editor.store, boardItem.snapshot);
      if (boardItem.boardColor) setBoardColor(boardItem.boardColor);
      if (boardItem.notebookLinesOn !== undefined) setNotebookLinesOn(boardItem.notebookLinesOn);
      setActiveBoardId(boardItem.id);
      setActiveBoardTitle(boardItem.title);
      setSavedBoardsModalOpen(false);
      showNotification(`Loaded "${boardItem.title}"!`);
    } catch (err) {
      console.error("Load board error:", err);
      showNotification("Failed to load board snapshot.");
    }
  };

  const handleDeleteBoard = (boardId, e) => {
    if (e) e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this saved board?")) {
      setSavedBoards(prev => prev.filter(b => b.id !== boardId));
      if (activeBoardId === boardId) {
        setActiveBoardId(null);
        setActiveBoardTitle('Untitled Board');
      }
      showNotification('Board deleted.');
    }
  };

  const handleDuplicateBoard = (boardItem, e) => {
    if (e) e.stopPropagation();
    const dupTitle = `${boardItem.title} (Copy)`;
    const dupBoardId = 'board_' + Date.now();
    const nowStr = new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

    const duplicatedItem = {
      ...boardItem,
      id: dupBoardId,
      title: dupTitle,
      updatedAt: nowStr
    };

    setSavedBoards(prev => [duplicatedItem, ...prev]);
    showNotification(`Duplicated "${dupTitle}"!`);
  };

  const handleCreateNewBoard = () => {
    if (window.confirm("Start a new blank board? Unsaved changes on current board will be cleared.")) {
      if (editor) {
        const allShapeIds = Array.from(editor.getCurrentPageShapeIds());
        if (allShapeIds.length > 0) editor.deleteShapes(allShapeIds);
      }
      setActiveBoardId(null);
      setActiveBoardTitle('Untitled Board');
      setUserDropdownOpen(false);
      showNotification('New blank board created.');
    }
  };

  const extractTextFromShape = (shape) => {
    if (!shape || !shape.props) return '';

    // 1. Direct props.text string
    if (typeof shape.props.text === 'string' && shape.props.text.trim()) {
      return shape.props.text.trim();
    }

    // 2. RichText object or array
    if (shape.props.richText) {
      if (typeof shape.props.richText === 'string' && shape.props.richText.trim()) {
        return shape.props.richText.trim();
      }
      if (Array.isArray(shape.props.richText)) {
        const texts = shape.props.richText.map(node => node.text || node.children?.[0]?.text || '').filter(Boolean);
        if (texts.length > 0) return texts.join(' ').trim();
      }
      if (typeof shape.props.richText === 'object') {
        try {
          const jsonStr = JSON.stringify(shape.props.richText);
          const matches = jsonStr.match(/"text"\s*:\s*"([^"]+)"/g);
          if (matches) {
            const extracted = matches.map(m => m.replace(/"text"\s*:\s*"/, '').replace(/"$/, '')).join(' ');
            if (extracted.trim()) return extracted.trim();
          }
        } catch (e) { }
      }
    }

    // 3. Name or meta.text
    if (typeof shape.props.name === 'string' && shape.props.name.trim()) {
      return shape.props.name.trim();
    }
    if (shape.meta && typeof shape.meta.text === 'string' && shape.meta.text.trim()) {
      return shape.meta.text.trim();
    }

    return '';
  };

  const refreshNotesFromBoard = async () => {
    if (!editor) return;
    const allShapes = editor.getCurrentPageShapes();
    const extractedNotes = [];
    const seenContents = new Set();

    allShapes.forEach(shape => {
      // 1. Math equation shapes
      if ((shape.meta && shape.meta.isEquation && shape.meta.latex) || (shape.type === 'image' && shape.meta && shape.meta.latex)) {
        const latex = shape.meta.latex;
        if (latex && !seenContents.has(latex)) {
          seenContents.add(latex);
          const asset = shape.props.assetId ? editor.getAsset(shape.props.assetId) : null;
          const imgUrl = asset ? asset.props.src : `https://latex.codecogs.com/svg.image?${encodeURIComponent(latex)}`;
          extractedNotes.push({
            type: 'math',
            content: latex,
            imageUrl: imgUrl
          });
        }
      }
      // 2. Text shapes (text, note, geo, etc.)
      else {
        const txt = extractTextFromShape(shape);
        if (txt && !seenContents.has(txt)) {
          seenContents.add(txt);
          extractedNotes.push({
            type: 'text',
            content: txt
          });
        }
      }
    });

    // 3. Auto HWR recognition on unconverted handwritten ink strokes ('draw' shapes)
    const drawShapes = allShapes.filter(s => s.type === 'draw');
    if (drawShapes.length > 0) {
      try {
        const extracted = extractStrokesFromShapes(drawShapes);
        const { strokes, width, height } = extracted;

        if (strokes.length > 0) {
          const payload = {
            width: width, height: height,
            contentType: "Text", strokeGroups: [{ strokes: strokes }]
          };
          const stringifiedBody = JSON.stringify(payload);
          const hmacSignature = await generateHMAC(myScriptConfig.applicationKey, myScriptConfig.hmacKey, stringifiedBody);
          const res = await fetch("/myscript-api/api/v4.0/iink/batch", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "applicationKey": myScriptConfig.applicationKey,
              "hmac": hmacSignature,
              "Accept": "text/plain"
            },
            body: stringifiedBody
          });
          if (res.ok) {
            const recognized = (await res.text()).trim();
            if (recognized && !seenContents.has(recognized)) {
              seenContents.add(recognized);
              extractedNotes.push({ type: 'text', content: recognized });
            }
          }
        }
      } catch (err) {
        console.error("Auto HWR extraction error:", err);
      }
    }

    setNotesPreview(prev => {
      const merged = [...extractedNotes];
      prev.forEach(p => {
        if (p.content && !seenContents.has(p.content)) {
          seenContents.add(p.content);
          merged.push(p.content ? p : null);
        }
      });
      return merged.filter(Boolean);
    });
  };

  const convertImageToDataUrl = (url) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const scale = 4; // High DPI scale factor for crisp rendering
        const canvas = document.createElement('canvas');
        canvas.width = (img.naturalWidth || 300) * scale;
        canvas.height = (img.naturalHeight || 80) * scale;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ dataUrl: canvas.toDataURL('image/png', 1.0), width: canvas.width, height: canvas.height });
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = url;
    });
  };

  const downloadRealPDF = async () => {
    showNotification("Generating Ultra HD PDF with Equations...");
    await refreshNotesFromBoard();
    const doc = new jsPDF();

    // Top Header Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(56, 189, 248);
    doc.text("ViewBoard - Session Notes & Equations", 14, 18);

    let yPos = 42;

    // Directly extract shapes from live editor state
    const allBoardShapes = editor ? editor.getCurrentPageShapes() : [];
    const currentNotes = [];
    const seen = new Set();

    allBoardShapes.forEach(shape => {
      if ((shape.meta && shape.meta.isEquation && shape.meta.latex) || (shape.type === 'image' && shape.meta && shape.meta.latex)) {
        const latex = shape.meta.latex;
        if (latex && !seen.has(latex)) {
          seen.add(latex);
          currentNotes.push({ type: 'math', content: latex });
        }
      } else {
        const txt = extractTextFromShape(shape);
        if (txt && !seen.has(txt)) {
          seen.add(txt);
          currentNotes.push({ type: 'text', content: txt });
        }
      }
    });

    notesPreview.forEach(p => {
      if (p && p.content && !seen.has(p.content)) {
        seen.add(p.content);
        currentNotes.push(p);
      }
    });

    const mathNotes = currentNotes.filter(n => n.type === 'math');
    const textNotes = currentNotes.filter(n => n.type === 'text');

    if (currentNotes.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text("No converted text notes or math equations found on this board.", 14, yPos);
    } else {
      // 1. Equations Section (NO NUMBERING, Clean Heading)
      if (mathNotes.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(2, 132, 199);
        doc.text("Equations", 14, yPos);
        yPos += 3;

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, yPos, 196, yPos);
        yPos += 10;

        for (let i = 0; i < mathNotes.length; i++) {
          const item = mathNotes[i];
          if (yPos > 265) {
            doc.addPage();
            yPos = 25;
          }

          // Fetch 600DPI Ultra HD PNG equation image
          const highResImgUrl = `https://latex.codecogs.com/png.image?\\dpi{600}\\bg{white}${encodeURIComponent(item.content)}`;
          const imgData = await convertImageToDataUrl(highResImgUrl);

          if (imgData) {
            const aspect = imgData.width / imgData.height;
            const pdfImgHeight = 18;
            const pdfImgWidth = Math.min(160, Math.round(pdfImgHeight * aspect));
            doc.addImage(imgData.dataUrl, 'PNG', 16, yPos, pdfImgWidth, pdfImgHeight, undefined, 'FAST');
            yPos += pdfImgHeight + 10;
          } else {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            doc.setTextColor(30, 41, 59);
            doc.text(item.content, 16, yPos);
            yPos += 12;
          }
        }
      }

      // 2. Text Notes Section (NO NUMBERING, Clean Heading)
      if (textNotes.length > 0) {
        if (yPos > 240) {
          doc.addPage();
          yPos = 25;
        } else if (mathNotes.length > 0) {
          yPos += 8;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(22, 163, 74);
        doc.text("Text Notes", 14, yPos);
        yPos += 3;

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, yPos, 196, yPos);
        yPos += 10;

        for (let i = 0; i < textNotes.length; i++) {
          const item = textNotes[i];
          if (yPos > 265) {
            doc.addPage();
            yPos = 25;
          }

          doc.setFont("helvetica", "normal");
          doc.setFontSize(11);
          doc.setTextColor(30, 41, 59);
          doc.text(item.content, 16, yPos);
          yPos += 12;
        }
      }
    }

    doc.save(`ViewBoard_Notes_${Date.now()}.pdf`);
    showNotification("Downloaded Ultra HD PDF with Equations!");
  };

  const downloadCanvasSnapshotPDF = async () => {
    const el = document.querySelector('.tl-container');
    if (!el) return;
    showNotification("Generating High-Res Visual Canvas PDF...");
    const canvas = await html2canvas(el, { scale: 2.5, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'px', [canvas.width, canvas.height]);
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`ViewBoard_Canvas_HD_${Date.now()}.pdf`);
    showNotification("Downloaded HD Canvas PDF!");
  };

  const updateQrLink = async (token, hostVal) => {
    let targetHost = (hostVal || '').trim().replace(/^https?:\/\//, '');
    if (!targetHost) {
      targetHost = window.location.host;
    }
    const proto = window.location.protocol;
    const generatedUrl = `${proto}//${targetHost}/?mobileCam=true&session=${token}`;
    setMobileLink(generatedUrl);

    try {
      const qrDataUrl = await QRCode.toDataURL(generatedUrl, { width: 260, margin: 2 });
      setQrCodeUrl(qrDataUrl);
    } catch (err) {
      console.error("QR Code error:", err);
    }
  };

  const handleOpenMobileModal = async () => {
    setMobileModalOpen(true);

    let sessionToken = currentSessionToken;
    if (!mobileSessionActive || !sessionToken || mobileTimeLeft <= 0) {
      const randomId = Math.random().toString(36).substring(2, 8);
      sessionToken = `vb-${randomId}`;
      setCurrentSessionToken(sessionToken);
      setMobileSessionActive(true);
      setMobileTimeLeft(300); // 5-minute window
    }

    const initialHost = window.location.host;
    setCustomHost(initialHost);
    updateQrLink(sessionToken, initialHost);
    initWebRTCReceiver(sessionToken);
  };

  const handleDisconnectMobileSession = () => {
    setMobileSessionActive(false);
    setMobileTimeLeft(0);
    setIsConnected(false);
    setMobileModalOpen(false);
    showNotification("🔴 Mobile 5-minute session disconnected.");
  };

  const initWebRTCReceiver = (sessionToken) => {
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch (e) { }
    }

    try {
      const peer = new Peer(sessionToken, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });
      peerRef.current = peer;

      peer.on('connection', (conn) => {
        setIsConnected(true);
        showNotification("🟢 Phone Connected to Whiteboard!");

        conn.on('data', async (data) => {
          if (data && data.type === 'snapshot' && data.dataUrl) {
            addPhotoToCanvas(data.dataUrl);
          }
        });
      });
    } catch (e) { }
  };

  const formatHHMM = (date) => {
    let h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, '0');
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${m}`;
  };
  const formatSS = (date) => String(date.getSeconds()).padStart(2, '0');
  const formatAMPM = (date) => (date.getHours() >= 12 ? 'PM' : 'AM');

  return (
    <>
      {/* TOP RIGHT FLOATING BADGE: 5-Minute Mobile Active Session Timer */}
      {mobileSessionActive && mobileTimeLeft > 0 && (
        <div
          onClick={() => setMobileModalOpen(true)}
          style={{
            position: 'fixed', top: '56px', right: '16px', zIndex: 3500,
            background: 'rgba(15, 23, 42, 0.94)', backdropFilter: 'blur(12px)',
            color: '#4ade80', padding: '6px 12px', borderRadius: '9999px',
            fontSize: '11px', fontWeight: '700', cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(0,0,0,0.3)', border: '1px solid rgba(74, 222, 128, 0.4)',
            display: 'flex', alignItems: 'center', gap: '6px', userSelect: 'none'
          }}
          title="Click to view QR code or click ✕ to disconnect"
        >
          <span>📱 Mobile Active: <strong>{formatMMSS(mobileTimeLeft)}</strong></span>
          <button
            onClick={(e) => { e.stopPropagation(); handleDisconnectMobileSession(); }}
            style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '50%', width: '20px', height: '20px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '4px' }}
            title="Disconnect 5m session"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Control Toolbar (Permanent Top Header Bar) */}
      <div style={{
        position: 'fixed',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        flexDirection: 'row',
        padding: '7px 14px',
        borderRadius: '9999px',
        maxWidth: 'calc(100vw - 32px)',
        overflowX: 'auto',
        zIndex: 999999,
        display: 'flex', alignItems: 'center', gap: '6px',
        background: boardColor === 'default' ? 'rgba(248, 250, 252, 0.98)' : 'rgba(255, 255, 255, 0.97)',
        border: boardColor === 'default' ? '1px solid rgba(203, 213, 225, 0.9)' : '1px solid rgba(255, 255, 255, 0.8)',
        boxShadow: boardColor === 'default'
          ? '0 12px 35px rgba(15, 23, 42, 0.16), 0 2px 8px rgba(0,0,0,0.04)'
          : '0 12px 35px rgba(31, 38, 135, 0.12), 0 2px 10px rgba(255, 255, 255, 0.6) inset, 0 1px 3px rgba(0,0,0,0.05)',
        transition: 'all 0.3s ease'
      }}>

        {/* Toast Save Notification */}
        {saveNotification && (
          <div style={{ padding: '0 12px', height: '32px', background: '#0f172a', color: 'white', borderRadius: '9999px', fontSize: '11px', fontWeight: '700', boxShadow: '0 4px 12px rgba(0,0,0,0.25)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
            {saveNotification}
          </div>
        )}

        {/* INTEGRATED DRAWING TOOLSET WITH UNIFORM SIZE */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '6px', width: 'auto', alignItems: 'center' }}>
          {/* Select Tool */}
          <button
            onClick={() => selectDrawingTool('select')}
            style={{
              width: '32px',
              height: '34px', padding: '0',
              borderRadius: '50%',
              background: activeTool === 'select' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#ffffff',
              color: activeTool === 'select' ? '#ffffff' : '#334155',
              border: activeTool === 'select' ? 'none' : '1px solid #cbd5e1',
              fontWeight: '700', cursor: 'pointer', fontSize: '11.5px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: activeTool === 'select' ? '0 2px 8px rgba(59,130,246,0.4)' : 'none',
              transition: 'all 0.15s ease'
            }}
            title="Select Tool (↖)"
          >
            <span style={{ fontSize: '13px' }}>↖</span>
          </button>

          {/* Move / Pan Tool */}
          <button
            onClick={() => selectDrawingTool('hand')}
            style={{
              width: '32px',
              height: '34px', padding: '0',
              borderRadius: '50%',
              background: activeTool === 'hand' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#ffffff',
              color: activeTool === 'hand' ? '#ffffff' : '#334155',
              border: activeTool === 'hand' ? 'none' : '1px solid #cbd5e1',
              fontWeight: '700', cursor: 'pointer', fontSize: '11.5px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: activeTool === 'hand' ? '0 2px 8px rgba(59,130,246,0.4)' : 'none',
              transition: 'all 0.15s ease'
            }}
            title="Move / Pan Tool (✋)"
          >
            <span style={{ fontSize: '13px' }}>✋</span>
          </button>

          {/* Pen Tool */}
          <button
            onClick={() => selectDrawingTool('draw')}
            style={{
              width: '32px',
              height: '34px', padding: '0',
              borderRadius: '50%',
              background: (activeTool === 'draw' && eraserMode !== 'selective') ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#ffffff',
              color: (activeTool === 'draw' && eraserMode !== 'selective') ? '#ffffff' : '#334155',
              border: (activeTool === 'draw' && eraserMode !== 'selective') ? 'none' : '1px solid #cbd5e1',
              fontWeight: '700', cursor: 'pointer', fontSize: '11.5px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: (activeTool === 'draw' && eraserMode !== 'selective') ? '0 2px 8px rgba(59,130,246,0.4)' : 'none',
              transition: 'all 0.15s ease'
            }}
            title="Pencil / Draw Tool (✏️)"
          >
            <span style={{ fontSize: '13px' }}>✏️</span>
          </button>

          {/* Eraser Tool Button (Opens Eraser Options Popover) */}
          <button
            ref={eraserBtnRef}
            onClick={handleToggleEraserMenu}
            style={{
              width: '32px',
              height: '34px', padding: '0',
              borderRadius: '50%',
              background: (eraserMenuOpen || activeTool === 'eraser' || eraserMode === 'selective') ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#ffffff',
              color: (eraserMenuOpen || activeTool === 'eraser' || eraserMode === 'selective') ? '#ffffff' : '#334155',
              border: (eraserMenuOpen || activeTool === 'eraser' || eraserMode === 'selective') ? 'none' : '1px solid #cbd5e1',
              fontWeight: '700', cursor: 'pointer', fontSize: '11.5px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: (eraserMenuOpen || activeTool === 'eraser' || eraserMode === 'selective') ? '0 2px 8px rgba(59,130,246,0.4)' : 'none',
              transition: 'all 0.15s ease'
            }}
            title="Eraser Tool (Complete 🧹 vs Selective ✂️)"
          >
            <span style={{ fontSize: '13px' }}>🧹</span>
          </button>

          {/* Arrow Tool */}
          <button
            onClick={() => selectDrawingTool('arrow')}
            style={{
              width: '32px',
              height: '34px', padding: '0',
              borderRadius: '50%',
              background: activeTool === 'arrow' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#ffffff',
              color: activeTool === 'arrow' ? '#ffffff' : '#334155',
              border: activeTool === 'arrow' ? 'none' : '1px solid #cbd5e1',
              fontWeight: '700', cursor: 'pointer', fontSize: '11.5px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: activeTool === 'arrow' ? '0 2px 8px rgba(59,130,246,0.4)' : 'none',
              transition: 'all 0.15s ease'
            }}
            title="Arrow Tool (↗)"
          >
            <span style={{ fontSize: '13px' }}>↗</span>
          </button>

          {/* Text Tool */}
          <button
            onClick={() => selectDrawingTool('text')}
            style={{
              width: '32px',
              height: '34px', padding: '0',
              borderRadius: '50%',
              background: activeTool === 'text' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#ffffff',
              color: activeTool === 'text' ? '#ffffff' : '#334155',
              border: activeTool === 'text' ? 'none' : '1px solid #cbd5e1',
              fontWeight: '700', cursor: 'pointer', fontSize: '11.5px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: activeTool === 'text' ? '0 2px 8px rgba(59,130,246,0.4)' : 'none',
              transition: 'all 0.15s ease'
            }}
            title="Text Tool (T)"
          >
            <span style={{ fontSize: '13px' }}>T</span>
          </button>

          {/* Sticky Note Tool */}
          <button
            onClick={() => selectDrawingTool('note')}
            style={{
              width: '32px',
              height: '34px', padding: '0',
              borderRadius: '50%',
              background: activeTool === 'note' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#ffffff',
              color: activeTool === 'note' ? '#ffffff' : '#334155',
              border: activeTool === 'note' ? 'none' : '1px solid #cbd5e1',
              fontWeight: '700', cursor: 'pointer', fontSize: '11.5px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: activeTool === 'note' ? '0 2px 8px rgba(59,130,246,0.4)' : 'none',
              transition: 'all 0.15s ease'
            }}
            title="Sticky Note Tool (📄)"
          >
            <span style={{ fontSize: '13px' }}>📄</span>
          </button>

          {/* Rectangle / Shape Tool */}
          <button
            onClick={() => selectDrawingTool('geo')}
            style={{
              width: '32px',
              height: '34px', padding: '0',
              borderRadius: '50%',
              background: (activeTool === 'geo' || activeTool === 'rectangle') ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#ffffff',
              color: (activeTool === 'geo' || activeTool === 'rectangle') ? '#ffffff' : '#334155',
              border: (activeTool === 'geo' || activeTool === 'rectangle') ? 'none' : '1px solid #cbd5e1',
              fontWeight: '700', cursor: 'pointer', fontSize: '11.5px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: (activeTool === 'geo' || activeTool === 'rectangle') ? '0 2px 8px rgba(59,130,246,0.4)' : 'none',
              transition: 'all 0.15s ease'
            }}
            title="Rectangle / Shapes Tool (🔲)"
          >
            <span style={{ fontSize: '13px' }}>🔲</span>
          </button>

          {/* Style & Palette Swatch Button */}
          <button
            ref={styleBtnRef}
            onClick={handleToggleStylePanel}
            style={{
              width: '32px',
              height: '34px', padding: '0',
              borderRadius: '50%',
              background: stylePanelOpen ? '#f1f5f9' : '#ffffff',
              color: '#334155',
              border: stylePanelOpen ? '2px solid #3b82f6' : '1px solid #cbd5e1',
              fontWeight: '700', cursor: 'pointer', fontSize: '11.5px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: stylePanelOpen ? '0 0 10px rgba(59,130,246,0.4)' : 'none',
              transition: 'all 0.15s ease'
            }}
            title="Pen Style, Colors & Stroke Size"
          >
            <span style={{
              width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
              background: tldrawColors.find(c => c.id === activePenColor)?.hex || '#1e293b',
              boxShadow: '0 2px 5px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.9)'
            }} />
          </button>
        </div>

        {/* Divider Line */}
        <div style={{
          width: '1px',
          height: '24px',
          background: '#cbd5e1', margin: '0 4px'
        }} />

        {/* FEATURE BUTTONS SECTION */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '6px', width: 'auto', alignItems: 'center' }}>
          {/* Mobile Connection Button */}
          <button
            onClick={handleOpenMobileModal}
            style={{
              width: 'auto',
              height: '34px', padding: '0 10px',
              background: mobileSessionActive ? 'linear-gradient(135deg, #bbf7d0, #86efac)' : 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
              color: '#15803d', border: '1px solid #4ade80', borderRadius: '9999px',
              fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              boxShadow: '0 2px 8px rgba(74, 222, 128, 0.25)', transition: 'all 0.15s ease'
            }}
          >
            <span>{mobileSessionActive ? `Mobile (${formatMMSS(mobileTimeLeft)})` : 'Mobile'}</span>
          </button>

          {/* IntoMath Button */}
          <button
            onClick={convertSelectedStrokesToMath}
            style={{
              width: 'auto',
              height: '34px', padding: '0 10px',
              background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd',
              borderRadius: '9999px',
              fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.15s ease'
            }}
            title="Convert hand-drawn strokes into LaTeX Math formula"
          >
            <span>IntoMath</span>
          </button>

          {/* IntoText Button */}
          <button
            onClick={convertSelectedStrokesToText}
            style={{
              width: 'auto',
              height: '34px', padding: '0 10px',
              background: '#fce7f3', color: '#be185d', border: '1px solid #fbcfe8',
              borderRadius: '9999px',
              fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.15s ease'
            }}
            title="Convert hand-drawn strokes into editable Text"
          >
            <span>IntoText</span>
          </button>

          {/* Notebook Lines Toggle */}
          <button
            onClick={() => setNotebookLinesOn(!notebookLinesOn)}
            style={{
              width: 'auto',
              height: '34px', padding: '0 10px', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer',
              borderRadius: '9999px',
              border: notebookLinesOn ? '1px solid #c4b5fd' : '1px solid #cbd5e1', transition: 'all 0.2s',
              background: notebookLinesOn ? '#f3e8ff' : '#ffffff',
              color: notebookLinesOn ? '#6b21a8' : '#64748b',
              whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
            title="Toggle Ruled Paper Lines"
          >
            <span>Lines {notebookLinesOn ? 'ON' : 'OFF'}</span>
          </button>

          {/* Board Background Color Palette */}
          <button
            ref={colorBtnRef}
            onClick={handleToggleColorDropdown}
            style={{
              width: 'auto',
              height: '34px', padding: '0 10px', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer',
              borderRadius: '9999px',
              border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', whiteSpace: 'nowrap'
            }}
            title="Select Whiteboard Background Color"
          >
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: boardColorOptions.find(o => o.id === boardColor)?.bg || '#ffffff', border: '1px solid #94a3b8', flexShrink: 0 }}></span>
            <span>Color ▾</span>
          </button>

          {/* Take Away Notes PDF Button (Pizza slice emoji 🍕 for TakeAway!) */}
          <button
            ref={takeawayBtnRef}
            onClick={handleToggleTakeawayDropdown}
            style={{
              width: 'auto',
              height: '34px', padding: '0 10px',
              background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a',
              borderRadius: '9999px',
              fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ fontSize: '13px' }}>🍕</span>
            <span>TakeAway</span>
          </button>

          {/* Account Logo Badge */}
          <button
            ref={accountBtnRef}
            onClick={handleToggleUserDropdown}
            style={{
              width: '32px',
              height: '34px', padding: '0',
              borderRadius: '50%',
              background: currentUser ? 'linear-gradient(135deg, #818cf8, #6366f1)' : '#60a5fa',
              color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontSize: '13px', boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
              transition: 'transform 0.15s ease', flexShrink: 0
            }}
            title={currentUser ? `Account: ${currentUser.name}` : "Sign In / Account Options"}
          >
            <span>{currentUser ? currentUser.name.charAt(0).toUpperCase() : '👤'}</span>
          </button>

          {/* Integrated Clock Badge */}
          <LiveClockBadge onClick={() => setClockStage('exam_panel')} />
        </div>
      </div>

      {/* Aesthetic Eraser Popover Menu */}
      {eraserMenuOpen && (
        <div
          ref={eraserMenuRef}
          style={{
            position: 'fixed',
            top: `${eraserMenuPos.top}px`,
            ...(eraserMenuPos.left !== 'auto' ? { left: `${eraserMenuPos.left}px` } : {}),
            zIndex: 9999999,
            width: '260px',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: '1px solid rgba(226, 232, 240, 0.95)',
            boxShadow: '0 20px 45px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.06)',
            padding: '16px',
            userSelect: 'none'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>
            Eraser Mode
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Option A: Complete Erase with Vacuum Cleaner Emoji 🧹 */}
            <button
              onClick={handleSelectCompleteEraser}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '14px',
                border: (activeTool === 'eraser' && eraserMode === 'complete') ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                background: (activeTool === 'eraser' && eraserMode === 'complete') ? '#eff6ff' : '#f8fafc',
                color: (activeTool === 'eraser' && eraserMode === 'complete') ? '#1d4ed8' : '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '24px' }}>🧹</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>Complete Erase</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Erase full strokes & shapes</div>
              </div>
            </button>

            {/* Option B: Selective Erase */}
            <button
              onClick={handleSelectSelectiveEraser}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '14px',
                border: (eraserMode === 'selective') ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                background: (eraserMode === 'selective') ? '#eff6ff' : '#f8fafc',
                color: (eraserMode === 'selective') ? '#1d4ed8' : '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>✂️</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>Selective Erasing</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Erase small tiny spaces precisely</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Integrated Style & Color Palette Popover (Picture 1 Match) */}
      {stylePanelOpen && (
        <div
          ref={stylePanelRef}
          style={{
            position: 'fixed',
            top: `${stylePanelPos.top}px`,
            ...(stylePanelPos.left !== 'auto' ? { left: `${stylePanelPos.left}px` } : {}),
            ...(stylePanelPos.right !== 'auto' ? { right: `${stylePanelPos.right}px` } : {}),
            zIndex: 9999999,
            width: '210px',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: '1px solid rgba(226, 232, 240, 0.95)',
            boxShadow: '0 20px 45px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.06)',
            padding: '16px',
            userSelect: 'none'
          }}
        >
          {/* 1. Color Palette Grid (12 Colors in 3x4 Grid matching Picture 1) */}
          <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
            Pen Color
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px', justifyItems: 'center', alignItems: 'center' }}>
            {tldrawColors.map(c => {
              const isSelected = activePenColor === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSetPenColor(c.id)}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: c.hex, border: isSelected ? '3px solid #ffffff' : '1px solid rgba(0,0,0,0.1)',
                    boxShadow: isSelected ? '0 0 0 2.5px #3b82f6, 0 3px 8px rgba(0,0,0,0.2)' : 'none',
                    cursor: 'pointer', transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s ease'
                  }}
                  title={c.id}
                />
              );
            })}
          </div>

          <div style={{ width: '100%', height: '1px', background: '#f1f5f9', margin: '10px 0' }} />

          {/* 2. Stroke Size Range Slider */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Stroke Size
            </span>
            <span style={{ fontSize: '10px', fontWeight: '800', color: '#3b82f6', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1px 7px', borderRadius: '10px' }}>
              {activePenSize.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', padding: '0 2px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8', flexShrink: 0 }} title="Thin" />
            <input
              type="range"
              min="1"
              max="100"
              value={strokeSliderValue}
              onChange={(e) => handleStrokeSliderChange(Number(e.target.value))}
              style={{
                flex: 1,
                height: '6px',
                borderRadius: '4px',
                appearance: 'none',
                WebkitAppearance: 'none',
                background: `linear-gradient(to right, #3b82f6 ${strokeSliderValue}%, #e2e8f0 ${strokeSliderValue}%)`,
                cursor: 'pointer',
                outline: 'none'
              }}
            />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#64748b', flexShrink: 0 }} title="Thick" />
          </div>

          {/* 3. Stroke Dash Style Grid */}
          <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
            Line Dash
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '12px' }}>
            {tldrawDashes.map(d => {
              const isSelected = activePenDash === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => handleSetPenDash(d.id)}
                  style={{
                    padding: '6px 0', fontSize: '10px', fontWeight: '700', borderRadius: '8px',
                    background: isSelected ? '#e2e8f0' : '#f8fafc',
                    color: isSelected ? '#0f172a' : '#64748b',
                    border: isSelected ? '1.5px solid #cbd5e1' : '1px solid #e2e8f0',
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          {/* 4. Stroke Fill Style Grid */}
          <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
            Shape Fill
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {tldrawFills.map(f => {
              const isSelected = activePenFill === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => handleSetPenFill(f.id)}
                  style={{
                    padding: '6px 0', fontSize: '10px', fontWeight: '700', borderRadius: '8px',
                    background: isSelected ? '#e2e8f0' : '#f8fafc',
                    color: isSelected ? '#0f172a' : '#64748b',
                    border: isSelected ? '1.5px solid #cbd5e1' : '1px solid #e2e8f0',
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Board Background Color Palette Dropdown (Positioned Directly Below Color Button) */}
      {boardColorDropdownOpen && (
        <div
          ref={colorDropdownRef}
          style={{
            position: 'fixed', top: `${colorMenuPos.top}px`, left: `${colorMenuPos.left}px`, zIndex: 9999999,
            background: 'rgba(255, 255, 255, 0.96)', backdropFilter: 'blur(20px)',
            borderRadius: '18px', border: '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: '0 20px 45px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.06)',
            padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', width: '130px'
          }}
        >
          {boardColorOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => { setBoardColor(opt.id); setBoardColorDropdownOpen(false); }}
              style={{
                width: '32px', height: '32px', borderRadius: '50%', background: opt.bg,
                border: boardColor === opt.id ? '2.5px solid #3b82f6' : '1px solid #cbd5e1',
                cursor: 'pointer', boxShadow: boardColor === opt.id ? '0 0 10px rgba(59,130,246,0.4)' : 'none',
                transition: 'transform 0.15s ease'
              }}
              title={opt.name}
            />
          ))}
        </div>
      )}

      {/* Aesthetic Account Floating Dropdown Menu (Positioned Directly Below Account Logo) */}
      {userDropdownOpen && (
        <div
          ref={accountDropdownRef}
          style={{
            position: 'fixed', top: `${accountMenuPos.top}px`, right: `${accountMenuPos.right}px`, zIndex: 9999999,
            background: 'rgba(255, 255, 255, 0.96)', backdropFilter: 'blur(20px)',
            borderRadius: '20px', border: '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: '0 20px 45px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.06)',
            padding: '16px', width: '250px', textAlign: 'left'
          }}
        >
          {currentUser ? (
            <div style={{ padding: '4px 6px 12px', borderBottom: '1px solid #f1f5f9', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', boxShadow: '0 4px 12px rgba(99,102,241,0.3)', flexShrink: 0 }}>
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.name}</div>
                <div style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.email}</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '4px 6px 12px', borderBottom: '1px solid #f1f5f9', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>👤</span> Guest Session
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>Sign in not available in this version</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              disabled
              style={{ width: '100%', padding: '9px 12px', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #cbd5e1', borderRadius: '12px', cursor: 'not-allowed', textAlign: 'left', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}
            >
              💾 Save Progress
            </button>

            <button
              disabled
              style={{ width: '100%', padding: '9px 12px', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #cbd5e1', borderRadius: '12px', cursor: 'not-allowed', textAlign: 'left', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}
            >
              📂 My Saved Boards ({savedBoards.length})
            </button>

            <button
              disabled
              style={{ width: '100%', padding: '9px 12px', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #cbd5e1', borderRadius: '12px', cursor: 'not-allowed', textAlign: 'left', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}
            >
              ➕ New Blank Board
            </button>
          </div>

          {!currentUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
              <button
                disabled
                style={{ width: '100%', padding: '10px', background: '#94a3b8', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '12px', fontWeight: '800', cursor: 'not-allowed', opacity: 0.7 }}
              >
                Sign In
              </button>
              <button
                disabled
                style={{ width: '100%', padding: '10px', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '12px', fontWeight: '800', cursor: 'not-allowed', opacity: 0.7 }}
              >
                Create Account
              </button>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '10px', paddingTop: '10px' }}>
              <button
                onClick={handleLogout}
                style={{ width: '100%', padding: '9px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '12px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                🚪 Sign Out
              </button>
            </div>
          )}

          {/* Bottom Up Arrow Collapse Button */}
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => setUserDropdownOpen(false)}
              style={{
                width: '100%', padding: '6px', background: '#f8fafc', color: '#64748b',
                border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', fontWeight: '800',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              title="Collapse menu"
            >
              ▲
            </button>
          </div>
        </div>
      )}

      {/* Take Away Notes Preview Drawer */}
      {dropdownOpen && (
        <div style={{ position: 'fixed', top: `${takeawayMenuPos.top}px`, left: `${takeawayMenuPos.left}px`, background: 'rgba(255, 255, 255, 0.96)', backdropFilter: 'blur(20px)', borderRadius: '20px', boxShadow: '0 20px 45px rgba(0,0,0,0.16)', border: '1px solid rgba(226, 232, 240, 0.9)', width: '330px', padding: '16px', zIndex: 9999999, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b', fontWeight: '800' }}>📄 Session Notes Summary</h4>
            <button
              onClick={() => refreshNotesFromBoard()}
              style={{ background: 'rgba(56, 189, 248, 0.12)', border: 'none', color: '#0284c7', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
              title="Refresh notes from board"
            >
              🔄 Refresh
            </button>
          </div>

          <div style={{ maxHeight: '220px', overflowY: 'auto', background: '#f8fafc', padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569', marginBottom: '12px' }}>
            {(() => {
              const mathNotes = notesPreview.filter(n => n.type === 'math');
              const textNotes = notesPreview.filter(n => n.type === 'text');

              if (notesPreview.length === 0) {
                return <em style={{ fontSize: '11px', color: '#94a3b8' }}>No converted notes or math equations on board yet. Click <strong>⚡ into math</strong> or <strong>📝 into text</strong>!</em>;
              }

              return (
                <>
                  {/* Equations Section */}
                  {mathNotes.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#0284c7', marginBottom: '6px', borderBottom: '1px solid #cbd5e1', paddingBottom: '3px' }}>
                        Equations
                      </div>
                      {mathNotes.map((item, idx) => {
                        const ultraHDUrl = `https://latex.codecogs.com/png.image?\\dpi{600}\\bg{white}${encodeURIComponent(item.content)}`;
                        return (
                          <div key={idx} style={{
                            background: '#ffffff', borderRadius: '10px', padding: '10px 14px',
                            border: '1px solid #cbd5e1', marginBottom: '6px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <img
                              src={ultraHDUrl}
                              alt={item.content}
                              style={{ height: '36px', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Text Notes Section */}
                  {textNotes.length > 0 && (
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#16a34a', marginBottom: '6px', borderBottom: '1px solid #cbd5e1', paddingBottom: '3px' }}>
                        Text Notes
                      </div>
                      {textNotes.map((item, idx) => (
                        <div key={idx} style={{
                          background: '#ffffff', borderRadius: '10px', padding: '8px 12px',
                          border: '1px solid #cbd5e1', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#1e293b',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                        }}>
                          {item.content}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button onClick={downloadRealPDF} style={{ width: '100%', padding: '8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
              Download Structured PDF 📄
            </button>
            <button onClick={downloadCanvasSnapshotPDF} style={{ width: '100%', padding: '8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
              Download Visual Canvas PDF 🖼
            </button>
          </div>
        </div>
      )}

      {/* 2. STAGE 2: AESTHETIC CLOCK & EXAM TIMER DIALOG MODAL */}
      {clockStage === 'exam_panel' && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 9999999, width: '430px', maxWidth: '92vw',
          background: 'rgba(15, 23, 42, 0.94)', backdropFilter: 'blur(30px)',
          borderRadius: '28px', border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 35px rgba(56, 189, 248, 0.2)',
          padding: '24px', color: 'white', overflow: 'hidden'
        }}>
          {/* iOS Animated Moving Blurred Blue Live Wallpaper Background across Modal */}
          <div className="ios-live-wallpaper-bg">
            <div className="ios-blob-1"></div>
            <div className="ios-blob-2"></div>
          </div>

          {/* Dialog Content Wrapper */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Top Bar with Title, Fullscreen (F.S) Button, and Close Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🕒</span> Exam Timer
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Top Right Option for Fullscreen (F.S) */}
                <button
                  onClick={handleEnterFullscreenClock}
                  style={{
                    padding: '5px 12px', background: 'rgba(255, 255, 255, 0.12)',
                    color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)',
                    borderRadius: '9999px', fontSize: '11px', fontWeight: '800',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                    backdropFilter: 'blur(10px)', transition: 'all 0.15s ease'
                  }}
                  title="Expand to Fullscreen"
                >
                  ⛶ Fullscreen
                </button>
                <button
                  onClick={() => setClockStage('badge')}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8', width: '28px', height: '28px', borderRadius: '50%', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* iPhone Style Extra-Bold Digital Time Display */}
            <div style={{ textAlign: 'center', margin: '14px 0 20px' }}>
              <div className="iphone-time-text" style={{ fontSize: '54px', fontWeight: '900', color: '#ffffff', textShadow: '0 0 30px rgba(56, 189, 248, 0.7), 0 4px 16px rgba(0,0,0,0.5)', lineHeight: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatHHMM(now)}</span>
                <span style={{ display: 'inline-block', width: '38px', textAlign: 'left', fontSize: '22px', fontWeight: '800', color: '#38bdf8', fontVariantNumeric: 'tabular-nums', marginLeft: '4px' }}>:{formatSS(now)}</span>
                <span style={{ display: 'inline-block', width: '32px', textAlign: 'left', fontSize: '18px', fontWeight: '800', color: '#93c5fd', marginLeft: '4px' }}>{formatAMPM(now)}</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.85)', marginTop: '8px', letterSpacing: '0.5px' }}>
                {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            {/* Exam Start and Ending Time Inputs + OK Button */}
            <div style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(12px)', padding: '14px', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.12)', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                ⏱ Exam Schedule Settings
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#cbd5e1', marginBottom: '3px' }}>Start Time</label>
                  <input
                    type="time"
                    value={examStartTime}
                    onChange={(e) => setExamStartTime(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(15, 23, 42, 0.8)', color: 'white', fontSize: '12px', fontWeight: '700', outline: 'none' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#cbd5e1', marginBottom: '3px' }}>Ending Time</label>
                  <input
                    type="time"
                    value={examEndTime}
                    onChange={(e) => setExamEndTime(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(15, 23, 42, 0.8)', color: 'white', fontSize: '12px', fontWeight: '700', outline: 'none' }}
                  />
                </div>

                <button
                  onClick={handleApplyExamSchedule}
                  style={{
                    padding: '7px 16px', height: '33px', background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '900',
                    cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)', transition: 'transform 0.15s ease'
                  }}
                >
                  OK
                </button>
              </div>

              {/* Set Start = Now quick button */}
              <button
                onClick={() => {
                  const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                  setExamStartTime(nowStr);
                }}
                style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '11px', fontWeight: '700', cursor: 'pointer', marginTop: '8px', padding: 0 }}
              >
                ⚡ Set Start to Current Time ({formatHHMM(now)})
              </button>
            </div>

            {/* Progress Bar OR TIME UP! Box with Green Border */}
            {(() => {
              const progress = calculateExamProgress();
              if (!progress.active) {
                return (
                  <div style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '14px', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
                    Enter Exam Start & End times and click OK to start progress bar.
                  </div>
                );
              }

              if (progress.status === 'completed') {
                return (
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.12)', padding: '16px', borderRadius: '18px',
                    border: '2px solid #22c55e', boxShadow: '0 0 25px rgba(34, 197, 94, 0.35)',
                    textAlign: 'center'
                  }}>
                    <div className="time-up-pulsate">🚨 TIME UP!</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#86efac', marginTop: '4px' }}>Exam schedule has concluded.</div>
                  </div>
                );
              }

              return (
                <div style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '14px', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '11px', fontWeight: '800' }}>
                    <span style={{ color: '#94a3b8' }}>Exam Progress</span>
                    <span style={{ color: progress.color }}>{`${progress.progressPct.toFixed(0)}%`}</span>
                  </div>

                  {/* Progress Bar Container */}
                  <div style={{ width: '100%', height: '12px', background: 'rgba(255, 255, 255, 0.12)', borderRadius: '9999px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                    <div style={{
                      width: `${progress.progressPct}%`,
                      height: '100%',
                      background: progress.color === '#ef4444' ? 'linear-gradient(90deg, #f97316, #ef4444)' : progress.color === '#f97316' ? 'linear-gradient(90deg, #eab308, #f97316)' : progress.color === '#eab308' ? 'linear-gradient(90deg, #84cc16, #eab308)' : 'linear-gradient(90deg, #22c55e, #4ade80)',
                      borderRadius: '9999px',
                      boxShadow: `0 0 12px ${progress.color}`,
                      transition: 'width 0.4s ease, background 0.4s ease'
                    }} />
                  </div>

                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#cbd5e1', marginTop: '8px', textAlign: 'center' }}>
                    {progress.remainingText}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 3. STAGE 3: FULLSCREEN MODE WITH FULL BG MOVING BLUE WALLPAPER & GREEN BORDER TIME UP BOX */}
      {clockStage === 'fullscreen' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999999,
          background: '#070b14', color: 'white',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '24px', userSelect: 'none', overflow: 'hidden'
        }}>
          {/* iOS Animated Moving Blurred Blue Live Wallpaper Background across Fullscreen */}
          <div className="ios-live-wallpaper-bg">
            <div className="ios-blob-1" style={{ filter: 'blur(90px)', opacity: 0.85 }} />
            <div className="ios-blob-2" style={{ filter: 'blur(100px)', opacity: 0.75 }} />
          </div>

          {/* Top Right Option to Exit Fullscreen */}
          <button
            onClick={handleExitFullscreenClock}
            style={{
              position: 'fixed', top: '24px', right: '24px', zIndex: 10001,
              padding: '10px 20px', background: 'rgba(255, 255, 255, 0.12)',
              color: 'white', border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '9999px', fontSize: '13px', fontWeight: '800',
              cursor: 'pointer', backdropFilter: 'blur(20px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)', transition: 'all 0.15s ease'
            }}
          >
            ✕ Exit Fullscreen
          </button>

          {/* Fullscreen Time & Content Container */}
          <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Giant Extra-Bold iPhone Digital Time */}
            <div style={{ userSelect: 'none' }}>
              <div className="iphone-time-text" style={{
                fontSize: '185px', fontWeight: '900', color: '#ffffff',
                textShadow: '0 0 80px rgba(56, 189, 248, 0.9), 0 0 30px rgba(56, 189, 248, 0.6), 0 10px 40px rgba(0,0,0,0.7)',
                lineHeight: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'center'
              }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatHHMM(now)}</span>
                <span style={{
                  display: 'inline-block', width: '110px', textAlign: 'left',
                  fontSize: '64px', fontWeight: '800', color: '#38bdf8',
                  fontVariantNumeric: 'tabular-nums', marginLeft: '10px'
                }}>:{formatSS(now)}</span>
                <span style={{
                  display: 'inline-block', width: '80px', textAlign: 'left',
                  fontSize: '48px', fontWeight: '800', color: '#93c5fd', marginLeft: '6px'
                }}>{formatAMPM(now)}</span>
              </div>

              <div style={{
                fontSize: '32px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.9)',
                marginTop: '20px', letterSpacing: '0.5px', textShadow: '0 2px 12px rgba(0,0,0,0.6)'
              }}>
                {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            {/* If exam is set, show progress bar OR Green Border TIME UP! box when finished */}
            {(() => {
              const progress = calculateExamProgress();
              if (!progress.active) return null;

              if (progress.status === 'completed') {
                return (
                  <div style={{
                    marginTop: '36px', width: '480px', maxWidth: '85vw',
                    background: 'rgba(34, 197, 94, 0.15)', backdropFilter: 'blur(30px)',
                    padding: '20px 24px', borderRadius: '24px',
                    border: '2px solid #22c55e', boxShadow: '0 0 35px rgba(34, 197, 94, 0.4)',
                    textAlign: 'center'
                  }}>
                    <div className="time-up-pulsate" style={{ fontSize: '36px' }}>🚨 TIME UP!</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#86efac', marginTop: '6px' }}>
                      Exam schedule ({examStartTime} - {examEndTime}) has concluded.
                    </div>
                  </div>
                );
              }

              return (
                <div style={{
                  marginTop: '36px', width: '500px', maxWidth: '85vw',
                  background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(30px)',
                  padding: '20px 24px', borderRadius: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '14px', fontWeight: '800' }}>
                    <span style={{ color: '#94a3b8' }}>Exam Progress</span>
                    <span style={{ color: progress.color }}>{progress.progressPct.toFixed(0)}%</span>
                  </div>

                  <div style={{ width: '100%', height: '14px', background: 'rgba(255, 255, 255, 0.12)', borderRadius: '9999px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{
                      width: `${progress.progressPct}%`,
                      height: '100%',
                      background: progress.color === '#ef4444' ? 'linear-gradient(90deg, #f97316, #ef4444)' : progress.color === '#f97316' ? 'linear-gradient(90deg, #eab308, #f97316)' : progress.color === '#eab308' ? 'linear-gradient(90deg, #84cc16, #eab308)' : 'linear-gradient(90deg, #22c55e, #4ade80)',
                      borderRadius: '9999px',
                      boxShadow: `0 0 16px ${progress.color}`,
                      transition: 'width 0.4s ease'
                    }} />
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', marginTop: '12px', textAlign: 'center' }}>
                    ⏱ {progress.remainingText} (Schedule: {examStartTime} - {examEndTime})
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Highly Aesthetic Mobile Connection & QR Modal */}
      {mobileModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', zIndex: 4000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '75px', paddingBottom: '24px', overflowY: 'auto', boxSizing: 'border-box' }}>
          <div style={{ background: '#0f172a', color: 'white', borderRadius: '28px', padding: '30px', width: '420px', maxWidth: '92vw', border: '1px solid rgba(56, 189, 248, 0.25)', boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(56, 189, 248, 0.15)', position: 'relative', textAlign: 'center', maxHeight: 'calc(100vh - 95px)', overflowY: 'auto' }}>
            <button onClick={() => setMobileModalOpen(false)} style={{ position: 'absolute', top: '18px', right: '18px', background: 'rgba(255,255,255,0.1)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

            <div style={{ fontSize: '32px', marginBottom: '4px' }}>📲</div>
            <h3 style={{ margin: '0 0 4px', fontSize: '22px', color: '#38bdf8', fontWeight: '900' }}>Mobile Connection</h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#94a3b8' }}>Scan QR Code on your mobile phone to send photos directly to the whiteboard!</p>

            {/* Active Session Timer Pill */}
            <div style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '6px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', marginBottom: '14px' }}>
              ⏱️ Active 5-Minute Window: <span style={{ color: '#4ade80', fontSize: '13px' }}>{formatMMSS(mobileTimeLeft)}</span> remaining
            </div>

            {/* Glowing Aesthetic QR Code Display */}
            <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '16px', borderRadius: '20px', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'inline-block', boxShadow: '0 0 30px rgba(56, 189, 248, 0.2)', marginBottom: '16px' }}>
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code" style={{ width: '220px', height: '220px', borderRadius: '12px', background: 'white', padding: '6px', display: 'block' }} />
              ) : (
                <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>Generating QR Code...</div>
              )}
            </div>

            {/* Status Pill */}
            <div style={{ fontSize: '12px', fontWeight: '800', color: isConnected ? '#4ade80' : '#facc15', background: isConnected ? 'rgba(74, 222, 128, 0.12)' : 'rgba(250, 204, 21, 0.12)', padding: '6px 14px', borderRadius: '20px', border: isConnected ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(250, 204, 21, 0.3)', display: 'inline-block', marginBottom: '16px' }}>
              {isConnected ? '🟢 Mobile Device Connected!' : '🔴 Waiting for Mobile Device Scan...'}
            </div>

            {/* Computer Host / IP Input */}
            <div style={{ marginBottom: '16px', textAlign: 'left', background: 'rgba(30, 41, 59, 0.6)', padding: '10px 14px', borderRadius: '12px', border: '1px solid #334155' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Host Domain / Local IP</label>
              <input
                type="text"
                value={customHost}
                onChange={(e) => { setCustomHost(e.target.value); updateQrLink(currentSessionToken, e.target.value); }}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#38bdf8', fontSize: '12px', fontWeight: '800', outline: 'none', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                  ? "💡 If testing on local Wi-Fi, change 'localhost' to your PC's IP (e.g. 192.168.1.5:5175)."
                  : "🟢 Auto-configured for live site access."}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { navigator.clipboard.writeText(mobileLink); showNotification("Copied Mobile Link!"); }}
                style={{ flex: 1, padding: '10px', background: '#1e293b', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
              >
                📋 Copy URL
              </button>
              <button
                onClick={handleDisconnectMobileSession}
                style={{ flex: 1, padding: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
              >
                🔴 Disconnect Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Auth Modal */}
      {authModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(10px)', zIndex: 3500, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '75px', paddingBottom: '24px', overflowY: 'auto', boxSizing: 'border-box' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '380px', maxWidth: '92vw', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative', textAlign: 'left', maxHeight: 'calc(100vh - 95px)', overflowY: 'auto' }}>
            <button onClick={() => setAuthModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: '#94a3b8' }}>✕</button>

            <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #f1f5f9', marginBottom: '20px' }}>
              <button
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: 'none', borderBottom: authMode === 'login' ? '2.5px solid #3b82f6' : 'none', color: authMode === 'login' ? '#3b82f6' : '#64748b', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: 'none', borderBottom: authMode === 'register' ? '2.5px solid #3b82f6' : 'none', color: authMode === 'register' ? '#3b82f6' : '#64748b', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', marginBottom: '14px' }}>
                ⚠️ {authError}
              </div>
            )}

            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {authMode === 'register' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Full Name</label>
                  <input type="text" placeholder="e.g. Abijith" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Email Address</label>
                <input type="email" placeholder="student@school.com" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Password</label>
                <input type="password" placeholder="••••••••" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <button type="submit" style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '6px', boxShadow: '0 4px 14px rgba(59,130,246,0.4)' }}>
                {authMode === 'login' ? 'Sign In to ViewBoard' : 'Create My Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Save Board Progress Modal */}
      {saveBoardModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(10px)', zIndex: 3500, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '75px', paddingBottom: '24px', overflowY: 'auto', boxSizing: 'border-box' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '24px', width: '380px', maxWidth: '92vw', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative', textAlign: 'left', maxHeight: 'calc(100vh - 95px)', overflowY: 'auto' }}>
            <button onClick={() => setSaveBoardModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: '#94a3b8' }}>✕</button>

            <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: '#1e293b', fontWeight: '800' }}>💾 Save Whiteboard Progress</h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b' }}>Save your drawings, equations, and images to return to anytime!</p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Board Title</label>
              <input type="text" placeholder="e.g. Physics Chapter 4 Notes" value={boardTitleInput} onChange={e => setBoardTitleInput(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} autoFocus />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setSaveBoardModalOpen(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleSaveBoard(boardTitleInput)} style={{ flex: 1.5, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>Save Progress</button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Boards Library Modal */}
      {savedBoardsModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(10px)', zIndex: 3500, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '75px', paddingBottom: '24px', overflowY: 'auto', boxSizing: 'border-box' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '24px', width: '560px', maxWidth: '92vw', maxHeight: 'calc(100vh - 95px)', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative', textAlign: 'left' }}>
            <button onClick={() => setSavedBoardsModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: '#94a3b8' }}>✕</button>

            <div style={{ marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#1e293b', fontWeight: '800' }}>📂 My Saved Boards Library</h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Load or manage your saved whiteboard sessions ({savedBoards.length} total)</p>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <input type="text" placeholder="🔍 Search saved boards..." value={searchBoardQuery} onChange={e => setSearchBoardQuery(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }} />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {savedBoards.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>📂</div>
                  <div style={{ fontSize: '14px', fontWeight: '700' }}>No saved boards yet!</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>Click the 💾 Save button anytime to store your work.</div>
                </div>
              ) : (
                savedBoards
                  .filter(b => b.title.toLowerCase().includes(searchBoardQuery.toLowerCase()))
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleLoadBoard(item)}
                      style={{ padding: '12px 14px', borderRadius: '14px', border: activeBoardId === item.id ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: activeBoardId === item.id ? '#f0f9ff' : '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                          {item.title} {activeBoardId === item.id && <span style={{ fontSize: '10px', background: '#3b82f6', color: 'white', padding: '2px 6px', borderRadius: '6px', marginLeft: '6px' }}>Active</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          🕒 Saved: {item.updatedAt}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={(e) => { e.stopPropagation(); handleLoadBoard(item); }} style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>📂 Load</button>
                        <button onClick={(e) => handleDuplicateBoard(item, e)} style={{ padding: '6px 10px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>📋 Copy</button>
                        <button onClick={(e) => handleDeleteBoard(item.id, e)} style={{ padding: '6px 8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>🗑️</button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ViewBoard() {
  const isMobileCam = window.location.search.includes('mobileCam=true');

  if (isMobileCam) {
    return <MobilePhotoUploadView />;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh' }}>
      <Tldraw>
        <ConversionToolbar />
      </Tldraw>
    </div>
  );
}
