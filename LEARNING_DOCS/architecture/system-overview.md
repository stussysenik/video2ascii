# System Architecture Overview

## Table of Contents
- [High-Level Architecture](#high-level-architecture)
- [Component Hierarchy](#component-hierarchy)
- [Core Systems](#core-systems)
- [Architecture Patterns](#architecture-patterns)
- [Technology Stack](#technology-stack)
- [Design Decisions](#design-decisions)

---

## High-Level Architecture

Video2ASCII is built as a **modular, GPU-accelerated video processing system** that converts video frames to ASCII art in real-time. The architecture follows a **layered approach** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                        │
│                    (React Component + UI)                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Logic Layer                              │
│                   (Custom React Hooks)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ useVideoTo   │  │ useAsciiMouse│  │ useAsciiAudio│          │
│  │   Ascii      │  │    Effect    │  │     Effect   │          │
│  │ (Core Hook)  │  │ (Feature)    │  │ (Feature)    │          │
│  └──────┬───────┘  └──────────────┘  └──────────────┘          │
│         │                                                          │
│         │  ┌──────────────┐                                       │
│         └─►│ useAsciiRipple│                                      │
│            │   (Feature)  │                                      │
│            └──────────────┘                                      │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Graphics Layer                              │
│                   (WebGL2 + GLSL Shaders)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    WebGL Context                          │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐          │   │
│  │  │  Shaders   │  │  Textures  │  │  Uniforms  │          │   │
│  │  │  (Program) │  │ (Video+    │  │ (State)    │          │   │
│  │  │            │  │  Atlas)    │  │            │          │   │
│  │  └────────────┘  └────────────┘  └────────────┘          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Fragment Shader (GPU)                    │   │
│  │  - ASCII conversion algorithm                            │   │
│  │  - Brightness calculation                                │   │
│  │  - Character mapping                                     │   │
│  │  - Effect composition (mouse, audio, ripple)             │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Data Layer                                │
│                   (Video Source + Audio)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  <video>     │  │  Audio       │  │  Charset     │          │
│  │  Element     │  │  Context     │  │  Definitions │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Architecture Philosophy

The system is designed around three core principles:

1. **GPU-First Processing**: All pixel manipulation happens on the GPU via shaders, not the CPU. This enables real-time performance even at high resolutions.

2. **Modular Features**: Each visual effect (mouse glow, audio reactivity, ripples) is a self-contained module that registers itself with the core system.

3. **Minimal JavaScript Overhead**: JavaScript only handles orchestration and state management. The heavy lifting is done entirely in compiled WebGL code.

---

## Component Hierarchy

### 1. Video2Ascii Component (Root)

**Location**: `src/components/VideoToAscii.tsx`

**Purpose**: The public-facing React component that orchestrates all subsystems.

**Responsibilities**:
- Render the hidden `<video>` element (source of video frames)
- Render the interactive container with the WebGL `<canvas>`
- Manage playback state (play/pause via props)
- Expose imperative API via `forwardRef`
- Combine feature hooks with core hook
- Handle keyboard events (spacebar toggle)

**Key Pattern**: Uses `forwardRef` to expose the video element to parent components for advanced control.

**Flow**:
```typescript
// Pseudocode
Video2Ascii Component
├── Initialize useVideoToAscii (core hook)
├── Initialize useAsciiMouseEffect (if enabled)
├── Initialize useAsciiRipple (if enabled)
├── Initialize useAsciiAudio (if audioEffect > 0)
├── Sync isPlaying prop with video.play/pause
└── Render: 
    ├── <video src={src} hidden />
    └── <div {...eventHandlers}>
        └── <canvas ref={canvasRef} />
```

---

### 2. Core Hook: useVideoToAscii

**Location**: `src/hooks/useVideoToAscii.ts`

**Purpose**: Manages all WebGL initialization, rendering loop, and state for the ASCII conversion.

**This is the heart of the system** - it handles everything needed to convert video to ASCII.

**Responsibilities**:

#### WebGL Initialization Phase
```
1. Create WebGL2 context from canvas
2. Compile vertex and fragment shaders
3. Link shaders into a WebGL program
4. Create fullscreen quad (two triangles)
5. Create video texture (for uploading frames)
6. Create ASCII atlas texture (pre-rendered characters)
7. Cache all uniform locations (performance optimization)
8. Set static uniforms (grid size, char size, etc.)
```

#### Render Loop Phase (60 FPS)
```
Every Frame:
1. Get current video frame
2. Upload frame to GPU texture (texImage2D)
3. Generate mipmaps for quality
4. Bind atlas texture
5. Call all registered feature uniform setters
6. Draw quad (triggers fragment shader)
7. Calculate FPS and frame time
8. Schedule next frame (requestAnimationFrame)
```

#### State Management
- `dimensions`: Grid columns and rows
- `stats`: FPS and frame time metrics
- `isReady`: Whether WebGL is initialized
- `isPlaying`: Whether video is currently playing
- Refs for: canvas, video, WebGL context, program, textures

**Key Patterns**:

1. **Uniform Caching**: Looks up all uniform locations once at init, stores them in a ref. Avoids expensive `getUniformLocation` calls every frame.

2. **Feature Registration Pattern**: Provides `registerUniformSetter` function that feature hooks use to inject their shader updates.

3. **Resize Observer**: When `numColumns` is used, watches container size and re-initializes WebGL when it changes.

---

### 3. Feature Hooks (Plugin System)

The feature hooks implement a **plugin architecture** where each effect is completely self-contained:

### useAsciiMouseEffect

**Location**: `src/hooks/useAsciiMouseEffect.ts`

**Purpose**: Creates a glowing cursor with trailing effect when mouse moves over the canvas.

**How it works**:
1. Tracks current mouse position in normalized coordinates (0-1)
2. Maintains a trail array of previous positions
3. Registers a uniform setter that passes mouse data to the shader
4. In the shader: calculates distance from each ASCII cell to mouse cursor, adds glow based on distance

**Data Flow**:
```
User moves mouse → onMouseMove event
→ Update mouseRef.current position
→ Push old position to trailRef.current array
→ Render loop calls registered uniform setter
→ Shader uses u_mouse and u_trail[] arrays
→ Each pixel calculates: glow = 1 - distance/cursorRadius
→ Add glow to final color
```

**Algorithm**:
```glsl
// In fragment shader
cursorGlow = 0.0;
for each position in trail:
    distance = length(pixelCell - trailPosition);
    if (distance <= cursorRadius) {
        glow = 1.0 - distance / cursorRadius;
        cursorGlow += glow * fadeFactor;
    }
finalColor += cursorGlow * videoColor;
```

---

### useAsciiRipple

**Location**: `src/hooks/useAsciiRipple.ts`

**Purpose**: Creates expanding ring ripples when user clicks the canvas.

**How it works**:
1. Maintains an array of active ripples (up to 8)
2. Each ripple has: x, y, startTime
3. On click: adds new ripple to array
4. Uniform setter updates shader with ripple data
5. In the shader: calculates age of each ripple, draws expanding ring

**Data Flow**:
```
User clicks → onClick event
→ Add {x, y, startTime} to ripplesRef.current array
→ Cap array at MAX_RIPPLES (8)
→ Render loop calls uniform setter
→ Shader calculates for each ripple:
    age = currentTime - ripple.startTime
    radius = age * rippleSpeed
    distance = length(pixelCell - rippleOrigin)
    if (distance is within ring thickness):
        add glow to pixel
→ Remove old ripples (age too large)
```

**Time-based Animation**:
```glsl
// In fragment shader
for each ripple:
    age = u_time - ripple.z; // ripple.z = startTime
    radius = age * u_rippleSpeed;
    dist = length(pixelCell - ripple.xy);
    
    // Only glow at the ring edge
    distFromEdge = abs(dist - radius);
    if (distFromEdge < ringThickness) {
        glow = 1.0 - (distFromEdge / ringThickness);
        rippleGlow += glow;
    }
```

---

### useAsciiAudio

**Location**: `src/hooks/useAsciiAudio.ts`

**Purpose**: Makes ASCII characters react to audio levels in the video.

**How it works**:
1. Uses Web Audio API to connect video to an AudioContext
2. Creates an AnalyserNode to extract frequency data
3. Every frame: reads frequency data, calculates average volume
4. Passes volume to shader as `u_audioLevel` uniform
5. In the shader: modulates brightness based on audio level

**Audio Pipeline**:
```
<video> element
    ↓
createMediaElementSource(video)
    ↓
connect(analyzer)
    ↓
analyzer.connect(destination) → speakers (so we hear audio)
    ↓
getByteFrequencyData(dataArray) every frame
    ↓
Calculate average volume
    ↓
Pass to shader as u_audioLevel
```

**Brightness Modulation**:
```glsl
// In fragment shader
// Base brightness from video pixel
baseBrightness = dot(videoColor.rgb, vec3(0.299, 0.587, 0.114));

// Audio modulates brightness
audioMultiplier = mix(0.3, 5.0, u_audioLevel); // Silence=0.3x, Loud=5.0x
audioModulated = baseBrightness * audioMultiplier;

// Blend based on reactivity setting
finalBrightness = mix(baseBrightness, audioModulated, u_audioReactivity);
```

---

## Core Systems

### System 1: WebGL Graphics Engine

The graphics engine handles all GPU operations. It's a minimal WebGL2 implementation without external libraries.

#### WebGL Initialization Flow

```
1. Get WebGL2 Context
   canvas.getContext('webgl2', { antialias: false })
   
2. Compile Shaders
   createShader(VERTEX_SHADER) → vertexShader
   createShader(FRAGMENT_SHADER) → fragmentShader
   
3. Link Program
   createProgram(vertexShader, fragmentShader) → program
   gl.useProgram(program)
   
4. Setup Geometry (Fullscreen Quad)
   createBuffer() → positionBuffer
   bindBuffer(positionBuffer)
   bufferData([-1,-1, 1,-1, -1,1, ...])
   vertexAttribPointer(a_position)
   
5. Create Textures
   createTexture() → videoTexture
   createTexture() → atlasTexture
   
6. Setup Textures
   videoTexture: LINEAR_MIPMAP_LINEAR (quality)
   atlasTexture: LINEAR (crisp characters)
   
7. Cache Uniform Locations
   Look up all uniforms once, store in ref
   
8. Set Static Uniforms
   Resolution, grid size, char size, numChars
```

#### Render Loop (60 FPS)

```
requestAnimationFrame(render)
    ↓
render() {
    // 1. Upload video frame
    texImage2D(videoTexture, videoFrame)
    generateMipmap(videoTexture)
    
    // 2. Update dynamic uniforms
    for (setter in registeredSetters) {
        setter(gl, program, locations)
    }
    
    // 3. Draw
    drawArrays(TRIANGLES, 0, 6)
    
    // 4. Stats
    calculateFPS()
    
    // 5. Next frame
    requestAnimationFrame(render)
}
```

---

### System 2: Texture Atlas Management

The ASCII atlas is a crucial optimization - it pre-renders all characters to a single texture.

#### Atlas Creation

```typescript
// Pseudocode
function createAsciiAtlas(chars, charSize) {
    // 1. Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = charSize * chars.length;  // Horizontal strip
    canvas.height = charSize;
    
    // 2. Render all characters
    const ctx = canvas.getContext('2d');
    ctx.font = `${charSize * 0.8}px monospace`;
    
    for (i = 0; i < chars.length; i++) {
        // Draw character centered in its cell
        const x = i * charSize + charSize/2;
        const y = charSize/2;
        ctx.fillText(chars[i], x, y);
    }
    
    // 3. Upload to GPU
    const texture = gl.createTexture();
    texImage2D(texture, canvas);
    
    return texture;
}
```

#### Atlas Layout

```
Texture Atlas (Single GPU Texture)
Width = charSize × numChars
Height = charSize

┌────────────────────────────────────────────────────┐
│  @  %  #  *  +  =  -  :  .  space                 │
│  ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑    ↑                   │
│  0  1  2  3  4  5  6  7  8    9                   │
│                                                       
│  Each character is charSize × charSize pixels        │
│  Black background, white text                         │
│  Shader multiplies by video color                      │
└────────────────────────────────────────────────────┘
```

#### Shader Atlas Lookup

```glsl
// Map brightness to character index (0 to numChars-1)
float charIndex = floor(brightness * (u_numChars - 0.001));

// Calculate atlas coordinate
float atlasX = charIndex / u_numChars;
vec2 cellPos = fract(pixelTexCoord * u_gridSize);
vec2 atlasCoord = vec2(
    atlasX + cellPos.x / u_numChars,  // X: which character + offset within char
    cellPos.y                           // Y: vertical position within char
);

// Sample the character
vec4 charColor = texture(u_asciiAtlas, atlasCoord);

// charColor.r = 1.0 where the character pixels are
// charColor.r = 0.0 where the background is
```

---

### System 3: Audio Analysis Pipeline

The audio system uses the Web Audio API for real-time frequency analysis.

#### Audio Graph

```
Video Element
    │
    ▼
MediaElementSource
    │
    ├───────────────┐
    ▼               ▼
AnalyserNode    AudioContext.destination
    │               (Speakers)
    │
    ▼
getByteFrequencyData(dataArray)
    │
    ▼
Calculate Average Volume
    │
    ▼
Smooth (exponential moving average)
    │
    ▼
Pass to Shader (u_audioLevel)
```

#### Frequency Analysis

```typescript
// Every frame
const frequencyData = new Uint8Array(analyzer.frequencyBinCount);
analyzer.getByteFrequencyData(frequencyData);

// Calculate average volume
let sum = 0;
for (let i = 0; i < frequencyData.length; i++) {
    sum += frequencyData[i];  // Values are 0-255
}
const average = sum / frequencyData.length / 255;  // Normalize to 0-1

// Smooth to prevent jitter
volume = volume * 0.7 + average * 0.3;
```

---

## Architecture Patterns

### Pattern 1: Plugin/Feature Registration

**Problem**: How to add effects without modifying core rendering logic?

**Solution**: Feature hooks register uniform setters with the core hook.

```typescript
// In useVideoToAscii (core)
const uniformSettersRef = useRef<Map<string, UniformSetter>>(new Map());

function registerUniformSetter(id: string, setter: UniformSetter) {
    uniformSettersRef.current.set(id, setter);
}

// In render loop
for (const setter of uniformSettersRef.current.values()) {
    setter(gl, program, locations);  // Each feature updates its uniforms
}
```

```typescript
// In useAsciiMouseEffect (feature)
useEffect(() => {
    const setter = (gl, program, locations) => {
        gl.uniform2f(locations.u_mouse, mousePos.x, mousePos.y);
    };
    ascii.registerUniformSetter('mouse', setter);
    
    return () => ascii.unregisterUniformSetter('mouse');
}, [ascii]);
```

**Benefits**:
- Core doesn't need to know about specific features
- Features can be enabled/disabled independently
- Easy to add new features (just register a setter)
- Clean separation of concerns

---

### Pattern 2: Uniform Location Caching

**Problem**: `gl.getUniformLocation()` is expensive if called every frame.

**Solution**: Cache all uniform locations once at initialization.

```typescript
// Cache uniforms once
const cacheUniformLocations = (gl, program) => {
    return {
        u_video: gl.getUniformLocation(program, 'u_video'),
        u_asciiAtlas: gl.getUniformLocation(program, 'u_asciiAtlas'),
        u_resolution: gl.getUniformLocation(program, 'u_resolution'),
        // ... all other uniforms
    };
};

// Store in ref
const uniformLocationsRef = useRef(null);
uniformLocationsRef.current = cacheUniformLocations(gl, program);

// Use cached locations every frame
gl.uniform2f(locations.u_resolution, width, height);  // No lookup!
```

**Performance Impact**:
- Without caching: ~0.1ms per uniform lookup × 20 uniforms = ~2ms/frame
- With caching: 0ms overhead
- On 60 FPS: Saves 120ms/second → ~7% performance improvement

---

### Pattern 3: Ref-based State Persistence

**Problem**: WebGL resources must persist across renders (can't be in state).

**Solution**: Use `useRef` for WebGL resources and mutable state.

```typescript
const glRef = useRef<WebGL2RenderingContext | null>(null);
const programRef = useRef<WebGLProgram | null>(null);
const videoTextureRef = useRef<WebGLTexture | null>(null);
const animationRef = useRef<number>(0);

// These don't trigger re-renders when changed
glRef.current = gl;
programRef.current = program;

// Can be accessed in callbacks without stale closures
const render = useCallback(() => {
    const gl = glRef.current;  // Always fresh
    const program = programRef.current;
    // ...
}, [/* no dependencies needed for refs */]);
```

**Why Refs Instead of State**:
- WebGL objects shouldn't trigger React re-renders
- Refs are stable across renders (no closure issues)
- Refs don't cause re-renders when mutated
- Perfect for external resources (WebGL, Audio, timers)

---

### Pattern 4: Aspect Ratio Preservation

**Problem**: ASCII characters are ~2x taller than wide, but videos vary in aspect ratio.

**Solution**: Calculate grid dimensions that preserve video aspect ratio.

```typescript
// Video: 1920 × 1080 (16:9)
// Desired columns: 80

function calculateGridDimensions(videoWidth, videoHeight, cols) {
    const aspectRatio = videoWidth / videoHeight;  // 1.777...
    
    // Divide by 2 because chars are ~2x taller than wide
    const rows = Math.round(cols / aspectRatio / 2);
    
    return { cols, rows };
}

// Result: 80 × 22.5 → 80 × 22 characters
// Preserves 16:9 aspect ratio visually
```

**Visual Result**:
```
Without correction:   With correction:
████████████          ████████
████████████          ████████
(stretched)           (correct aspect ratio)
```

---

## Technology Stack

### Graphics Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **WebGL** | 2.0 | GPU programming interface |
| **GLSL** | 300 ES | Shader language (OpenGL ES 3.0) |
| **Canvas API** | - | Creating ASCII atlas texture |

### Audio Technologies

| Technology | Purpose |
|------------|---------|
| **Web Audio API** | Audio analysis and processing |
| **AudioContext** | Audio graph management |
| **AnalyserNode** | Frequency data extraction |

### Framework & Language

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18+ | UI framework and hooks |
| **TypeScript** | 5+ | Type safety and tooling |
| **ESLint** | - | Code quality |

### Why These Choices?

**WebGL2 over WebGL1**:
- Better texture handling (texture arrays, float textures)
- More uniform types (integers, booleans)
- Better debugging support
- Modern standard with better browser support

**GLSL 300 ES**:
- Modern GLSL syntax
- Better type safety
- `in`/`out` instead of `attribute`/`varying`
- More familiar to modern graphics programmers

**No WebGL Library (Three.js, etc.)**:
- Pure WebGL is more educational
- Shows exactly what's happening
- Smaller bundle size
- Better control over optimization

**React Hooks over Class Components**:
- Cleaner separation of concerns
- Easier to share logic between features
- More functional programming style
- Better ref management for external resources

---

## Design Decisions

### Decision 1: GPU-Based ASCII Conversion

**Alternative**: Process on CPU with `<canvas>` API
- Draw each character with `ctx.fillText()`
- Calculate brightness in JavaScript
- Loop through all character positions

**Chosen Approach**: Process on GPU with WebGL shaders
- Upload video frame as texture
- Fragment shader does conversion in parallel
- Each pixel processed on GPU

**Rationale**:
- **Performance**: GPU processes millions of pixels in parallel vs CPU loop
- **60 FPS Target**: CPU approach maxes out at ~10-20 FPS for HD video
- **Smooth Effects**: Audio/mouse effects are cheap when added to shader
- **Scalability**: Higher resolution = more CPU load, but GPU scales linearly

**Benchmarks** (approximate):
- CPU (Canvas API): ~5-15 FPS at 720p
- GPU (WebGL): 30-60 FPS at 720p
- GPU (WebGL): 20-40 FPS at 1080p

---

### Decision 2: Texture Atlas for Characters

**Alternative**: Render text directly in shader
- Not possible - shaders can't render text directly
- Would require complex SDF (signed distance field) generation

**Chosen Approach**: Pre-render characters to texture atlas
- Use Canvas API to draw all characters to offscreen canvas
- Upload single texture to GPU
- Shader samples correct region based on brightness

**Rationale**:
- **Simplicity**: Much easier than SDF approach
- **Performance**: One texture lookup per pixel
- **Quality**: Crisp text at any resolution
- **Flexibility**: Easy to change character sets
- **Unicode Support**: Works with any characters (emojis, etc.)

**Atlas Benefits**:
```
Without atlas:                    With atlas:
For each frame:                   For each frame:
  For each character:              Upload video frame
    ctx.font = '12px monospace'    Upload atlas (once!)
    ctx.fillText(char, x, y)       
    10,000+ draw calls           vs    1 texture upload
    → Slow                        → Fast
```

---

### Decision 3: Feature Hooks as Plugins

**Alternative**: Put all features in one big hook
- Single `useVideoToAscii` hook with mouse, audio, ripple all mixed in
- Tightly coupled, harder to maintain
- Difficult to disable features

**Chosen Approach**: Separate hooks that register with core
- Each effect is its own hook
- Core provides registration mechanism
- Features can be enabled/disabled independently

**Rationale**:
- **Modularity**: Each feature is self-contained
- **Testability**: Can test hooks in isolation
- **Maintainability**: Changes to mouse effect don't touch audio code
- **Extensibility**: Easy to add new effects
- **User Control**: Props directly enable/disable features

**Code Comparison**:

```typescript
// Monolithic (hard to maintain)
function useVideoToAscii(options) {
    // Core logic...
    
    // Mouse logic mixed in
    const mouse = { x: -1, y: -1 };
    useEffect(() => {
        const handler = (e) => { /* ... */ };
        document.addEventListener('mousemove', handler);
        return () => document.removeEventListener('mousemove', handler);
    }, []);
    
    // Audio logic mixed in
    const audioContext = new AudioContext();
    // ... 100 more lines ...
    
    // Ripple logic mixed in
    const ripples = [];
    // ... 100 more lines ...
    
    return { /* everything */ };
}
```

```typescript
// Modular (clean)
function useVideoToAscii(options) {
    // Core logic only
    return { registerUniformSetter, ... };
}

function useAsciiMouseEffect(ascii, options) {
    // Mouse logic only
    ascii.registerUniformSetter('mouse', setter);
    return handlers;
}

function useAsciiAudio(ascii, options) {
    // Audio logic only
    ascii.registerUniformSetter('audio', setter);
}

// Component composes them
const ascii = useVideoToAscii(options);
useAsciiMouseEffect(ascii, mouseOptions);
useAsciiAudio(ascii, audioOptions);
```

---

### Decision 4: Hidden Video Element

**Alternative**: Use `HTMLVideoElement` directly and sync manually
- Show the video element, draw ASCII over it
- Or use `canvas.captureStream()` to get frames

**Chosen Approach**: Completely hidden `<video>` element, only show ASCII canvas

**Rationale**:
- **Clean Rendering**: User only sees ASCII, no double-vision effect
- **Performance**: No need to render both video and canvas
- **Control**: Can mute video while still using audio for effects
- **Simplicity**: Video element just feeds frames, display is separate

**Architecture**:
```
<video> (hidden) ──┐
                    ├── useVideoToAscii ── ASCII Canvas (visible)
Audio (muted)  ────┘
                    └── Audio Effects ── Modulate brightness
```

---

## System Flow Summary

### Initialization Flow

```
Component Mount
    ↓
useVideoToAscii Mount
    ↓
Create refs (canvas, video, WebGL context)
    ↓
Video loads metadata (loadedmetadata event)
    ↓
initWebGL()
    ├─ Get WebGL2 context
    ├─ Compile shaders
    ├─ Create program
    ├─ Setup fullscreen quad
    ├─ Create video texture
    ├─ Create ASCII atlas
    ├─ Cache uniform locations
    ├─ Set static uniforms
    └─ Set isReady = true
    ↓
Feature hooks register uniform setters
    ↓
Auto-play if enabled
    ↓
Video plays → play event
    ↓
Start render loop
```

### Per-Frame Flow

```
requestAnimationFrame()
    ↓
render()
    ├─ Upload video frame to GPU (texImage2D)
    ├─ Generate mipmaps
    ├─ Bind textures
    ├─ Call all feature uniform setters
    │   ├─ Mouse: update cursor position
    │   ├─ Audio: analyze frequency, update volume
    │   └─ Ripple: update ripple data
    ├─ Draw quad (TRIANGLES, 6 vertices)
    │   ↓
    │   Fragment Shader executes (GPU)
    │   ├─ For each pixel:
    │   │   ├─ Find ASCII cell
    │   │   ├─ Sample video at cell center
    │   │   ├─ Calculate brightness
    │   │   ├─ Apply audio modulation
    │   │   ├─ Add mouse glow
    │   │   ├─ Add ripple effect
    │   │   ├─ Map to character index
    │   │   ├─ Sample atlas texture
    │   │   └─ Mix colors
    │   └─ Output to framebuffer
    ├─ Update FPS stats
    └─ Schedule next frame
```

---

## Performance Characteristics

### Time Budget (60 FPS target)

```
Total budget: 16.67ms per frame

Breakdown:
├─ JavaScript overhead:      ~1-2ms
│  ├─ Event handling
│  ├─ State updates
│  └─ Hook function calls
├─ WebGL state changes:       ~0.5-1ms
│  ├─ Uniform updates
│  └─ Texture binds
├─ Texture upload:            ~1-2ms
│  └─ texImage2D + mipmap
├─ Shader execution:          ~5-10ms
│  └─ Fragment shader per pixel
└─ Draw call:                 <0.1ms
   └─ drawArrays

Total:                       ~8-15ms
Margin:                      ~2-8ms
```

### Bottlenecks & Optimizations

| Bottleneck | Impact | Optimization Used |
|------------|--------|------------------|
| Fragment shader complexity | High | Simplified brightness calc |
| Texture sampling | Medium | Mipmapping for quality |
| Uniform lookups | Low | Cached at init |
| JavaScript GC | Low | Minimize allocations |
| Audio analysis | Low | Small FFT size (256) |

### Performance Scaling

```
Resolution vs FPS (approximate):

640×480:    60 FPS  (CPU: 5%,  GPU: 30%)
1280×720:   50 FPS  (CPU: 5%,  GPU: 50%)
1920×1080:  35 FPS  (CPU: 8%,  GPU: 70%)
2560×1440:  20 FPS  (CPU: 10%, GPU: 90%)

GPU bound at higher resolutions
```

---

## Next Steps

Now that you understand the high-level architecture:

1. **Deep dive into the core**: Read `code-walkthroughs/webgl-setup.md`
2. **Understand the shader**: Read `code-walkthroughs/ascii-rendering.md`
3. **Study features**: Read `code-walkthroughs/feature-hooks.md`
4. **Trace data flow**: Read `architecture/data-flow.md`

---

**Summary**: The video2ascii architecture demonstrates production-quality WebGL patterns while remaining accessible for learning. The modular design, GPU-first approach, and careful performance optimizations make it an excellent reference for building real-time graphics applications in React.