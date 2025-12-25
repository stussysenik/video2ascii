# Component Hierarchy Documentation

## Table of Contents
- [Overview](#overview)
- [Component Tree](#component-tree)
- [Component Details](#component-details)
- [Prop Flow](#prop-flow)
- [Component Lifecycle](#component-lifecycle)
- [Ref Management](#ref-management)
- [Component Communication](#component-communication)
- [Best Practices](#best-practices)

---

## Overview

Video2ASCII uses a **shallow component hierarchy** with a single main component that orchestrates multiple custom hooks. This design minimizes component depth and maximizes performance by avoiding unnecessary re-renders.

### Architecture Philosophy

```
Shallow Hierarchy (Preferred)
┌─────────────────────────────┐
│   Video2Ascii Component    │  ← Single React component
│   ├─ useVideoToAscii      │  ← Core logic in hooks
│   ├─ useAsciiMouseEffect  │  ← Feature modules
│   ├─ useAsciiRipple      │  ← Feature modules
│   └─ useAsciiAudio       │  ← Feature modules
└─────────────────────────────┘

vs.

Deep Hierarchy (Avoided)
┌─────────────────────────────┐
│   Video2Ascii Component    │
│   └─ VideoContainer       │  ← Unnecessary nesting
│       ├─ VideoSource       │  ← Adds re-render overhead
│       ├─ WebGLCanvas      │  ← Prop drilling
│       │   └─ Canvas       │  ← Complex to manage
│       └─ EffectsLayer     │  ← Hard to coordinate
│           ├─ MouseEffect  │  ← Separate render cycles
│           ├─ AudioEffect  │  ← Synchronization issues
│           └─ RippleEffect │  ← Performance bottleneck
└─────────────────────────────┘
```

### Why This Design?

| Aspect | Shallow (Our Design) | Deep (Alternative) |
|--------|---------------------|-------------------|
| **Re-render Performance** | Excellent (single component) | Poor (multiple components re-render) |
| **Prop Drilling** | None (hooks share context) | Significant (props passed through tree) |
| **State Management** | Centralized in hooks | Distributed across components |
| **Debugging** | Simple (trace through hooks) | Complex (trace component tree) |
| **Performance** | ~60 FPS | ~30-40 FPS (component overhead) |
| **Maintainability** | High (modules are hooks) | Medium (components need coordination) |

---

## Component Tree

### Visual Component Hierarchy

```
Application (Parent)
│
└─► Video2Ascii (Root Component)
    │
    │   ┌──────────────────────────────────────────────────────┐
    │   │             Hidden DOM Elements                     │
    │   └──────────────────────────────────────────────────────┘
    │   │
    │   ├─► <video> (hidden)
    │   │   • Ref: videoRef
    │   │   • Props: src, muted, loop, playsInline
    │   │   • Purpose: Source of video frames and audio
    │   │   • Style: display: none
    │   │
    │   └─► Stats Overlay (conditional)
    │       • Ref: None (direct render)
    │       • Props: fps, frameTime, dimensions
    │       • Purpose: Performance monitoring
    │       • Style: absolute positioning
    │
    │   ┌──────────────────────────────────────────────────────┐
    │   │            Interactive Container                     │
    │   └──────────────────────────────────────────────────────┘
    │   │
    │   └─► <div> (container)
    │       • Ref: containerRef
    │       • Props: className, style, event handlers
    │       • Style: overflow: hidden, relative positioning
    │       • Events: onMouseMove, onMouseLeave, onClick
    │
    │       └─► <canvas> (WebGL output)
    │           • Ref: canvasRef
    │           • Props: style (width: 100%, height: 100%)
    │           • Purpose: WebGL rendering surface
    │           • Context: WebGL2
    │
    └─► Hook Composition (Logical Components)
        │
        ├─► useVideoToAscii (Core Hook)
        │   • Manages WebGL initialization
        │   • Handles render loop
        │   • Manages all WebGL resources
        │   • Provides context to features
        │
        ├─► useAsciiMouseEffect (Feature Hook)
        │   • Tracks mouse position
        │   • Maintains trail array
        │   • Updates mouse uniforms
        │
        ├─► useAsciiRipple (Feature Hook)
        │   • Manages active ripples
        │   • Animates ripple expansion
        │   • Updates ripple uniforms
        │
        └─► useAsciiAudio (Feature Hook)
            • Connects to Web Audio API
            • Analyzes frequency data
            • Updates audio uniforms
```

### Component Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARENT APPLICATION                        │
└────────────────────────┬────────────────────────────────────┘
                         │ Props: src, numColumns, etc.
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Video2Ascii Component                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │            RENDERED JSX (Visual Elements)            │  │
│  │                                                        │  │
│  │  <video ref={videoRef} hidden />                         │  │
│  │  <div ref={containerRef} {...eventHandlers}>            │  │
│  │    <canvas ref={canvasRef} />                          │  │
│  │    {showStats && <StatsOverlay />}                        │  │
│  │  </div>                                                │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              HOOK COMPOSITION (Logic)                 │  │
│  │                                                        │  │
│  │  const ascii = useVideoToAscii(options);               │  │
│  │  useAsciiMouseEffect(ascii, mouseOptions);              │  │
│  │  useAsciiRipple(ascii, rippleOptions);                 │  │
│  │  useAsciiAudio(ascii, audioOptions);                    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              REF EXPOSURE (Imperative API)          │  │
│  │                                                        │  │
│  │  useImperativeHandle(ref, () => ({                     │  │
│  │    videoRef,                                             │  │
│  │  }));                                                    │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                         │ Ref: videoRef
                         ▼
              ┌────────────────────────┐
              │  Parent can access  │
              │  video element for   │
              │  advanced control   │
              └────────────────────────┘
```

---

## Component Details

### Video2Ascii Component

**Location**: `src/components/VideoToAscii.tsx`

**Purpose**: The public-facing React component that provides video-to-ASCII conversion with interactive effects.

#### Component Signature

```typescript
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
  // Component implementation
});
```

#### Props Interface

```typescript
export interface VideoToAsciiProps {
  // Required
  src: string;                    // Video URL or path
  
  // Size control
  numColumns?: number;            // Number of ASCII columns (controls resolution)
  maxWidth?: number;             // Maximum width in pixels
  
  // Rendering options
  colored?: boolean;              // Use video colors vs green terminal
  blend?: number;                // Blend factor 0-100 (ASCII ↔ video)
  highlight?: number;            // Background intensity 0-100
  brightness?: number;           // Brightness multiplier (0-2)
  charset?: CharsetKey;          // Character set to use
  
  // Mouse effect
  enableMouse?: boolean;         // Enable mouse cursor glow
  trailLength?: number;         // Length of mouse trail
  
  // Ripple effect
  enableRipple?: boolean;        // Enable click ripples
  rippleSpeed?: number;         // Expansion speed
  
  // Audio effect
  audioEffect?: number;         // Audio reactivity 0-100
  audioRange?: number;          // Audio sensitivity 0-100
  
  // Playback control
  isPlaying?: boolean;          // Whether video is playing
  autoPlay?: boolean;           // Auto-play on load
  enableSpacebarToggle?: boolean;// Enable spacebar play/pause
  
  // UI options
  showStats?: boolean;          // Show FPS overlay
  className?: string;           // CSS class name
  style?: React.CSSProperties; // Inline styles
}
```

#### Internal State

The component uses **no state** for rendering logic. All state is managed by hooks:

```typescript
// State is managed in useVideoToAscii hook
const { 
  containerRef,    // DOM element ref
  videoRef,        // DOM element ref  
  canvasRef,       // DOM element ref
  stats,           // { fps, frameTime } from hook
  dimensions,      // { cols, rows } from hook
  isReady,         // WebGL initialized boolean
} = ascii;        // AsciiContext from useVideoToAscii
```

#### Rendered Elements

```typescript
return (
  <div className={`video-to-ascii ${className}`} style={style}>
    {/* 1. Hidden Video Element - Data Source */}
    <video
      ref={videoRef}
      src={src}
      muted={audioEffect === 0}
      loop
      playsInline
      crossOrigin="anonymous"
      style={{ display: "none" }}
    />

    {/* 2. Interactive Container - Event Handler */}
    <div
      ref={containerRef}
      className="relative cursor-pointer select-none overflow-hidden rounded bg-black"
      {...(enableMouse ? mouseHandlers : {})}
      {...(enableRipple ? rippleHandlers : {})}
    >
      {/* 3. WebGL Canvas - Rendering Surface */}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />

      {/* 4. Stats Overlay (Optional) */}
      {showStats && isReady && (
        <div className="absolute top-2 left-2 bg-black/70 text-green-400 px-2 py-1 text-xs font-mono rounded">
          {stats.fps} FPS | {stats.frameTime.toFixed(2)}ms | {dimensions.cols}
          ×{dimensions.rows}
        </div>
      )}
    </div>
  </div>
);
```

#### Responsibilities

1. **Orchestration**: Combine core hook with feature hooks
2. **Props Processing**: Transform user props into hook options
3. **DOM Rendering**: Render video, container, canvas, and overlay elements
4. **Ref Management**: Create and manage all DOM element refs
5. **Event Handling**: Forward events to container
6. **Lifecycle Management**: Coordinate video playback with WebGL state
7. **API Exposure**: Expose video ref via forwardRef for parent access

---

### useVideoToAscii Hook (Core "Component")

**Location**: `src/hooks/useVideoToAscii.ts`

**Purpose**: Manages all WebGL initialization, rendering, and core state. While not a React component, it functions as the logical core of the system.

#### Hook Signature

```typescript
export function useVideoToAscii(
  options: UseVideoToAsciiOptions = {}
): AsciiContext
```

#### Options Interface

```typescript
export interface UseVideoToAsciiOptions {
  fontSize?: number;                // Character font size in pixels
  numColumns?: number;             // Number of ASCII columns
  colored?: boolean;               // Color mode
  blend?: number;                  // Blend factor 0-100
  highlight?: number;              // Background intensity 0-100
  brightness?: number;             // Brightness multiplier 0-2
  charset?: CharsetKey;            // Character set
  maxWidth?: number;               // Maximum container width
  enableSpacebarToggle?: boolean;  // Keyboard control
  onStats?: (stats: AsciiStats) => void; // Stats callback
}
```

#### Returned Context

```typescript
export interface AsciiContext {
  // DOM Refs
  containerRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  
  // WebGL Refs
  glRef: React.RefObject<WebGL2RenderingContext | null>;
  programRef: React.RefObject<WebGLProgram | null>;
  uniformLocationsRef: React.RefObject<UniformLocations | null>;
  
  // Registration System
  registerUniformSetter: (id: string, setter: UniformSetter) => void;
  unregisterUniformSetter: (id: string) => void;
  
  // State
  dimensions: GridDimensions;      // { cols, rows }
  stats: AsciiStats;             // { fps, frameTime }
  isReady: boolean;              // WebGL initialized
  isPlaying: boolean;            // Video playing
  
  // Control Methods
  play: () => void;
  pause: () => void;
  toggle: () => void;
}
```

#### Internal Architecture

```typescript
function useVideoToAscii(options: UseVideoToAsciiOptions): AsciiContext {
  // ┌─────────────────────────────────────────────────────────┐
  // │  1. REF CREATION (Persistent Memory)               │
  // └─────────────────────────────────────────────────────────┘
  
  // DOM Element Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // WebGL Resource Refs
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const videoTextureRef = useRef<WebGLTexture | null>(null);
  const atlasTextureRef = useRef<WebGLTexture | null>(null);
  
  // Render Loop Ref
  const animationRef = useRef<number>(0);
  
  // Performance Refs
  const frameCountRef = useRef(0);
  const frameTimesRef = useRef<number[]>([]);
  const lastFpsTimeRef = useRef(performance.now());
  
  // Feature Registration System
  const uniformSettersRef = useRef<Map<string, UniformSetter>>(new Map());
  const uniformLocationsRef = useRef<UniformLocations | null>(null);
  
  // ┌─────────────────────────────────────────────────────────┐
  // │  2. REACT STATE (Triggers Re-renders)            │
  // └─────────────────────────────────────────────────────────┘
  
  const [dimensions, setDimensions] = useState({ cols: 80, rows: 24 });
  const [stats, setStats] = useState<AsciiStats>({ fps: 0, frameTime: 0 });
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // ┌─────────────────────────────────────────────────────────┐
  // │  3. INITIALIZATION LOGIC                           │
  // └─────────────────────────────────────────────────────────┘
  
  const initWebGL = useCallback(() => {
    // Calculate grid dimensions
    const grid = calculateGridDimensions(
      video.videoWidth,
      video.videoHeight,
      numColumns
    );
    setDimensions(grid);
    
    // Set canvas size
    canvas.width = grid.cols * charWidth;
    canvas.height = grid.rows * fontSize;
    
    // Get WebGL2 context
    const gl = canvas.getContext("webgl2", {
      antialias: false,
      preserveDrawingBuffer: false,
    });
    glRef.current = gl;
    
    // Compile shaders
    const vertexShader = compileShader(gl, VERTEX_SHADER, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, FRAGMENT_SHADER, gl.FRAGMENT_SHADER);
    
    // Create program
    const program = createProgram(gl, vertexShader, fragmentShader);
    programRef.current = program;
    gl.useProgram(program);
    
    // Create fullscreen quad
    createFullscreenQuad(gl, program);
    
    // Create textures
    videoTextureRef.current = createVideoTexture(gl);
    atlasTextureRef.current = createAsciiAtlas(gl, chars, fontSize);
    
    // Cache uniform locations
    const locations = cacheUniformLocations(gl, program);
    uniformLocationsRef.current = locations;
    
    // Set static uniforms
    gl.uniform2f(locations.u_resolution, pixelWidth, pixelHeight);
    gl.uniform2f(locations.u_charSize, charWidth, fontSize);
    gl.uniform2f(locations.u_gridSize, grid.cols, grid.rows);
    gl.uniform1f(locations.u_numChars, chars.length);
    
    // Mark ready
    setIsReady(true);
  }, [/* dependencies */]);
  
  // ┌─────────────────────────────────────────────────────────┐
  // │  4. RENDER LOOP (60 FPS)                           │
  // └─────────────────────────────────────────────────────────┘
  
  const render = useCallback(() => {
    const gl = glRef.current;
    const video = videoRef.current;
    const program = programRef.current;
    const locations = uniformLocationsRef.current;
    
    if (!gl || !video || !program || !locations || video.paused || video.ended)
      return;
    
    // Upload video frame
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, videoTextureRef.current);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.generateMipmap(gl.TEXTURE_2D);
    
    // Bind atlas
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, atlasTextureRef.current);
    
    // Update dynamic uniforms
    for (const setter of uniformSettersRef.current.values()) {
      setter(gl, program, locations);
    }
    
    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    // Update stats
    const frameEnd = performance.now();
    // ... FPS calculation ...
    
    // Schedule next frame
    animationRef.current = requestAnimationFrame(render);
  }, [/* dependencies */]);
  
  // ┌─────────────────────────────────────────────────────────┐
  // │  5. EVENT HANDLERS                                  │
  // └─────────────────────────────────────────────────────────┘
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleLoadedMetadata = () => initWebGL();
    const handlePlay = () => {
      setIsPlaying(true);
      animationRef.current = requestAnimationFrame(render);
    };
    const handlePause = () => {
      setIsPlaying(false);
      cancelAnimationFrame(animationRef.current);
    };
    
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    
    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      cancelAnimationFrame(animationRef.current);
    };
  }, [initWebGL, render]);
  
  // ┌─────────────────────────────────────────────────────────┐
  // │  6. PUBLIC API                                      │
  // └─────────────────────────────────────────────────────────┘
  
  const play = useCallback(() => videoRef.current?.play(), []);
  const pause = useCallback(() => videoRef.current?.pause(), []);
  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }, []);
  
  // Return context
  return {
    containerRef,
    videoRef,
    canvasRef,
    glRef,
    programRef,
    uniformLocationsRef,
    registerUniformSetter,
    unregisterUniformSetter,
    dimensions,
    stats,
    isReady,
    isPlaying,
    play,
    pause,
    toggle,
  };
}
```

#### Responsibilities

1. **WebGL Initialization**: Set up context, shaders, program, textures
2. **Resource Management**: Create and cleanup all WebGL resources
3. **Render Loop**: Manage requestAnimationFrame cycle
4. **State Synchronization**: Sync video playback with rendering
5. **Performance Monitoring**: Track FPS and frame time
6. **Feature Registration**: Provide mechanism for feature hooks
7. **Grid Calculation**: Determine ASCII grid dimensions
8. **Uniform Management**: Cache and update shader uniforms
9. **Canvas Sizing**: Set appropriate canvas dimensions
10. **Cleanup**: Release all resources on unmount

---

### Feature Hooks (Logical Components)

Feature hooks are **logical components** that provide modular functionality. They're not React components but follow the hook pattern and integrate with the core hook.

#### useAsciiMouseEffect

**Location**: `src/hooks/useAsciiMouseEffect.ts`

**Purpose**: Creates a glowing cursor effect with trailing animation when mouse moves over the canvas.

**Hook Signature**:
```typescript
export function useAsciiMouseEffect(
  ascii: AsciiContext,
  options: UseAsciiMouseEffectOptions = {}
): MouseEffectHandlers
```

**Options**:
```typescript
export interface UseAsciiMouseEffectOptions {
  enabled?: boolean;      // Enable/disable effect
  trailLength?: number;    // Length of trail (1-24)
}
```

**Returns**:
```typescript
export interface MouseEffectHandlers {
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
}
```

**Implementation**:
```typescript
function useAsciiMouseEffect(ascii, options): MouseEffectHandlers {
  const { enabled = true, trailLength = 24 } = options;
  
  // Refs for mouse state
  const mouseRef = useRef<MousePosition>({ x: -1, y: -1 });
  const trailRef = useRef<MousePosition[]>([]);
  const enabledRef = useRef(enabled);
  const trailLengthRef = useRef(trailLength);
  
  // Keep refs fresh
  useEffect(() => {
    enabledRef.current = enabled;
    trailLengthRef.current = trailLength;
  }, [enabled, trailLength]);
  
  // Register uniform setter
  useEffect(() => {
    if (!enabled) return;
    
    const setter = (gl, _program, locations) => {
      // Update mouse position
      gl.uniform2f(locations.u_mouse, mouseRef.current.x, mouseRef.current.y);
      
      // Update trail
      gl.uniform1i(locations.u_trailLength, trailRef.current.length);
      for (let i = 0; i < MAX_TRAIL_LENGTH; i++) {
        const loc = locations.u_trail[i];
        if (loc) {
          const pos = trailRef.current[i] || { x: -1, y: -1 };
          gl.uniform2f(loc, pos.x, pos.y);
        }
      }
    };
    
    ascii.registerUniformSetter("mouse", setter);
    
    return () => ascii.unregisterUniformSetter("mouse");
  }, [ascii, enabled]);
  
  // Event handlers
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabledRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const newPos = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
    
    // Update trail
    if (mouseRef.current.x >= 0) {
      trailRef.current.unshift({ ...mouseRef.current });
      if (trailRef.current.length > trailLengthRef.current) {
        trailRef.current.pop();
      }
    }
    
    mouseRef.current = newPos;
  }, []);
  
  const onMouseLeave = useCallback(() => {
    mouseRef.current = { x: -1, y: -1 };
    trailRef.current = [];
  }, []);
  
  return { onMouseMove, onMouseLeave };
}
```

**Responsibilities**:
- Track mouse position in normalized coordinates
- Maintain trail of previous positions
- Register uniform setter for shader updates
- Handle mouse move and leave events
- Update GPU uniforms with mouse data

---

#### useAsciiRipple

**Location**: `src/hooks/useAsciiRipple.ts`

**Purpose**: Creates expanding ring ripples when user clicks on the canvas.

**Hook Signature**:
```typescript
export function useAsciiRipple(
  ascii: AsciiContext,
  options: UseAsciiRippleOptions = {}
): RippleHandlers
```

**Options**:
```typescript
export interface UseAsciiRippleOptions {
  enabled?: boolean;      // Enable/disable effect
  speed?: number;        // Expansion speed
}
```

**Returns**:
```typescript
export interface RippleHandlers {
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}
```

**Implementation Structure**:
```typescript
function useAsciiRipple(ascii, options): RippleHandlers {
  const { enabled = false, speed = 40 } = options;
  
  // Refs for ripple state
  const ripplesRef = useRef<Ripple[]>([]);
  const enabledRef = useRef(enabled);
  const speedRef = useRef(speed);
  
  // Register uniform setter
  useEffect(() => {
    if (!enabled) return;
    
    const setter = (gl, _program, locations) => {
      const currentTime = performance.now() / 1000;
      
      gl.uniform1f(locations.u_time, currentTime);
      gl.uniform1f(locations.u_rippleEnabled, 1.0);
      gl.uniform1f(locations.u_rippleSpeed, speedRef.current);
      
      // Remove old ripples
      const maxDist = Math.sqrt(ascii.dimensions.cols ** 2 + ascii.dimensions.rows ** 2);
      const maxLifetime = maxDist / speedRef.current + 1.0;
      ripplesRef.current = ripplesRef.current.filter(
        (r) => currentTime - r.startTime < maxLifetime
      );
      
      // Upload ripples
      for (let i = 0; i < MAX_RIPPLES; i++) {
        const loc = locations.u_ripples[i];
        if (loc) {
          const ripple = ripplesRef.current[i];
          if (ripple) {
            gl.uniform4f(loc, ripple.x, ripple.y, ripple.startTime, 1.0);
          } else {
            gl.uniform4f(loc, 0, 0, 0, 0.0);
          }
        }
      }
    };
    
    ascii.registerUniformSetter("ripple", setter);
    
    return () => ascii.unregisterUniformSetter("ripple");
  }, [ascii, enabled]);
  
  // Click handler
  const onClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabledRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    ripplesRef.current.unshift({
      x,
      y,
      startTime: performance.now() / 1000,
    });
    
    if (ripplesRef.current.length > MAX_RIPPLES) {
      ripplesRef.current.pop();
    }
  }, []);
  
  return { onClick };
}
```

**Responsibilities**:
- Maintain array of active ripples
- Spawn new ripples on click
- Animate ripple expansion (via time uniform)
- Remove expired ripples
- Register uniform setter for shader updates
- Handle click events

---

#### useAsciiAudio

**Location**: `src/hooks/useAsciiAudio.ts`

**Purpose**: Makes ASCII characters react to audio levels in the video.

**Hook Signature**:
```typescript
export function useAsciiAudio(
  ascii: AsciiContext,
  options: UseAsciiAudioOptions = {}
): void
```

**Options**:
```typescript
export interface UseAsciiAudioOptions {
  enabled?: boolean;      // Enable/disable effect
  reactivity?: number;    // Audio reactivity 0-100
  sensitivity?: number;   // Audio sensitivity 0-100
}
```

**Returns**: `void` (no handlers, only uniform updates)

**Implementation Structure**:
```typescript
function useAsciiAudio(ascii, options): void {
  const { enabled = false, reactivity = 50, sensitivity = 50 } = options;
  
  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const volumeRef = useRef(0);
  
  // Register uniform setter
  useEffect(() => {
    if (!enabled) return;
    
    const setter = (gl, _program, locations) => {
      updateVolume();
      
      gl.uniform1f(locations.u_audioLevel, volumeRef.current);
      gl.uniform1f(locations.u_audioReactivity, reactivityRef.current / 100);
      gl.uniform1f(locations.u_audioSensitivity, sensitivityRef.current / 100);
    };
    
    ascii.registerUniformSetter("audio", setter);
    
    return () => ascii.unregisterUniformSetter("audio");
  }, [ascii, enabled]);
  
  // Connect audio
  useEffect(() => {
    if (!enabled) return;
    
    const video = ascii.videoRef.current;
    if (!video) return;
    
    const connectAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const ctx = audioContextRef.current;
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.8;
      analyzerRef.current = analyzer;
      
      dataArrayRef.current = new Uint8Array(analyzer.frequencyBinCount);
      
      const source = ctx.createMediaElementSource(video);
      source.connect(analyzer);
      analyzer.connect(ctx.destination);
      sourceRef.current = source;
      
      ctx.resume();
    };
    
    video.addEventListener("play", connectAudio);
    
    return () => video.removeEventListener("play", connectAudio);
  }, [ascii.videoRef, enabled]);
  
  return undefined;
}
```

**Responsibilities**:
- Connect to Web Audio API
- Create audio analysis graph
- Extract frequency data each frame
- Calculate average volume
- Smooth volume values
- Register uniform setter for shader updates
- Manage audio context lifecycle

---

## Prop Flow

### High-Level Prop Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARENT APPLICATION                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ All props passed down
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Video2Ascii Component                       │
│                                                             │
│  Props Received:                                             │
│  • src, numColumns, colored, blend, highlight, brightness   │
│  • charset, enableMouse, trailLength, enableRipple, etc.    │
│                                                             │
│  Prop Processing:                                             │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  1. Transform props for core hook                  │  │
│  │  • src: Used by video element (not passed to hook)   │  │
│  │  • numColumns: Passed to useVideoToAscii            │  │
│  │  • colored, blend, etc.: Passed to useVideoToAscii  │  │
│  │  • isPlaying: Manually synced with video.play/pause  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  2. Transform props for feature hooks               │  │
│  │  • enableMouse + trailLength → useAsciiMouseEffect    │  │
│  │  • enableRipple + rippleSpeed → useAsciiRipple       │  │
│  │  • audioEffect + audioRange → useAsciiAudio           │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Core Hook   │  │ Mouse Hook   │  │ Audio Hook   │
│              │  │              │  │              │
│ Receives:     │  │ Receives:     │  │ Receives:     │
│ • numColumns  │  │ • enabled    │  │ • enabled    │
│ • colored     │  │ • trailLength│  │ • reactivity│
│ • blend       │  │              │  │ • sensitivity│
│ • brightness  │  │              │  │              │
│ • charset     │  │              │  │              │
│              │  │              │  │              │
│ Uses props to:│  │ Uses props to:│  │ Uses props to:│
│ • Calculate   │  │ • Configure  │  │ • Configure  │
│   grid size   │  │   effect     │  │   effect     │
│ • Set shader  │  │ • Determine  │  │ • Set audio   │
│   uniforms    │  │   behavior   │  │   parameters│
└──────────────┘  └──────────────┘  └──────────────┘
```

