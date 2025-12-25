# Getting Started Guide

Welcome to the video2ascii learning journey! This guide will walk you through the codebase step-by-step, helping you understand how WebGL, React, and real-time video processing work together.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Learning Path](#learning-path)
- [Project Structure](#project-structure)
- [Key Concepts](#key-concepts)
- [Hands-On Exercises](#hands-on-exercises)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Prerequisites

### Required Knowledge
Before diving in, you should be comfortable with:

- **JavaScript/TypeScript**: Basic syntax, functions, objects, arrays
- **React**: Components, hooks (`useState`, `useEffect`, `useRef`), props
- **HTML/CSS**: Basic DOM manipulation

### Helpful Background (Not Required)
These will help but aren't strictly necessary:
- **WebGL**: If you know it, great! If not, we'll learn together
- **GLSL/Shaders**: We'll cover this from scratch
- **Computer Graphics**: Helpful but not required
- **Audio Processing**: The Web Audio API will be explained

### Development Tools
- Node.js (v16 or later)
- A code editor (VS Code recommended)
- Modern web browser (Chrome, Firefox, or Safari)

---

## Quick Start

### Step 1: Clone and Install

```bash
# Navigate to the project directory
cd video2ascii

# Install dependencies
npm install
```

### Step 2: Build the Library

```bash
npm run build
```

This creates the compiled JavaScript in the `dist/` folder.

### Step 3: Run the Demo

```bash
# Using Bun (recommended)
bun run demo.ts

# Or using Node (if Bun isn't available)
npm run demo
```

The demo will:
1. Start a local web server
2. Open your browser to `http://localhost:3000`
3. Display the `born.mp4` video as ASCII art

### Step 4: Experiment!

Try moving your mouse over the video to see the glow effect. Click to see ripples. Notice how the characters change based on brightness.

---

## Learning Path

Follow this path to systematically learn the codebase. Each section builds on the previous ones.

### Phase 1: Understanding the Basics (1-2 hours)

**Goal**: Understand what the project does and how it's organized.

1. **Read the README** (`README.md`)
   - Learn the purpose of the library
   - Understand the available props
   - Try the demo and experiment with props

2. **Explore the Project Structure** (see [Project Structure](#project-structure) below)
   - Understand the folder layout
   - Identify entry points
   - Note the separation of concerns

3. **Study the Entry Point** (`src/index.ts`)
   - See what's exported
   - Understand the public API

**Expected Outcome**: You can explain what video2ascii does and identify the main files.

---

### Phase 2: Character Sets (30 minutes)

**Goal**: Understand how ASCII characters are organized.

**File**: `src/lib/ascii-charsets.ts`

```typescript
// Read this file and understand:
// 1. How characters are ordered (dark → light)
// 2. What character sets are available
// 3. How to add a new character set
```

**Key Concepts**:
- Characters are ordered by brightness
- Darker characters first (spaces, dots)
- Brighter characters last (hash, at sign)
- The shader maps brightness to character index

**Exercise**: Add your own character set!
```typescript
myCustom: {
  name: "My Custom",
  chars: " .:-=+*#%@",
}
```

---

### Phase 3: Types and Interfaces (30 minutes)

**Goal**: Understand the type system and data structures.

**File**: `src/lib/webgl/types.ts`

This file defines all the TypeScript types used throughout the project.

**Key Types to Understand**:

```typescript
// 1. Configuration options
export interface UseVideoToAsciiOptions {
  numColumns?: number;      // Grid width
  colored?: boolean;       // Color vs green terminal
  brightness?: number;     // Brightness multiplier
  charset?: CharsetKey;    // Which character set
  // ... more options
}

// 2. Core context (what the core hook provides)
export interface AsciiContext {
  containerRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  // ... WebGL refs and methods
}

// 3. Feature-specific types
export interface UseAsciiMouseEffectOptions {
  enabled?: boolean;
  trailLength?: number;
}
```

**Why This Matters**:
- Types document the API
- They prevent bugs at compile time
- They make the code self-documenting

---

### Phase 4: The Component (1 hour)

**Goal**: Understand how the React component orchestrates everything.

**File**: `src/components/VideoToAscii.tsx`

**Key Concepts**:

1. **`forwardRef` Pattern**
   ```typescript
   export const Video2Ascii = forwardRef<
     { videoRef: React.RefObject<HTMLVideoElement> },
     VideoToAsciiProps
   >(function Video2Ascii(props, ref) {
     // ...
     useImperativeHandle(ref, () => ({
       videoRef: videoRef,
     }));
   });
   ```
   - Allows parent to access the video element
   - Exposes imperative API

2. **Hook Composition**
   ```typescript
   const ascii = useVideoToAscii(options);
   useAsciiMouseEffect(ascii, mouseOptions);
   useAsciiRipple(ascii, rippleOptions);
   useAsciiAudio(ascii, audioOptions);
   ```
   - Core hook provides context
   - Feature hooks register with core
   - Clean separation of concerns

3. **Hidden Video Element**
   ```typescript
   <video
     ref={videoRef}
     src={src}
     muted={audioEffect === 0}
     loop
     playsInline
     style={{ display: "none" }}  // Hidden!
   />
   ```
   - Video is just a data source
   - Not rendered to screen
   - Provides frames for WebGL

**Exercise**: Add a new prop to the component:
```typescript
// 1. Add prop to interface
borderRadius?: number;

// 2. Apply it to the container
<div
  ref={containerRef}
  style={{ borderRadius }}
>
```

---

### Phase 5: Core Hook - Part 1: Initialization (2 hours)

**Goal**: Understand how WebGL is set up.

**File**: `src/hooks/useVideoToAscii.ts`

Focus on the `initWebGL()` function and initialization logic.

**Step-by-Step Breakdown**:

1. **Canvas Setup**
   ```typescript
   const canvas = canvasRef.current;
   canvas.width = pixelWidth;
   canvas.height = pixelHeight;
   ```
   - Canvas size determines output resolution
   - Pixels = grid cells × cell size

2. **Get WebGL2 Context**
   ```typescript
   const gl = canvas.getContext("webgl2", {
     antialias: false,
     preserveDrawingBuffer: false,
   });
   ```
   - `webgl2` provides better features than `webgl1`
   - `antialias: false` for performance (we're doing pixel art anyway)

3. **Compile Shaders**
   ```typescript
   const vertexShader = compileShader(gl, VERTEX_SHADER, gl.VERTEX_SHADER);
   const fragmentShader = compileShader(gl, FRAGMENT_SHADER, gl.FRAGMENT_SHADER);
   ```
   - Shaders are small programs that run on the GPU
   - Vertex shader: positions geometry
   - Fragment shader: colors pixels (this does all the ASCII work!)

4. **Create Program**
   ```typescript
   const program = createProgram(gl, vertexShader, fragmentShader);
   gl.useProgram(program);
   ```
   - Links shaders together
   - Activates the program

5. **Create Fullscreen Quad**
   ```typescript
   createFullscreenQuad(gl, program);
   ```
   - Two triangles covering the entire canvas
   - Every pixel will be processed by the fragment shader

6. **Create Textures**
   ```typescript
   videoTextureRef.current = createVideoTexture(gl);
   atlasTextureRef.current = createAsciiAtlas(gl, chars, fontSize);
   ```
   - Video texture: holds current video frame
   - Atlas texture: holds all ASCII characters

**Key Insight**: All this setup happens **once** at initialization. The per-frame work is minimal.

---

### Phase 6: Core Hook - Part 2: Render Loop (2 hours)

**Goal**: Understand the animation loop.

**File**: `src/hooks/useVideoToAscii.ts`

Focus on the `render()` function.

**The Render Loop**:

```typescript
const render = useCallback(() => {
  // 1. Upload video frame
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, videoTextureRef.current);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
  
  // 2. Call all feature setters
  for (const setter of uniformSettersRef.current.values()) {
    setter(gl, program, locations);
  }
  
  // 3. Draw (triggers shader)
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  
  // 4. Schedule next frame
  animationRef.current = requestAnimationFrame(render);
}, [/* dependencies */]);
```

**What Happens Each Frame**:

1. **Upload Video Frame** (~1-2ms)
   - `texImage2D` copies video frame to GPU
   - About 8 MB for 1080p video

2. **Feature Updates** (~0.5ms)
   - Mouse position updates
   - Audio analysis
   - Ripple animations

3. **Draw Call** (triggers GPU processing)
   - `drawArrays` tells GPU to draw the quad
   - Fragment shader runs for **every pixel in parallel**

4. **Schedule Next Frame**
   - `requestAnimationFrame` schedules next loop iteration
   - Browser optimizes for 60 FPS

**Performance Budget**:
- Total: 16.67ms per frame (60 FPS)
- JavaScript: 2-3ms
- GPU: 10-12ms
- Browser overhead: 1-2ms

---

### Phase 7: WebGL Utilities (1 hour)

**Goal**: Understand the low-level WebGL helper functions.

**File**: `src/lib/webgl/utils.ts`

**Key Functions**:

1. **`compileShader()`**
   ```typescript
   function compileShader(gl, source, type) {
     const shader = gl.createShader(type);
     gl.shaderSource(shader, source);
     gl.compileShader(shader);
     return shader;
   }
   ```
   - Compiles GLSL source code
   - Returns a shader object

2. **`createAsciiAtlas()`** (Important!)
   ```typescript
   function createAsciiAtlas(gl, chars, charSize) {
     // 1. Create offscreen canvas
     const canvas = document.createElement("canvas");
     canvas.width = charSize * chars.length;
     canvas.height = charSize;
     
     // 2. Draw all characters
     const ctx = canvas.getContext("2d");
     for (let i = 0; i < chars.length; i++) {
       ctx.fillText(chars[i], x, y);
     }
     
     // 3. Upload to GPU
     const texture = gl.createTexture();
     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
     return texture;
   }
   ```
   - Pre-renders all ASCII characters
   - Creates a horizontal strip of characters
   - Uploads once, reused every frame
   - **Huge performance optimization!**

3. **`calculateGridDimensions()`**
   ```typescript
   function calculateGridDimensions(videoWidth, videoHeight, cols) {
     const aspectRatio = videoWidth / videoHeight;
     const rows = Math.round(cols / aspectRatio / 2);  // /2 for char aspect ratio
     return { cols, rows };
   }
   ```
   - Calculates grid based on video aspect ratio
   - Divides by 2 because characters are ~2x taller than wide
   - Preserves video proportions

---

### Phase 8: The Fragment Shader (3 hours) ⭐

**Goal**: Understand the core ASCII conversion algorithm.

**File**: `src/lib/webgl/shaders/fragment.glsl`

This is where the magic happens! The fragment shader runs on the GPU and processes every pixel in parallel.

**Understanding GLSL**:

GLSL (OpenGL Shading Language) looks like C but runs on the GPU:

```glsl
#version 300 es  // Use OpenGL ES 3.0
precision highp float;  // High precision floats

uniform sampler2D u_video;      // Input video texture
uniform sampler2D u_asciiAtlas;  // Character atlas
uniform vec2 u_resolution;      // Canvas resolution
uniform vec2 u_gridSize;         // Grid dimensions
uniform float u_numChars;        // Number of characters

in vec2 v_texCoord;  // Texture coordinate from vertex shader
out vec4 fragColor;   // Output color

void main() {
  // Shader code here - runs for every pixel!
}
```

**Key Variables**:
- `uniform`: Input from JavaScript (same for all pixels)
- `in`: Input from vertex shader (different per pixel)
- `out`: Output color (what's drawn to screen)

**Step-by-Step Shader Algorithm**:

1. **Find ASCII Cell**
   ```glsl
   vec2 cellCoord = floor(v_texCoord * u_gridSize);
   ```
   - Converts pixel coordinate to grid coordinate
   - Example: pixel (640, 360) → grid cell (40, 20) in 80×40 grid

2. **Sample Video at Cell Center**
   ```glsl
   vec2 cellCenter = (cellCoord + 0.5) / u_gridSize;
   vec4 videoColor = texture(u_video, cellCenter);
   ```
   - Samples the video at the center of the cell
   - All pixels in the same cell get the same video color
   - This creates the "blocky" ASCII look

3. **Calculate Brightness**
   ```glsl
   float baseBrightness = dot(videoColor.rgb, vec3(0.299, 0.587, 0.114));
   ```
   - Converts RGB to luminance (brightness)
   - Formula: `0.299*R + 0.587*G + 0.114*B`
   - Weights based on human eye sensitivity
   - Result: 0.0 (dark) to 1.0 (bright)

4. **Map Brightness to Character**
   ```glsl
   float charIndex = floor(brightness * (u_numChars - 0.001));
   ```
   - Maps brightness [0,1] to character index [0, numChars-1]
   - Bright pixels → later characters (@, %, #)
   - Dark pixels → earlier characters (space, ., -)

5. **Sample Character from Atlas**
   ```glsl
   float atlasX = charIndex / u_numChars;
   vec2 cellPos = fract(v_texCoord * u_gridSize);
   vec2 atlasCoord = vec2(atlasX + cellPos.x / u_numChars, cellPos.y);
   vec4 charColor = texture(u_asciiAtlas, atlasCoord);
   ```
   - Calculates where to sample in the atlas texture
   - `charColor.r = 1.0` for character pixels
   - `charColor.r = 0.0` for background pixels

6. **Mix Background and Text**
   ```glsl
   vec3 bgColor = baseColor * 0.2;
   vec3 textColor = baseColor * 1.2;
   vec3 finalColor = mix(bgColor, textColor, charColor.r);
   ```
   - Uses `charColor.r` to interpolate
   - Background: dim video color
   - Text: bright video color

7. **Output**
   ```glsl
   fragColor = vec4(finalColor, 1.0);
   ```
   - Final color written to framebuffer
   - GPU displays it on canvas

**Visualizing the Shader**:

```
Original Video:      Shader Processing:       ASCII Output:
█████████████        
██████░░░░░░░   →   Cell brightness    →   ░░
█████████████        Map to character        ██
░░░░░░██████        Sample atlas           ░░
```

**Exercise**: Modify the shader to use only 4 colors (like a retro terminal):

```glsl
vec3 palette[4] = vec3[](
  vec3(0.0, 0.0, 0.0),    // Black
  vec3(0.0, 0.5, 0.0),    // Dark green
  vec3(0.0, 1.0, 0.0),    // Green
  vec3(1.0, 1.0, 1.0)     // White
);

int colorIndex = int(brightness * 3.99);
vec3 baseColor = palette[colorIndex];
```

---

### Phase 9: Feature Hooks (2 hours each)

**Goal**: Understand how modular features work.

#### 9.1 Mouse Effect

**File**: `src/hooks/useAsciiMouseEffect.ts`

**How It Works**:
1. Tracks mouse position in normalized coordinates [0,1]
2. Maintains a trail of previous positions
3. Registers a uniform setter to update shader
4. Shader calculates distance-based glow

**Key Code**:
```typescript
const onMouseMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const newPos = {
    x: (e.clientX - rect.left) / rect.width,  // 0-1
    y: (e.clientY - rect.top) / rectHeight,  // 0-1
  };
  
  trailRef.current.unshift({ ...mouseRef.current });
  mouseRef.current = newPos;
};
```

**Shader Glow Calculation**:
```glsl
float cellDist = length(thisCell - mouseCell);
if (cellDist <= cursorRadius) {
  cursorGlow += 1.0 - cellDist / cursorRadius;
}
```

**Exercise**: Change the cursor from a circle to a square:
```glsl
// Instead of length(), use max()
float cellDist = max(
  abs(thisCell.x - mouseCell.x),
  abs(thisCell.y - mouseCell.y)
);
```

---

#### 9.2 Audio Effect

**File**: `src/hooks/useAsciiAudio.ts`

**How It Works**:
1. Connects video to Web Audio API
2. Uses `AnalyserNode` to get frequency data
3. Calculates average volume
4. Passes volume to shader
5. Shader modulates brightness based on audio

**Audio Graph**:
```
Video Element
    ↓
createMediaElementSource()
    ↓
AnalyserNode (extracts frequency data)
    ↓
destination (speakers)
```

**Volume Calculation**:
```typescript
analyzer.getByteFrequencyData(dataArray);
let sum = 0;
for (let i = 0; i < dataArray.length; i++) {
  sum += dataArray[i];  // 0-255
}
const average = sum / dataArray.length / 255;  // Normalize to 0-1

// Smooth to prevent jitter
volumeRef.current = volumeRef.current * 0.7 + average * 0.3;
```

**Shader Modulation**:
```glsl
// Silence: 0.3x brightness
// Loud: 5.0x brightness
float audioMultiplier = mix(0.3, 5.0, u_audioLevel);
float audioModulated = baseBrightness * audioMultiplier;

// Blend based on reactivity
float brightness = mix(baseBrightness, audioModulated, u_audioReactivity);
```

**Exercise**: Make the audio effect color-based instead of brightness:
```glsl
// High volume = red, low volume = blue
float audioColor = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), u_audioLevel);
vec3 finalColor = mix(baseColor, audioColor, u_audioReactivity);
```

---

#### 9.3 Ripple Effect

**File**: `src/hooks/useAsciiRipple.ts`

**How It Works**:
1. Stores array of active ripples
2. Each ripple has position and start time
3. On click, adds new ripple
4. Shader calculates expanding ring based on age

**Ripple Data**:
```typescript
interface Ripple {
  x: number;         // Click X position [0-1]
  y: number;         // Click Y position [0-1]
  startTime: number; // When clicked (seconds)
}
```

**Shader Animation**:
```glsl
float age = u_time - ripple.z;        // How old is the ripple?
float radius = age * u_rippleSpeed;  // Current radius
float distance = length(pixelCell - rippleOrigin); // Distance from click

// Only glow at the ring edge
float distFromEdge = abs(distance - radius);
if (distFromEdge < ringThickness) {
  float pop = 1.0 - distFromEdge / ringThickness;
  rippleGlow += pop;
}
```

**Exercise**: Change ripples to be filled circles instead of rings:
```glsl
// Instead of distFromEdge, use distance directly
if (distance <= radius) {
  float fill = 1.0 - distance / radius;
  rippleGlow += fill * 0.5;
}
```

---

## Project Structure

```
video2ascii/
├── src/
│   ├── components/
│   │   └── VideoToAscii.tsx      # Main React component
│   ├── hooks/
│   │   ├── useVideoToAscii.ts    # Core WebGL hook
│   │   ├── useAsciiMouseEffect.ts# Mouse glow effect
│   │   ├── useAsciiRipple.ts     # Click ripple effect
│   │   └── useAsciiAudio.ts      # Audio reactivity
│   ├── lib/
│   │   ├── ascii-charsets.ts     # Character sets
│   │   └── webgl/
│   │       ├── index.ts          # WebGL utilities export
│   │       ├── types.ts          # TypeScript types
│   │       ├── utils.ts          # WebGL helper functions
│   │       └── shaders/
│   │           ├── vertex.glsl   # Vertex shader (geometry)
│   │           └── fragment.glsl # Fragment shader (pixels)
│   └── index.ts                  # Public API exports
├── LEARNING_DOCS/                # This learning documentation
│   ├── README.md
│   ├── architecture/              # Architecture docs
│   └── code-walkthroughs/         # Detailed code explanations
├── package.json                   # Dependencies and scripts
└── README.md                      # Project overview
```

---

## Key Concepts

### 1. WebGL Architecture

**CPU vs GPU Processing**:

| Task | CPU (JavaScript) | GPU (WebGL Shader) |
|------|------------------|-------------------|
| Pixel manipulation | Slow (sequential) | Fast (parallel) |
| Video frame upload | Necessary | N/A |
| ASCII conversion | 10-20 FPS | 30-60 FPS |
| Effect calculations | JavaScript overhead | Built into shader |

**Why WebGL?**
- Processes millions of pixels in parallel
- No JavaScript overhead per pixel
- Native GPU performance
- Real-time effects possible

### 2. Hook Patterns

**useRef vs useState**:
```typescript
// useState: Triggers re-render when changed
const [isReady, setIsReady] = useState(false);

// useRef: Does NOT trigger re-render
const glRef = useRef<WebGL2RenderingContext | null>(null);
```

**When to use which?**
- Use `useState` for data that needs UI updates
- Use `useRef` for data that should persist without re-renders
- WebGL resources should always be in refs!

** useCallback vs useRef**:
```typescript
// useCallback: Function with dependencies
const render = useCallback(() => {
  // Function body
}, [dependencies]);  // Recreates when dependencies change

// Ref: Mutable value that doesn't trigger updates
const animationRef = useRef<number>(0);
animationRef.current = requestAnimationFrame(render);
```

### 3. Uniform Registration Pattern

The plugin architecture:
```typescript
// Core hook provides registration
const registerUniformSetter = useCallback((id, setter) => {
  uniformSettersRef.current.set(id, setter);
}, []);

// Feature hook registers itself
useEffect(() => {
  const setter = (gl, program, locations) => {
    gl.uniform2f(locations.u_mouse, x, y);
  };
  ascii.registerUniformSetter('mouse', setter);
  
  return () => ascii.unregisterUniformSetter('mouse');
}, [ascii]);

// Core hook calls all setters every frame
for (const setter of uniformSettersRef.current.values()) {
  setter(gl, program, locations);
}
```

**Benefits**:
- Core doesn't need to know about features
- Features are self-contained
- Easy to add new features
- Clean separation of concerns

### 4. Texture Atlas Optimization

**Problem**: Rendering text with `ctx.fillText()` is slow
**Solution**: Pre-render all characters to a texture

```
Without Atlas:                With Atlas:
For each character:           For each frame:
  ctx.fillText(char)            Upload video frame
  10,000+ draw calls           Sample atlas (already there)
  → Slow (5-15 FPS)             → Fast (30-60 FPS)
```

---

## Hands-On Exercises

### Exercise 1: Add a New Character Set

**Goal**: Create a custom character set and use it.

**Steps**:
1. Open `src/lib/ascii-charsets.ts`
2. Add a new entry to `ASCII_CHARSETS`:
```typescript
export const ASCII_CHARSETS = {
  // ... existing sets ...
  
  matrix: {
    name: "Matrix",
    chars: " ｦｱｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ",
  },
} as const;
```

3. Update the `CharsetKey` type automatically updates

4. Test it:
```tsx
<Video2Ascii src="/video.mp4" charset="matrix" />
```

**What you learned**:
- How character sets are defined
- The relationship between character order and brightness
- How TypeScript infers types from const objects

---

### Exercise 2: Change Mouse Effect Shape

**Goal**: Change the cursor from a circle to a diamond.

**Steps**:
1. Open `src/lib/webgl/shaders/fragment.glsl`
2. Find the mouse glow calculation
3. Replace the distance calculation:
```glsl
// Original: Circular
// float cellDist = length(thisCell - mouseCell);

// New: Diamond (Manhattan distance)
float cellDist = abs(thisCell.x - mouseCell.x) + abs(thisCell.y - mouseCell.y);
```

4. Adjust the radius:
```glsl
if (cellDist <= cursorRadius * 1.5) {  // Diamond needs larger radius
  cursorGlow += 1.0 - cellDist / (cursorRadius * 1.5);
}
```

**What you learned**:
- How distance functions affect glow shapes
- How to modify GLSL code
- How to test shader changes in real-time

---

### Exercise 3: Add a Visualizer

**Goal**: Display audio frequency bars at the bottom.

**Steps**:
1. Create a new uniform in the shader:
```glsl
uniform float u_frequencyData[128];  // Frequency bins
```

2. In `useAsciiAudio`, update the uniform:
```typescript
const uniformSetter = (gl, program, locations) => {
  analyzer.getByteFrequencyData(dataArray);
  for (let i = 0; i < dataArray.length; i++) {
    gl.uniform1f(locations.u_frequencyData[i], dataArray[i] / 255);
  }
};
```

3. In the shader, draw bars:
```glsl
// Find which bin this pixel is in
float binIndex = floor(v_texCoord.x * 128.0);
float frequency = u_frequencyData[int(binIndex)];

// Draw if pixel is below the bar
if (v_texCoord.y < frequency * 0.3) {
  fragColor = vec4(0.0, 1.0, 0.0, 1.0);
}
```

**Challenge**: Make the bars colorful based on frequency!

**What you learned**:
- How to pass arrays to shaders
- How to visualize audio data
- How to combine effects

---

### Exercise 4: Performance Optimization

**Goal**: Measure and optimize performance.

**Steps**:
1. Enable stats display:
```tsx
<Video2Ascii src="/video.mp4" showStats={true} />
```

2. Note the FPS at different resolutions:
```tsx
// Try different numColumns values
<Video2Ascii src="/video.mp4" numColumns={80} />
<Video2Ascii src="/video.mp4" numColumns={120} />
<Video2Ascii src="/video.mp4" numColumns={200} />
```

3. Experiment with performance settings:
```glsl
// In shader, reduce quality for speed
// Replace highp with mediump
precision mediump float;  // Instead of highp
```

4. Measure the difference:
   - Create a table of FPS vs. numColumns
   - Note when performance drops below 60 FPS
   - Identify bottlenecks

**What you learned**:
- How to measure WebGL performance
- What factors affect performance
- How to trade quality for speed

---

## Troubleshooting

### Issue: "WebGL2 not supported"

**Cause**: Browser doesn't support WebGL2

**Solution**:
- Update your browser
- Use Chrome, Firefox, or Safari (latest versions)
- Check browser support: https://caniuse.com/webgl2

---

### Issue: Low FPS (< 30)

**Causes and Solutions**:

1. **Too many columns**
   ```tsx
   // Slow
   <Video2Ascii numColumns={200} />
   
   // Faster
   <Video2Ascii numColumns={100} />
   ```

2. **High resolution video**
   ```tsx
   // Slow (1080p)
   <video src="1080p.mp4" />
   
   // Faster (720p)
   <video src="720p.mp4" />
   ```

3. **Too many effects enabled**
   ```tsx
   // Slow
   <Video2Ascii
     enableMouse={true}
     enableRipple={true}
     audioEffect={100}
   />
   
   // Faster
   <Video2Ascii
     enableMouse={true}
     enableRipple={false}
     audioEffect={50}
   />
   ```

---

### Issue: Audio not working

**Cause**: Browser autoplay policy

**Solution**:
- Mute the video:
```tsx
<Video2Ascii
  src="/video.mp4"
  audioEffect={0}  // Muted, no audio effect
/>
```

- Or add a user interaction first:
```tsx
const [started, setStarted] = useState(false);

return started ? (
  <Video2Ascii src="/video.mp4" audioEffect={50} />
) : (
  <button onClick={() => setStarted(true)}>Start</button>
);
```

---

### Issue: Characters don't look right

**Cause**: Character aspect ratio mismatch

**Solution**:
The character aspect ratio is fixed at 0.6 in the code. If your video has an unusual aspect ratio, you might need to adjust:

```typescript
// In src/lib/webgl/types.ts
export const CHAR_WIDTH_RATIO = 0.6;  // Try 0.5 or 0.7
```

---

## Next Steps

After completing this guide, you should:

### Build on What You've Learned

1. **Add a New Feature**
   - Idea: Keyboard effect (typing shows glow)
   - Idea: Gradient overlay (custom colors)
   - Idea: Particle effects (sparks on loud audio)

2. **Optimize Performance**
   - Implement LOD (level of detail) for distant characters
   - Use frame skipping for slow devices
   - Implement quality presets (low/medium/high)

3. **Create Variants**
   - Make a "terminal mode" (green only, monospace)
   - Create a "digital rain" effect
   - Build a "CRT monitor" effect with scanlines

### Explore Related Topics

1. **Advanced WebGL**
   - Compute shaders for GPGPU
   - Transform feedback
   - Multiple render targets

2. **React Performance**
   - useMemo for expensive calculations
   - useCallback for event handlers
   - React.memo for component memoization

3. **Audio Processing**
   - Advanced frequency analysis (FFT)
   - Beat detection algorithms
   - Audio synthesis

3. **Computer Graphics**
   - Post-processing effects
   - Image processing algorithms
   - Ray marching

### Contribute

Consider contributing to the project:
- Fix bugs you find
- Add new character sets
- Improve documentation
- Create examples and demos

---

## Resources

### Official Documentation
- [WebGL2 Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext)
- [GLSL Specification](https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language)
- [React Hooks](https://react.dev/reference/react)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

### Learning Resources
- [WebGL Fundamentals](https://webglfundamentals.org/)
- [The Book of Shaders](https://thebookofshaders.com/)
- [Learn WebGL](https://webgl2fundamentals.org/)

### Tools
- [ShaderToy](https://www.shadertoy.com/) - Play with shaders online
- [GLSL Sandbox](http://glslsandbox.com/) - Another shader playground
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/) - Profile your code

---

## Summary

Congratulations on completing the getting started guide! You've learned:

✅ How to set up and run the project
✅ The overall architecture and file structure
✅ How ASCII characters are mapped to brightness
✅ How WebGL shaders process pixels in parallel
✅ How the plugin architecture works
✅ How to add features and effects
✅ Performance optimization techniques
✅ Debugging and troubleshooting

You're now ready to:
- Modify the code to create your own effects
- Build similar WebGL-based applications
- Contribute to the project
- Teach others what you've learned

**Remember**: Learning graphics programming is a journey. Don't worry if you don't understand everything immediately. Experiment, break things, and learn from your mistakes.

Happy coding! 🚀