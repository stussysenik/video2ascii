"use client";

import { useEffect, forwardRef, useImperativeHandle } from "react";
import { useVideoToAscii } from "@/hooks/useVideoToAscii";
import { useAsciiMouseEffect } from "@/hooks/useAsciiMouseEffect";
import { useAsciiRipple } from "@/hooks/useAsciiRipple";
import { useAsciiAudio } from "@/hooks/useAsciiAudio";
import { type VideoToAsciiProps } from "@/lib/webgl";

export type { VideoToAsciiProps };

// Component Implementation
export const Video2Ascii = forwardRef<
  { videoRef: React.RefObject<HTMLVideoElement> },
  VideoToAsciiProps
>(function Video2Ascii(
  {
    src,
    numColumns,
    colored = true,
    blend = 0,
    highlight = 0,
    brightness = 1.0,
    charset = "standard",
    enableMouse = true,
    trailLength = 24,
    enableRipple = false,
    rippleSpeed = 40,
    audioEffect = 0,
    audioRange = 50,
    isPlaying = true,
    autoPlay = true,
    enableSpacebarToggle = false,
    showStats = false,
    className = "",
    style,
    maxWidth,
  },
  ref
) {
  console.log("[Video2Ascii] Component rendering with props:", {
    src,
    numColumns,
    isPlaying,
    autoPlay,
    maxWidth,
    style,
  });

  // Core hook handles WebGL setup and rendering
  const ascii = useVideoToAscii({
    numColumns,
    colored,
    blend,
    highlight,
    brightness,
    charset,
    enableSpacebarToggle,
    maxWidth,
  });

  // Destructure to avoid linter issues with accessing refs
  const { containerRef, videoRef, canvasRef, stats, dimensions, isReady } =
    ascii;

  // Expose video ref to parent
  useImperativeHandle(ref, () => ({
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
  }));

  console.log("[Video2Ascii] Hook state:", {
    isReady,
    hasVideoRef: !!videoRef.current,
    hasCanvasRef: !!canvasRef.current,
  });

  // Feature hooks - always call them (React rules), enable/disable via options
  const mouseHandlers = useAsciiMouseEffect(ascii, {
    enabled: enableMouse,
    trailLength,
  });

  const rippleHandlers = useAsciiRipple(ascii, {
    enabled: enableRipple,
    speed: rippleSpeed,
  });

  useAsciiAudio(ascii, {
    enabled: audioEffect > 0,
    reactivity: audioEffect,
    sensitivity: audioRange,
  });

  // Control video playback based on isPlaying prop
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      // Video ref might be null initially
      return;
    }

    console.log(
      "[Video2Ascii] Playback effect triggered. isPlaying:",
      isPlaying,
      "autoPlay:",
      autoPlay,
      "isReady:",
      isReady
    );

    if (isPlaying) {
      if (autoPlay && isReady) {
        console.log("[Video2Ascii] Attempting to play video...");
        video.play().then(() => {
          console.log("[Video2Ascii] Video playing successfully.");
        })
          .catch((e) => {
            console.error("[Video2Ascii] Auto-play failed:", e);
          });
      }
    } else {
      console.log("[Video2Ascii] Pausing video.");
      video.pause();
    }
  }, [isPlaying, autoPlay, isReady, videoRef]);

  return (
    <div className={`video-to-ascii ${className}`} style={style}>
      {/* Hidden video element - feeds frames to WebGL */}
      <video
        ref={videoRef}
        src={src}
        muted={audioEffect === 0}
        loop
        playsInline
        crossOrigin="anonymous"
        style={{ display: "none" }}
      />

      {/* Interactive container */}
      <div
        ref={containerRef}
        className="relative cursor-pointer select-none overflow-hidden rounded bg-black"
        {...(enableMouse ? mouseHandlers : {})}
        {...(enableRipple ? rippleHandlers : {})}
      >
        {/* WebGL canvas - all ASCII rendering happens here */}
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />

        {/* Stats overlay */}
        {showStats && isReady && (
          <div className="absolute top-2 left-2 bg-black/70 text-green-400 px-2 py-1 text-xs font-mono rounded">
            {stats.fps} FPS | {stats.frameTime.toFixed(2)}ms | {dimensions.cols}
            ×{dimensions.rows}
          </div>
        )}
      </div>
    </div>
  );
});

export default Video2Ascii;