### Detailed Prop Flow Diagram

```
Parent Component
    │
    │ Props:
    │ {
    │   src: "/video.mp4",
    │   numColumns: 120,
    │   colored: true,
    │   blend: 0,
    │   highlight: 20,
    │   brightness: 1.2,
    │   charset: "detailed",
    │   enableMouse: true,
    │   trailLength: 24,
    │   enableRipple: true,
    │   rippleSpeed: 40,
    │   audioEffect: 50,
    │   audioRange: 75,
    │   isPlaying: true,
    │   autoPlay: true,
    │   showStats: true,
    │ }
    │
    ▼
Video2Ascii Component
    │
    │ 1. Extract and categorize props
    │
    ├─► src: Used directly in JSX
    │   <video src={src} />
    │
    ├─► Core props: Passed to useVideoToAscii
    │   useVideoToAscii({
    │     numColumns,
    │     colored,
    │     blend,
    │     highlight,
    │     brightness,
    │     charset,
    │     maxWidth,
    │     enableSpacebarToggle,
    │   })
    │
    ├─► Mouse props: Passed to useAsciiMouseEffect
    │   useAsciiMouseEffect(ascii, {
    │     enabled: enableMouse,
    │     trailLength,
    │   })
    │
    ├─► Ripple props: Passed to useAsciiRipple
    │   useAsciiRipple(ascii, {
    │     enabled: enableRipple,
    │     speed: rippleSpeed,
    │   })
    │
    ├─► Audio props: Passed to useAsciiAudio
    │   useAsciiAudio(ascii, {
    │     enabled: audioEffect > 0,
    │     reactivity: audioEffect,
    │     sensitivity: audioRange,
    │   })
    │
    ├─► Playback props: Handled manually
    │   useEffect(() => {
    │     const video = videoRef.current;
    │     if (isPlaying) {
    │       video.play().catch(e => console.error(e));
    │     } else {
    │       video.pause();
    │     }
    │   }, [isPlaying, videoRef]);
    │
    └─► UI props: Used in JSX
        <div className={className} style={style}>
        <canvas />
        {showStats && <StatsOverlay />}
        </div>
```

