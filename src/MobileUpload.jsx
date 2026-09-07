import React, { useState, useRef } from 'react';

export default function MobileUpload() {
  const params = new URLSearchParams(window.location.search);
  const sessionToken = params.get('session');
  const fileInputRef = useRef(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [photoSent, setPhotoSent] = useState(false);
  const [statusMsg, setStatusMsg] = useState('🟢 Mobile Companion Ready');

  const handleFileSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const srcDataUrl = evt.target.result;
      
      // Optimize image resolution (max 1600px) for ultra-fast 10ms transfer while preserving full picture aspect ratio!
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        const maxDim = 1600;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const fastDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setSelectedPhotoUrl(fastDataUrl);
      };
      img.src = srcDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const sendPhotoToBoard = async () => {
    if (!selectedPhotoUrl) return;
    setIsSending(true);

    try {
      const resp = await fetch('/api/mobile-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: sessionToken, dataUrl: selectedPhotoUrl })
      });

      if (resp.ok) {
        setPhotoSent(true);
        setSelectedPhotoUrl(null);
        setSelectedFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => setPhotoSent(false), 2500);
      } else {
        alert("⚠️ Failed to upload photo to whiteboard server.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("⚠️ Network error. Make sure your phone is connected to the same Wi-Fi!");
    } finally {
      setIsSending(false);
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
      <div style={{ background: 'rgba(30, 41, 59, 0.9)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        
        <div style={{ fontSize: '44px', marginBottom: '4px' }}>📱</div>
        <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '900', color: '#38bdf8' }}>
          ViewBoard Mobile Share
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#94a3b8' }}>
          Select any photo from your phone to instantly display it on the whiteboard!
        </p>

        <div style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', color: '#4ade80', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: '700', display: 'inline-block', marginBottom: '20px' }}>
          {statusMsg}
        </div>

        {/* Hidden File Input */}
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          style={{ display: 'none' }} 
        />

        {/* Photo Selection Dropzone */}
        {selectedPhotoUrl ? (
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <img 
              src={selectedPhotoUrl} 
              alt="Selected" 
              style={{ width: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: '16px', border: '2px solid #38bdf8', background: '#000', padding: '4px' }} 
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
              padding: '40px 20px', borderRadius: '20px', border: '2px dashed rgba(56, 189, 248, 0.5)',
              background: 'rgba(15, 23, 42, 0.5)', cursor: 'pointer', marginBottom: '20px',
              transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}
          >
            <div style={{ fontSize: '42px', marginBottom: '8px' }}>🖼️</div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#38bdf8' }}>Choose Photo from Phone</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Tap to select from Photo Gallery or Camera Roll</div>
          </div>
        )}

        {photoSent && (
          <div style={{ padding: '14px', background: '#10b981', color: 'white', borderRadius: '14px', fontSize: '15px', fontWeight: '800', marginBottom: '16px', boxShadow: '0 10px 25px rgba(16,185,129,0.4)' }}>
            ⚡ Photo Sent to Whiteboard!
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
