import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom/client";
import Video2Ascii from "./src/index";

// --- Draggable Hook ---
const useDraggable = (initialPosition = { x: 0, y: 0 }) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return { position, handleMouseDown, isDragging };
};

// --- Main Demo App ---
const DemoApp = () => {
  const [videoSrc, setVideoSrc] = useState("/born.mp4");
  const [inputUrl, setInputUrl] = useState("");

  // Window State
  const { position, handleMouseDown, isDragging } = useDraggable({ x: 100, y: 50 });

  // Resize State
  const [size, setSize] = useState({ width: 640, height: 400 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const handleResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: size.width,
      h: size.height
    };
  };

  useEffect(() => {
    const handleResizeMove = (e) => {
      if (!isResizing) return;
      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;
      setSize({
        width: Math.max(300, resizeStartRef.current.w + dx),
        height: Math.max(200, resizeStartRef.current.h + dy)
      });
    };

    const handleResizeUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", handleResizeUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeUp);
    };
  }, [isResizing]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
    }
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (inputUrl) setVideoSrc(inputUrl);
  };

  // Video State & Ref
  const asciiRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Sync timeline
  useEffect(() => {
    const checkVideo = setInterval(() => {
      // Access the exposed videoRef from the component handle
      const video = asciiRef.current?.videoRef?.current;
      if (video) {
        if (!isNaN(video.duration)) setDuration(video.duration);
        setCurrentTime(video.currentTime);

        // Also sync playing state if video pauses/plays externally
        if (!video.paused !== isPlaying) {
          // Optional: setIsPlaying(!video.paused);
        }
      }
    }, 100); // Poll every 100ms
    return () => clearInterval(checkVideo);
  }, [isPlaying]);

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    const video = asciiRef.current?.videoRef?.current;
    if (video) {
      video.currentTime = time;
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#111", overflow: "hidden" }}>

      {/* Controls Panel (Fixed) */}
      <div style={{
        position: "absolute",
        top: 20,
        left: 20,
        padding: "15px",
        background: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        borderRadius: "8px",
        color: "white",
        zIndex: 10,
        fontFamily: "monospace",
        width: "300px"
      }}>
        <h3 style={{ margin: "0 0 10px 0" }}>Control Panel</h3>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>Local File:</label>
          <input type="file" accept="video/*" onChange={handleFileChange} style={{ width: "100%" }} />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>Or URL:</label>
          <form onSubmit={handleUrlSubmit} style={{ display: "flex", gap: "5px" }}>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="/born.mp4"
              style={{ flex: 1, padding: "4px", borderRadius: "4px", border: "none" }}
            />
            <button type="submit" style={{ cursor: "pointer", padding: "4px 8px", background: "#4CAF50", border: "none", color: "white", borderRadius: "4px" }}>Go</button>
          </form>
        </div>
      </div>

      {/* Draggable & Resizable Player Window */}
      <div style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: size.width + "px",
        height: size.height + "px",
        background: "#000",
        border: "1px solid #333",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        cursor: isDragging ? "grabbing" : "default"
      }}>
        {/* Title Bar / Handle */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            padding: "8px 12px",
            background: "#222",
            borderBottom: "1px solid #333",
            color: "#aaa",
            fontSize: "12px",
            fontFamily: "monospace",
            cursor: "grab",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            userSelect: "none",
            borderRadius: "8px 8px 0 0",
            flexShrink: 0
          }}
        >
          <span>ASCII Player [{videoSrc.split('/').pop()}]</span>
          <button
            onClick={togglePlay}
            onMouseDown={(e) => e.stopPropagation()} // Prevent drag
            style={{
              background: "transparent",
              border: "1px solid #555",
              color: "#ddd",
              cursor: "pointer",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "10px"
            }}
          >
            {isPlaying ? "PAUSE" : "PLAY"}
          </button>
        </div>

        {/* Video Content */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "black" }}>
          <Video2Ascii
            ref={asciiRef}
            key={videoSrc} // Force remount on source change
            src={videoSrc}
            numColumns={120}
            colored={true}
            brightness={1.0}
            audioEffect={50}
            enableMouse={true}
            enableRipple={true}
            charset="detailed"
            isPlaying={isPlaying}
            autoPlay={true}
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        {/* Timeline Scrubber */}
        <div style={{
          height: "24px",
          background: "#222",
          borderTop: "1px solid #333",
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          flexShrink: 0
        }}>
          <span style={{ color: "#666", fontSize: "10px", minWidth: "30px" }}>
            {Math.floor(currentTime)}s
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            onMouseDown={(e) => e.stopPropagation()} // Prevent drag
            style={{
              flex: 1,
              margin: "0 10px",
              height: "4px",
              accentColor: "#4CAF50",
              cursor: "pointer"
            }}
          />
          <span style={{ color: "#666", fontSize: "10px", minWidth: "30px", textAlign: "right" }}>
            {Math.floor(duration)}s
          </span>
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: "20px",
            height: "20px",
            background: "linear-gradient(135deg, transparent 50%, #666 50%)",
            cursor: "nwse-resize",
            zIndex: 20
          }}
        />
      </div>

      <div style={{ position: "absolute", bottom: 20, right: 20, color: "#444", fontFamily: "monospace", fontSize: "12px" }}>
        React Video2Ascii Demo
      </div>
    </div>
  );
};

// Mount
const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <DemoApp />
    </React.StrictMode>
  );
}