### Prop Flow Timeline

```
Parent Renders
    │
    ▼
Video2Ascii Receives Props (t = 0ms)
    │
    ├─► Props destructured from function parameters
    ├─► No state updates needed (props already in memory)
    │
    ▼
Hook Execution (t = 0.1ms)
    │
    ├─► useVideoToAscii(options)
    │   • Options extracted from props
    │   • Refs created (already exist)
    │   • No re-render triggered (refs don't cause updates)
    │
    ├─► useAsciiMouseEffect(ascii, options)
    │   • Options extracted from props
    │   • Event handlers returned
    │   • No re-render triggered
    │
    ├─► useAsciiRipple(ascii, options)
    │   • Options extracted from props
    │   • Event handlers returned
    │   • No re-render triggered
    │
    └─► useAsciiAudio(ascii, options)
        • Options extracted from props
        • Audio context set up
        • No re-render triggered
    │
    ▼
JSX Render (t = 0.2ms)
    │
    ├─► <video src={src} />
    │   • src prop used directly
    │   • Other props: muted={audioEffect === 0}
    │
    ├─► <div {...mouseHandlers} {...rippleHandlers}>
    │   • Event handlers from hooks spread to div
    │   • Refs from hooks attached to elements
    │
    └─► {showStats && <StatsOverlay />}
        • Conditional rendering based on prop
    │
    ▼
DOM Update (t = 0.3ms)
    │
    ├─► Video element src updated (if changed)
    ├─► Container events re-registered (if handlers changed)
    ├─► Stats overlay shown/hidden (if showStats changed)
    │
    ▼
Total Prop Flow Time: <1ms
```

---

## Component Lifecycle

### Mounting Phase

```
┌─────────────────────────────────────────────────────────────────┐
│                    MOUNTING PHASE                           │
└─────────────────────────────────────────────────────────────────┘

1. Parent Component Renders
    │
    └─► <Video2Ascii src="/video.mp4" ... />
        Creates component instance
        │
        ▼

2. Video2Ascii Component Constructor (Function Component)
    │
    ├─► Hook initialization begins
    │   │
    │   ├─► useVideoToAscii() called
    │   │   │
    │   │   ├─► Create refs:
    │   │   │   • containerRef = { current: null }
    │   │   │   • videoRef = { current: null }
    │   │   │   • canvasRef = { current: null }
    │   │   │   • glRef = { current: null }
    │   │   │   • programRef = { current: null }
    │   │   │   • videoTextureRef = { current: null }
    │   │   │   • atlasTextureRef = { current: null }
    │   │   │   • animationRef = { current: 0 }
    │   │   │   • uniformSettersRef = new Map()
    │   │   │
    │   │   ├─► Initialize state:
    │   │   │   • dimensions = { cols: 80, rows: 24 }
    │   │   │   • stats = { fps: 0, frameTime: 0 }
    │   │   │   • isReady = false
    │   │   │   • isPlaying = false
    │   │   │
    │   │   └─► Return context object
    │   │
    │   ├─► useAsciiMouseEffect() called
    │   │   │
    │   │   ├─► Create refs:
    │   │   │   • mouseRef = { x: -1, y: -1 }
    │   │   │   • trailRef = []
    │   │   │
    │   │   └─► Register uniform setter (no effect yet, video not loaded)
    │   │
    │   ├─► useAsciiRipple() called
    │   │   │
    │   │   ├─► Create refs:
    │   │   │   • ripplesRef = []
    │   │   │
    │   │   └─► Register uniform setter (no effect yet)
    │   │
    │   └─► useAsciiAudio() called
    │       │
    │       ├─► Create refs:
    │       │   • audioContextRef = null
    │       │   • analyzerRef = null
    │       │   • volumeRef = 0
    │       │
    │       └─► Register uniform setter (no effect yet)
    │
    ▼

3. JSX Returned and Rendered
    │
    ├─► <video ref={videoRef} src={src} />
    │   • Video element created in DOM
    │   • Ref populated: videoRef.current = <video>
    │   • Video begins loading
    │
    ├─► <div ref={containerRef}>
    │   • Container created in DOM
    │   • Ref populated: containerRef.current = <div>
    │
    └─► <canvas ref={canvasRef} />
        • Canvas created in DOM
        • Ref populated: canvasRef.current = <canvas>
    │
    ▼

4. Video Loads Metadata
    │
    ├─► Video fires loadedmetadata event
    │   • Video dimensions known: video.videoWidth × video.videoHeight
    │   • Duration known
    │
    ▼

5. useEffect Hook Triggers: Video Event Handlers
    │
    ├─► useVideoToAscii's useEffect
    │   │
    │   └─► Event listener attached to loadedmetadata
    │       → initWebGL() called immediately (if video already loaded)
    │       or
    │       → Event will trigger initWebGL() when metadata loads
    │
    ▼

6. WebGL Initialization (initWebGL)
    │
    ├─► Calculate grid dimensions
    │   → setDimensions({ cols, rows })
    │   → State update triggers re-render
    │
    ├─► Get WebGL2 context
    │   → glRef.current = canvas.getContext("webgl2")
    │
    ├─► Compile shaders
    │   → vertexShader = compileShader(...)
    │   → fragmentShader = compileShader(...)
    │
    ├─► Create program
    │   → programRef.current = createProgram(...)
    │
    ├─► Create fullscreen quad
    │   → Geometry uploaded to GPU
    │
    ├─► Create textures
    │   → videoTextureRef.current = createVideoTexture(...)
    │   → atlasTextureRef.current = createAsciiAtlas(...)
    │
    ├─► Cache uniform locations
    │   → uniformLocationsRef.current = all_locations
    │
    ├─► Set static uniforms
    │   → gl.uniform2f(u_resolution, ...)
    │   → gl.uniform1i(u_video, 0)
    │   → gl.uniform1i(u_asciiAtlas, 1)
    │
    └─► Set isReady = true
        → State update triggers re-render
    │
    ▼

7. Re-render After Initialization
    │
    ├─► Component re-renders (isReady changed)
    │
    ├─► JSX same as before
    │
    ├─► useEffect: Playback Control triggers
    │   │
    │   └─► if (isPlaying && autoPlay && isReady)
    │       → video.play()
    │
    └─► Video fires play event
    │
    ▼

8. Video Plays
    │
    ├─► Video fires play event
    │
    ├─► useEffect: Video Event Handlers
    │   │
    │   ├─► setIsPlaying(true)
    │   │   → State update (may trigger re-render)
    │   │
    │   └─► Start render loop
    │       → animationRef.current = requestAnimationFrame(render)
    │
    ▼

9. Render Loop Starts
    │
    └─► Per-frame execution begins (60 FPS)
        • render() called by requestAnimationFrame
        • Uploads video frame to GPU
        • Updates feature uniforms
        • Draws quad (triggers shader)
        • Updates stats
        • Schedules next frame
    │
    ▼

MOUNTING COMPLETE ✓
```

### Updating Phase

```
┌─────────────────────────────────────────────────────────────────┐
│                    UPDATING PHASE                          │
└─────────────────────────────────────────────────────────────────┘

Scenario 1: Prop Change (non-structural)
    │
    │ Parent updates prop: brightness={1.5}
    │
    ▼
    Video2Ascii re-renders
    │
    ├─► Hooks re-execute
    │   │
    │   ├─► useVideoToAscii({ brightness: 1.5, ... })
    │   │   • Refs unchanged
    │   │   • State unchanged
    │   │   • useEffect: Reinitialize if config changes
    │   │       → initWebGL() called
    │   │       → WebGL resources recreated (expensive!)
    │   │       → Render loop continues with new brightness
    │   │
    │   └─► Feature hooks re-execute
    │       • Minimal impact (refs stable)
    │
    ├─► JSX re-rendered
    │   • No DOM changes (same refs, same structure)
    │
    └─► Render loop continues
        • Next frame uses new brightness value
    │
    ▼
    Update complete

Scenario 2: Prop Change (structural: numColumns)
    │
    │ Parent updates prop: numColumns={150}
    │
    ▼
    Video2Ascii re-renders
    │
    ├─► Hooks re-execute
    │   │
    │   ├─► useVideoToAscii({ numColumns: 150, ... })
    │   │   • useEffect: Reinitialize triggered
    │   │       → initWebGL() called
    │   │       → Grid recalculated: { cols: 150, rows: ... }
    │   │       → Canvas resized: width = new value
    │   │       → WebGL context recreated
    │   │       → Textures recreated
    │   │       → Uniforms reset
    │   │       → isReady = true (re-renders)
    │   │
    │   └─► Feature hooks re-execute
    │       • Minimal impact
    │
    ├─► JSX re-rendered
    │   • Canvas width attribute updated
    │
    └─► Render loop continues
        • Next frame uses new grid size
    │
    ▼
    Update complete

Scenario 3: State Change from Video
    │
    │ Video fires pause event
    │
    ▼
    Video2Ascii does NOT re-render
    │
    ├─► useEffect: Video Event Handlers executes
    │   │
    │   ├─► setIsPlaying(false)
    │   │   → State update triggers re-render
    │   │
    │   └─► cancelAnimationFrame(animationRef.current)
    │       → Render loop stops
    │
    ▼
    Video2Ascii re-renders (isPlaying changed)
    │
    ├─► JSX re-rendered
    │   • No changes
    │
    └─► Render loop stopped
    │
    ▼
    Update complete

Scenario 4: User Interaction (Mouse Move)
    │
    │ User moves mouse over canvas
    │
    ▼
    onMouseMove event fires
    │
    ├─► Handler in useAsciiMouseEffect executes
    │   │
    │   ├─► Update mouseRef.current
    │   │   • No re-render (ref update)
    │   │
    │   ├─► Update trailRef.current
    │   │   • No re-render (ref update)
    │   │
    │   └─► Next render frame will use new values
    │       → Uniform setter updates shader
    │
    └─► Video2Ascii does NOT re-render
    │
    ▼
    Interaction complete (instant, no re-render)
```

### Unmounting Phase

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNMOUNTING PHASE                        │
└─────────────────────────────────────────────────────────────────┘

1. Parent Component Removes Video2Ascii
    │
    │ Parent state change: showAscii = false
    │
    ▼
2. Component Begins Unmounting
    │
    ├─► Video2Ascii unmounts
    │   │
    │   ├─► Cleanup functions run (in order of useEffect registration)
    │   │
    │   ├─► 1. Playback Control useEffect cleanup
    │   │   │
    │   │   └─► Cancel render loop
    │   │       → cancelAnimationFrame(animationRef.current)
    │   │       → No more frames scheduled
    │   │
    │   ├─► 2. useAsciiAudio cleanup
    │   │   │
    │   │   ├─► Unregister uniform setter
    │   │   │   → uniformSettersRef.delete('audio')
    │   │   │
    │   │   └─► Close audio context
    │   │       → audioContextRef.current.close()
    │   │       → Audio graph disconnected
    │   │
    │   ├─► 3. useAsciiRipple cleanup
    │   │   │
    │   │   └─► Unregister uniform setter
    │   │       → uniformSettersRef.delete('ripple')
    │   │
    │   ├─► 4. useAsciiMouseEffect cleanup
    │   │   │
    │   │   └─► Unregister uniform setter
    │   │       → uniformSettersRef.delete('mouse')
    │   │
    │   ├─► 5. Video Event Handlers useEffect cleanup
    │   │   │
    │   │   └─► Remove video event listeners
    │   │       → video.removeEventListener('loadedmetadata', ...)
    │   │       → video.removeEventListener('play', ...)
    │   │       → video.removeEventListener('pause', ...)
    │   │       → video.removeEventListener('ended', ...)
    │   │
    │   ├─► 6. Container Resize Observer cleanup
    │   │   │
    │   │   └─► Disconnect observer
    │   │       → resizeObserver.disconnect()
    │   │
    │   ├─► 7. WebGL Resource Cleanup useEffect
    │   │   │
    │   │   └─► Delete WebGL resources
    │   │       → gl.deleteTexture(videoTexture)
    │   │       → gl.deleteTexture(atlasTexture)
    │   │       → gl.deleteProgram(program)
    │   │       → WebGL context lost automatically
    │   │
    │   └─► 8. Spacebar toggle cleanup
    │       └─► Remove keyboard event listener
    │           → window.removeEventListener('keydown', ...)
    │
    ▼
3. DOM Elements Removed
    │
    ├─► <video> element removed from DOM
    ├─► <canvas> element removed from DOM
    └─► <div> container removed from DOM
    │
    ▼
4. Component Instance Destroyed
    │
    ├─► All refs become inaccessible
    ├─► All state lost
    └─► All timers cancelled
    │
    ▼
UNMOUNTING COMPLETE ✓
```

---

## Ref Management

### Ref Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    REF HIERARCHY                          │
└─────────────────────────────────────────────────────────────────┘

Component Level (Video2Ascii Component)
│
├─► Directly managed refs (for DOM elements)
│   • containerRef → <div ref={containerRef}>
│   • videoRef → <video ref={videoRef}>
│   • canvasRef → <canvas ref={canvasRef}>
│
└─► Passed to hooks (for internal state)
    │
    ▼
Hook Level (useVideoToAscii)
│
├─► DOM Refs (shared with component)
│   • containerRef: Provided to parent
│   • videoRef: Provided to parent
│   • canvasRef: Provided to parent
│
├─► WebGL Resource Refs (internal)
│   • glRef: WebGL2RenderingContext
│   • programRef: WebGLProgram
│   • videoTextureRef: WebGLTexture
│   • atlasTextureRef: WebGLTexture
│
├─► Render Loop Refs (internal)
│   • animationRef: requestAnimationFrame ID
│
├─► Performance Refs (internal)
│   • frameCountRef: Frame counter
│   • frameTimesRef: Array of frame times
│   • lastFpsTimeRef: Timestamp
│
└─► Feature Registration Refs (internal)
    • uniformSettersRef: Map<string, UniformSetter>
    • uniformLocationsRef: Cached uniform locations
    │
    ▼
Feature Hook Level (useAsciiMouseEffect, etc.)
│
├─► Feature State Refs (internal)
│   • mouseRef: { x, y }
│   • trailRef: MousePosition[]
│   • ripplesRef: Ripple[]
│   • volumeRef: number
│   • enabledRef: boolean
│   • speedRef: number
│
├─► Audio Refs (useAsciiAudio)
│   • audioContextRef: AudioContext
│   • analyzerRef: AnalyserNode
│   • sourceRef: MediaElementAudioSourceNode
│   • dataArrayRef: Uint8Array
│
└─► Configuration Refs (all features)
    • optionsRef: Feature options
```

### Ref Lifetimes

```
┌─────────────────────────────────────────────────────────────────┐
│                    REF LIFECYCLE                           │
└─────────────────────────────────────────────────────────────────┘

Container: containerRef
├─► Created: Component mount (first render)
├─► Populated: After first render (containerRef.current = <div>)
├─► Used: 
│   • ResizeObserver observes element
│   • Event handlers attached to element
│   • Calculations use client dimensions
├─► Cleared: Component unmount (containerRef.current = null)
└─► Garbage collected: After unmount

Video: videoRef
├─► Created: Component mount (first render)
├─► Populated: After first render (videoRef.current = <video>)
├─► Used:
│   • initWebGL() reads video.videoWidth/Height
│   • Playback control (play/pause)
│   • Audio connection
│   • Event listener attachment
├─► Cleared: Component unmount (videoRef.current = null)
└─► Garbage collected: After unmount

Canvas: canvasRef
├─► Created: Component mount (first render)
├─► Populated: After first render (canvasRef.current = <canvas>)
├─► Used:
│   • initWebGL() gets WebGL2 context
│   • Canvas sizing
│   • WebGL rendering target
├─► Cleared: Component unmount (canvasRef.current = null)
└─► Garbage collected: After unmount

WebGL Context: glRef
├─► Created: initWebGL() execution
├─► Populated: glRef.current = canvas.getContext("webgl2")
├─► Used:
│   • All WebGL operations
│   • Resource creation/deletion
│   • Shader compilation
│   • Drawing
├─► Cleared: Component unmount (via cleanup)
└─► Garbage collected: After unmount (context automatically lost)

WebGL Program: programRef
├─► Created: initWebGL() execution
├─► Populated: programRef.current = createProgram(...)
├─► Used:
│   • gl.useProgram()
│   • Uniform location caching
│   • Shader execution
├─► Deleted: Component unmount (gl.deleteProgram(program))
└─► Garbage collected: After unmount

Video Texture: videoTextureRef
├─► Created: initWebGL() execution
├─► Populated: videoTextureRef.current = gl.createTexture()
├─► Used:
│   • Upload video frame every render
│   • Sampling in fragment shader
├─► Deleted: Component unmount (gl.deleteTexture(texture))
└─► Garbage collected: After unmount

Atlas Texture: atlasTextureRef
├─► Created: initWebGL() execution
├─► Populated: atlasTextureRef.current = createAsciiAtlas(...)
├─► Used:
│   • Character sampling in shader
│   • Never updated (static)
├─► Deleted: Component unmount (gl.deleteTexture(texture))
└─► Garbage collected: After unmount

Animation Frame: animationRef
├─► Created: render() function definition
├─► Populated: animationRef.current = requestAnimationFrame(render)
├─► Updated: Every frame (new request ID)
├─► Cleared: Video pause/end or unmount (cancelAnimationFrame())
└─► Garbage collected: After unmount
```

### Ref Access Patterns

```
┌─────────────────────────────────────────────────────────────────┐
│              REF ACCESS PATTERNS                            │
└─────────────────────────────────────────────────────────────────┘

Pattern 1: Direct Access (Component Level)
│
│   const { containerRef, videoRef, canvasRef } = ascii;
│   
│   <div ref={containerRef}>
│   <video ref={videoRef}>
│   <canvas ref={canvasRef}>
│
│   • Refs attached to JSX elements
│   • React populates them automatically
│   • Never set ref.current manually

Pattern 2: Read Access (Hook Level)
│
│   const initWebGL = useCallback(() => {
│     const canvas = canvasRef.current;
│     const video = videoRef.current;
│     
│     if (!canvas || !video) return;
│     
│     // Use refs for WebGL initialization
│     const gl = canvas.getContext("webgl2");
│   }, [canvasRef, videoRef]);
│
│   • Always check if ref.current exists
│   • Read-only access (never set ref.current in hooks)
│   • Use in useCallback dependencies

Pattern 3: Write Access (Hook Level - Rare)
│
│   const render = useCallback(() => {
│     const gl = glRef.current;
│     const program = programRef.current;
│     
│     if (!gl || !program) return;
│     
│     // Upload video frame
│     gl.texImage2D(...);
│     
│     // Update animation frame
│     animationRef.current = requestAnimationFrame(render);
│   }, []);
│
│   • Set ref.current for animation IDs
│   • Write to refs that don't trigger re-renders
│   • Always check null before use

Pattern 4: Mutable State in Refs (Feature Hooks)
│
│   const onMouseMove = useCallback((e) => {
│     const rect = e.currentTarget.getBoundingClientRect();
│     const newPos = {
│       x: (e.clientX - rect.left) / rect.width,
│       y: (e.clientY - rect.top) / rect.height,
│     };
│     
│     // Update ref (no re-render!)
│     mouseRef.current = newPos;
│     
│     // Update array ref
│     trailRef.current.unshift(oldPos);
│   }, []);
│
│   • Mutate ref.current directly
│   • No re-render triggered
│   • Perfect for high-frequency updates

Pattern 5: Options in Refs (Fresh Values)
│
│   const { enabled, trailLength } = options;
│   const enabledRef = useRef(enabled);
│   const trailLengthRef = useRef(trailLength);
│   
│   useEffect(() => {
│     enabledRef.current = enabled;
│     trailLengthRef.current = trailLength;
│   }, [enabled, trailLength]);
│   
│   // Use in callback
│   const onMouseMove = useCallback(() => {
│     if (!enabledRef.current) return;
│     // Always has fresh value!
│   }, []);
│
│   • Keep options in refs for closures
│   • Update refs when options change
│   • Avoids stale closure problems
```

---

## Component Communication

### Communication Patterns

```
┌─────────────────────────────────────────────────────────────────┐
│            COMPONENT COMMUNICATION PATTERNS                 │
└─────────────────────────────────────────────────────────────────┘

Pattern 1: Parent → Component (Props)
│
│   Parent Component
│   │
│   <Video2Ascii
│     src="/video.mp4"
│     numColumns={120}
│     colored={true}
│     isPlaying={isPlaying}
│   />
│
│   • Props flow down
│   • One-way data flow
│   • Immutable by convention
│   │
│   ▼
│   Video2Ascii Component
│   │
│   const { src, numColumns, colored, isPlaying } = props;
│   │
│   • Receive props as parameters
│   • Use for rendering and hook configuration

Pattern 2: Component → Parent (Callbacks)
│
│   Parent Component
│   │
│   const [stats, setStats] = useState(null);
│   
│   <Video2Ascii
│     src="/video.mp4"
│     onStats={(newStats) => setStats(newStats)}
│   />
│
│   • Pass callback function as prop
│   • Component calls callback with data
│   • Parent receives updates
│   │
│   ▼
│   Video2Ascii Component (via useVideoToAscii)
│   │
│   const onStats = (stats) => {
│     setStats(stats);
│     options.onStats?.(stats); // Callback to parent
│   };
│   │
│   • Call callback when stats update
│   • Optional chaining (?.) handles undefined

Pattern 3: Component → Parent (Imperative API)
│
│   Parent Component
│   │
│   const asciiRef = useRef(null);
│   
│   <Video2Ascii
│     ref={asciiRef}
│     src="/video.mp4"
│   />
│   
│   <button onClick={() => {
│     const video = asciiRef.current?.videoRef.current;
│     video?.currentTime = 10; // Seek to 10s
│   }}>
│     Seek
│   </button>
│
│   • Parent uses ref to access component internals
│   • Component exposes API via useImperativeHandle
│   │
│   ▼
│   Video2Ascii Component
│   │
│   useImperativeHandle(ref, () => ({
│     videoRef: videoRef,
│   }));
│   │
│   • Expose selected refs/methods
│   • Not the full component instance
│   • Controlled interface

Pattern 4: Hook → Hook (Context/Registration)
│
│   useVideoToAscii (Core Hook)
│   │
│   const registerUniformSetter = useCallback((id, setter) => {
│     uniformSettersRef.current.set(id, setter);
│   }, []);
│   │
│   return { registerUniformSetter, ... };
│
│   • Provide registration function
│   • Feature hooks call it to register
│   • Core hook calls all setters each frame
│   │
│   ▼
│   useAsciiMouseEffect (Feature Hook)
│   │
│   useEffect(() => {
│     const setter = (gl, program, locations) => {
│       gl.uniform2f(locations.u_mouse, x, y);
│     };
│     
│     ascii.registerUniformSetter("mouse", setter);
│     
│     return () => ascii.unregisterUniformSetter("mouse");
│   }, [ascii]);
│
│   • Register setter on mount
│   • Unregister on unmount
│   • Clean registration pattern

Pattern 5: Hook → DOM (Refs)
│
│   useVideoToAscii Hook
│   │
│   const containerRef = useRef<HTMLDivElement>(null);
│   const videoRef = useRef<HTMLVideoElement>(null);
│   const canvasRef = useRef<HTMLCanvasElement>(null);
│   │
│   return { containerRef, videoRef, canvasRef, ... };
│   │
│   • Create refs for DOM elements
│   • Return to component
│   │
│   ▼
│   Video2Ascii Component
│   │
│   const { containerRef, videoRef, canvasRef } = ascii;
│   
│   return (
│     <div>
│       <video ref={videoRef} />
│       <div ref={containerRef}>
│         <canvas ref={canvasRef} />
│       </div>
│     </div>
│   );
│
│   • Attach refs to JSX elements
│   • React populates refs automatically
│   • Hooks use refs through ascii context

Pattern 6: Hook → Hook (Direct Context)
│
│   useVideoToAscii (Core Hook)
│   │
│   return {
│     videoRef,
│     uniformLocationsRef,
│     registerUniformSetter,
│     // ... more context
│   } as AsciiContext;
│
│   • Return comprehensive context object
│   • Contains all necessary refs and methods
│   │
│   ▼
│   useAsciiAudio (Feature Hook)
│   │
│   function useAsciiAudio(ascii: AsciiContext, options) {
│     const video = ascii.videoRef.current;
│     
│     useEffect(() => {
│       const connectAudio = () => {
│         // Connect to video element
│         const source = audioCtx.createMediaElementSource(video);
│         // ...
│       };
│       
│       video?.addEventListener("play", connectAudio);
│       return () => video?.removeEventListener("play", connectAudio);
│     }, [ascii.videoRef]);
│   }
│
│   • Receive full context object
│   • Access necessary refs/methods
│   • Use for feature implementation
```

### Communication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│              FULL COMMUNICATION FLOW                         │
└─────────────────────────────────────────────────────────────────┘

Parent App
    │
    │ 1. Props (Parent → Component)
    ├─────────────────────────────────────────┐
    │ src="/video.mp4"                   │
    │ numColumns={120}                     │
    │ colored={true}                       │
    │ onStats={handleStats}                 │
    ▼                                     │
Video2Ascii Component                      │
    │                                     │
    │ 2. Refs (Component → DOM)           │
    ├─────────────────────────────────────────┤
    │ <video ref={videoRef}>               │
    │ <div ref={containerRef}>             │
    │ <canvas ref={canvasRef}>             │
    ▼                                     │
useVideoToAscii Hook                      │
    │                                     │
    │ 3. Context (Hook → Component)        │
    ├─────────────────────────────────────────┤
    │ return {                            │
    │   containerRef,                       │
    │   videoRef,                          │
    │   canvasRef,                         │
    │   registerUniformSetter,               │
    │   // ...                           │
    │ }                                    │
    ▼                                     │
Feature Hooks                           │
    │                                     │
    │ 4. Registration (Feature → Core)      │
    ├─────────────────────────────────────────┤
    │ ascii.registerUniformSetter(          │
    │   'mouse',                          │
    │   (gl, program, locs) => {          │
    │     gl.uniform2f(locs.u_mouse, x, y)  │
    │   }                                  │
    │ )                                     │
    ▼                                     │
Render Loop                             │
    │                                     │
    │ 5. Uniform Updates (Core → Shader)    │
    ├─────────────────────────────────────────┤
    │ for (setter of uniformSetters) {     │
    │   setter(gl, program, locations);     │
    │ }                                     │
    │ gl.drawArrays(TRIANGLES, 0, 6);    │
    ▼                                     │
Fragment Shader (GPU)                   │
    │                                     │
    │ 6. Rendering (Shader → Canvas)       │
    ├─────────────────────────────────────────┤
    │ • Sample video texture                │
    │ • Calculate brightness                │
    │ • Add effects                       │
    │ • Sample atlas texture               │
    │ • Mix colors                        │
    │ • Output to framebuffer              │
    ▼                                     │
Canvas Display                          │
    │                                     │
    │ 7. Stats (Hook → Parent)              │
    ├─────────────────────────────────────────┤
    │ setStats({ fps, frameTime });        │
    │ onStats?.(stats);                   │
    ▼                                     │
Parent App                             │
    │                                     │
    │ 8. Display stats                    │
    ├─────────────────────────────────────────┤
    │ {stats && (                         │
    │   <div>{stats.fps} FPS</div>        │
    │ )}                                    │
                                         │
    │ 9. Imperative API (Parent → Component)
    ├─────────────────────────────────────────┤
    │ const video = asciiRef.current?.       │
    │   videoRef.current;                  │
    │ video?.currentTime = 10;             │
```

---

## Best Practices

### Component Design Best Practices

#### 1. Keep Component Hierarchy Shallow

```typescript
// ✓ GOOD: Single component with hooks
export const Video2Ascii = forwardRef<RefType, PropsType>(function Video2Ascii(props, ref) {
  const ascii = useVideoToAscii(options);
  useAsciiMouseEffect(ascii, mouseOptions);
  useAsciiRipple(ascii, rippleOptions);
  useAsciiAudio(ascii, audioOptions);
  
  return <JSX />;
});

// ✗ BAD: Deep component nesting
export const Video2Ascii = function Video2Ascii(props) {
  return (
    <VideoContainer>
      <VideoSource />
      <WebGLCanvas>
        <EffectsLayer>
          <MouseEffect />
          <RippleEffect />
          <AudioEffect />
        </EffectsLayer>
      </WebGLCanvas>
    </VideoContainer>
  );
};
```

**Why Shallow is Better**:
- Fewer re-renders
- No prop drilling
- Better performance
- Simpler debugging

#### 2. Use Refs for WebGL Resources

```typescript
// ✓ GOOD: WebGL resources in refs
const glRef = useRef<WebGL2RenderingContext | null>(null);
const programRef = useRef<WebGLProgram | null>(null);
const textureRef = useRef<WebGLTexture | null>(null);

const initWebGL = useCallback(() => {
  const gl = canvasRef.current?.getContext("webgl2");
  glRef.current = gl;
  programRef.current = gl.createProgram();
  textureRef.current = gl.createTexture();
}, []);

// ✗ BAD: WebGL resources in state
const [gl, setGl] = useState<WebGL2RenderingContext | null>(null);
const [program, setProgram] = useState<WebGLProgram | null>(null);

const initWebGL = useCallback(() => {
  const gl = canvasRef.current?.getContext("webgl2");
  setGl(gl);  // Triggers re-render!
  setProgram(gl.createProgram());  // Triggers re-render!
}, []);
```

**Why Refs for WebGL**:
- WebGL resources shouldn't trigger re-renders
- Refs are stable across renders
- No closure issues with callbacks

#### 3. Separate Logic from Rendering

```typescript
// ✓ GOOD: Logic in hooks, rendering in component
function useVideoToAscii(options) {
  // All WebGL logic here
  const initWebGL = useCallback(() => { /* ... */ }, []);
  const render = useCallback(() => { /* ... */ }, []);
  
  return { refs, methods, state };
}

export const Video2Ascii = function Video2Ascii(props) {
  const ascii = useVideoToAscii(options);
  
  // Only JSX here
  return (
    <div ref={ascii.containerRef}>
      <canvas ref={ascii.canvasRef} />
    </div>
  );
};

// ✗ BAD: Mixed logic and rendering
export const Video2Ascii = function Video2Ascii(props) {
  // WebGL logic mixed with JSX
  const gl = useRef(null);
  
  useEffect(() => {
    const context = canvas.getContext("webgl2");
    gl.current = context;
    const program = context.createProgram();
    // 100 lines of WebGL logic...
  }, []);
  
  return (
    <div>
      {/* JSX mixed with logic */}
    </div>
  );
};
```

**Why Separate**:
- Better testability
- Easier to maintain
- Clear separation of concerns
- Reusable hooks

#### 4. Expose Minimal Imperative API

```typescript
// ✓ GOOD: Expose only what's needed
useImperativeHandle(ref, () => ({
  videoRef: videoRef,  // Minimal access
}));

// Parent uses:
const asciiRef = useRef(null);
asciiRef.current?.videoRef.current?.play();

// ✗ BAD: Expose everything
useImperativeHandle(ref, () => ({
  videoRef,
  containerRef,
  canvasRef,
  glRef,
  programRef,
  play,
  pause,
  toggle,
  // Too much exposure!
}));
```

**Why Minimal API**:
- Encapsulation
- Prevents misuse
- Clear contract
- Easier to refactor

#### 5. Use TypeScript for Type Safety

```typescript
// ✓ GOOD: Full type safety
export interface VideoToAsciiProps {
  src: string;
  numColumns?: number;
  colored?: boolean;
  // ... all props typed
}

export const Video2Ascii = forwardRef<
  { videoRef: React.RefObject<HTMLVideoElement> },
  VideoToAsciiProps
>(function Video2Ascii(props, ref) {
  // TypeScript catches errors
  const { src, numColumns, colored } = props;
  
  return <JSX />;
});

// ✗ BAD: No types or loose types
export const Video2Ascii = function Video2Ascii(props: any) {
  // No type checking
  return <JSX />;
};
```

**Why TypeScript**:
- Catch errors at compile time
- Self-documenting API
- Better IDE support
- Refactoring safety

#### 6. Handle Edge Cases Gracefully

```typescript
// ✓ GOOD: Defensive coding
const render = useCallback(() => {
  const gl = glRef.current;
  const video = videoRef.current;
  const program = programRef.current;
  const locations = uniformLocationsRef.current;
  
  // Check all refs before use
  if (!gl || !video || !program || !locations) return;
  
  // Check video state
  if (video.paused || video.ended) return;
  
  // Safe to render
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}, []);

// ✗ BAD: No error handling
const render = useCallback(() => {
  gl.drawArrays(gl.TRIANGLES, 0, 6);  // May crash!
}, []);
```

**Why Handle Edge Cases**:
- Prevents crashes
- Better UX
- Easier debugging
- Production-ready code

#### 7. Clean Up Resources

```typescript
// ✓ GOOD: Complete cleanup
useEffect(() => {
  const gl = glRef.current;
  if (!gl) return;
  
  // Initialize
  const texture = gl.createTexture();
  videoTextureRef.current = texture;
  
  return () => {
    // Cleanup
    if (videoTextureRef.current) {
      gl.deleteTexture(videoTextureRef.current);
    }
    if (programRef.current) {
      gl.deleteProgram(programRef.current);
    }
    cancelAnimationFrame(animationRef.current);
  };
}, []);

// ✗ BAD: No cleanup
useEffect(() => {
  const texture = gl.createTexture();
  videoTextureRef.current = texture;
  // Memory leak!
}, []);
```

**Why Clean Up**:
- Prevent memory leaks
- Free GPU resources
- Better performance
- No zombie processes

#### 8. Use Callbacks for Performance

```typescript
// ✓ GOOD: Use callbacks for handlers
const render = useCallback(() => {
  // Render logic
}, []); // No deps (only refs used)

const onMouseMove = useCallback((e) => {
  // Mouse handler
}, []); // No deps (only refs used)

useEffect(() => {
  const video = videoRef.current;
  if (!video) return;
  
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  
  video.addEventListener("play", handlePlay);
  video.addEventListener("pause", handlePause);
  
  return () => {
    video.removeEventListener("play", handlePlay);
    video.removeEventListener("pause", handlePause);
  };
}, [videoRef]); // Dependencies

// ✗ BAD: Inline functions
useEffect(() => {
  const video = videoRef.current;
  if (!video) return;
  
  video.addEventListener("play", () => setIsPlaying(true)); // New function every render
  video.addEventListener("pause", () => setIsPlaying(false)); // New function every render
  
  return () => {
    video.removeEventListener("play", () => setIsPlaying(true)); // Won't remove!
    video.removeEventListener("pause", () => setIsPlaying(false)); // Won't remove!
  };
}, []);
```

**Why Use Callbacks**:
- Stable references
- Proper cleanup
- Performance optimization
- Prevent bugs

---

## Summary

The Video2ASCII component hierarchy demonstrates several key architectural patterns:

1. **Shallow Component Tree**: Single component with hooks instead of deep nesting
2. **Hook-Based Architecture**: Logic separated into reusable hooks
3. **Ref Management**: WebGL resources in refs to avoid re-renders
4. **Plugin System**: Feature hooks register with core hook
5. **Imperative API**: Controlled exposure via `useImperativeHandle`
6. **Type Safety**: Comprehensive TypeScript typing
7. **Lifecycle Management**: Proper initialization, updates, and cleanup
8. **Performance**: Optimized for 60 FPS with minimal re-renders

This architecture provides:
- **Performance**: Minimal re-renders, GPU-accelerated rendering
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Easy to add new features
- **Type Safety**: Compile-time error checking
- **Developer Experience**: Clean API, good debugging support

By understanding this component hierarchy, you'll be well-equipped to build similar real-time graphics applications in React.