# Data Flow Documentation

## Table of Contents
- [Introduction](#introduction)
- [High-Level Data Flow](#high-level-data-flow)
- [Initialization Flow](#initialization-flow)
- [Per-Frame Render Flow](#per-frame-render-flow)
- [Feature-Specific Data Flows](#feature-specific-data-flows)
- [WebGL Data Pipeline](#webgl-data-pipeline)
- [Event Handling Flow](#event-handling-flow)
- [State Management Flow](#state-management-flow)
- [Performance Flow Considerations](#performance-flow-considerations)

---

## Introduction

Understanding data flow is crucial to grasping how video2ascii converts video to ASCII art in real-time. The system processes data through multiple stages:

1. **Input**: Video frames from HTML video element
2. **Processing**: JavaScript hooks analyze and prepare data
3. **GPU Upload**: Textures and uniforms sent to WebGL
4. **Shader Execution**: Parallel processing on GPU
5. **Output**: ASCII art rendered to canvas

This document traces the complete journey of data from source to destination.

---

## High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATA FLOW OVERVIEW                          │
└─────────────────────────────────────────────────────────────────┘

INPUT LAYER                    PROCESSING LAYER                  OUTPUT LAYER
────────────────              ─────────────────────             ────────────────
                                                                              
Video File                      JavaScript State                   Canvas        
    │                              │                                  │         
    ▼                              ▼                                  ▼         
┌──────────┐              ┌──────────────────┐              ┌──────────────┐
│  <video> │─────────────►│  useVideoToAscii │─────────────►│   WebGL     │
│  Element │  Frames      │  (Core Hook)     │  Commands    │   Context   │
└──────────┘              └────────┬─────────┘              └──────┬───────┘
                                   │                                  │         
                                   ▼                                  ▼         
                          ┌──────────────────┐              ┌──────────────┐
                          │  Feature Hooks   │─────────────►│  Fragment    │
                          │  - Mouse         │  Uniforms    │   Shader     │
                          │  - Audio         │              │  (GPU)       │
                          │  - Ripple        │              └──────┬───────┘
                          └──────────────────┘                      │         
                                                                  ▼         
                                                          ┌──────────────┐
                                                          │   ASCII Art  │
                                                          │   Displayed  │
                                                          └──────────────┘
```

### Data Types in Flow

| Stage | Data Type | Direction | Purpose |
|-------|-----------|-----------|---------|
| **Video Source** | HTMLVideoElement | → Hook | Provides raw video frames |
| **Audio Stream** | AudioContext | → Hook | Audio analysis data |
| **User Input** | Mouse/Keyboard Events | → Hooks | Interactive effects |
| **Props** | Component Props | → Hook | Configuration |
| **Uniforms** | JavaScript Numbers | → GPU | Shader parameters |
| **Textures** | Image Data | → GPU | Video frame + ASCII atlas |
| **Pixels** | RGBA Values | → Shader | Per-pixel processing |
| **Output** | Framebuffer | → Canvas | Final rendered image |

---

## Initialization Flow

The initialization flow happens once when the component mounts. It sets up all WebGL resources and data structures.

```
┌─────────────────────────────────────────────────────────────────┐
│                   INITIALIZATION DATA FLOW                       │
└─────────────────────────────────────────────────────────────────┘

1. Component Mount
   │
   ├─► Video2Ascii Component renders
   │   │
   │   ├─► useVideoToAscii() hook called
   │   │   │
   │   │   ├─► Create refs initialized:
   │   │   │   ├─ containerRef = null
   │   │   │   ├─ videoRef = null
   │   │   │   ├─ canvasRef = null
   │   │   │   ├─ glRef = null
   │   │   │   ├─ programRef = null
   │   │   │   ├─ videoTextureRef = null
   │   │   │   ├─ atlasTextureRef = null
   │   │   │   ├─ uniformLocationsRef = null
   │   │   │   └─ uniformSettersRef = Map()
   │   │   │
   │   │   ├─► State initialized:
   │   │   │   ├─ dimensions = { cols: 80, rows: 24 }
   │   │   │   ├─ stats = { fps: 0, frameTime: 0 }
   │   │   │   ├─ isReady = false
   │   │   │   └─ isPlaying = false
   │   │   │
   │   │   └─► Return context object with refs and methods
   │   │
   │   ├─► useAsciiMouseEffect() called (if enabled)
   │   │   │
   │   │   ├─► Initialize mouse tracking refs:
   │   │   │   ├─ mouseRef = { x: -1, y: -1 }
   │   │   │   └─ trailRef = []
   │   │   │
   │   │   └─► Register uniform setter with core
   │   │       └─► uniformSettersRef.set('mouse', setter)
   │   │
   │   ├─► useAsciiRipple() called (if enabled)
   │   │   │
   │   │   ├─► Initialize ripple tracking refs:
   │   │   │   └─ ripplesRef = []
   │   │   │
   │   │   └─► Register uniform setter with core
   │   │       └─► uniformSettersRef.set('ripple', setter)
   │   │
   │   └─► useAsciiAudio() called (if audioEffect > 0)
   │       │
   │       ├─► Initialize audio refs:
   │       │   ├─ audioContextRef = null
   │       │   ├─ analyzerRef = null
   │       │   ├─ sourceRef = null
   │       │   ├─ dataArrayRef = null
   │       │   └─ volumeRef = 0
   │       │
   │       └─► Register uniform setter with core
   │           └─► uniformSettersRef.set('audio', setter)
   │
   │
   2. Video Element Loaded (loadedmetadata event)
   │
   ├─► Video dimensions known: video.videoWidth × video.videoHeight
   │
   ├─► initWebGL() called
   │   │
   │   ├─► Calculate grid dimensions:
   │   │   └─► { cols, rows } = calculateGridDimensions(
   │   │           videoWidth, videoHeight, numColumns)
   │   │       Flow: aspectRatio → rows → setDimensions()
   │   │
   │   ├─► Set canvas size:
   │   │   ├─► pixelWidth = cols × charWidth
   │   │   ├─► pixelHeight = rows × fontSize
   │   │   └─► canvas.width = pixelWidth
   │   │       canvas.height = pixelHeight
   │   │
   │   ├─► Get WebGL2 context:
   │   │   └─► gl = canvas.getContext('webgl2')
   │   │       Flow: Canvas → WebGL2 Context
   │   │
   │   ├─► Compile shaders:
   │   │   ├─► vertexShader = compileShader(gl, VERTEX_SHADER, gl.VERTEX_SHADER)
   │   │   │   Flow: Shader source → GLSL compiler → Shader object
   │   │   │
   │   │   └─► fragmentShader = compileShader(gl, FRAGMENT_SHADER, gl.FRAGMENT_SHADER)
   │   │       Flow: Shader source → GLSL compiler → Shader object
   │   │
   │   ├─► Create program:
   │   │   └─► program = createProgram(gl, vertexShader, fragmentShader)
   │   │       Flow: Shaders → Linker → Program object
   │   │
   │   ├─► Create fullscreen quad geometry:
   │   │   └─► createFullscreenQuad(gl, program)
   │   │       Flow: Vertex data → Buffer → GPU memory
   │   │
   │   ├─► Create textures:
   │   │   ├─► videoTexture = createVideoTexture(gl)
   │   │   │   Flow: Create texture → Set parameters → Return handle
   │   │   │
   │   │   └─► atlasTexture = createAsciiAtlas(gl, chars, fontSize)
   │   │       Flow: Characters → Canvas → Texture → GPU
   │   │       Detailed:
   │   │           1. Create offscreen canvas
   │   │           2. For each character:
   │   │              ├─ ctx.fillText(char, x, y)
   │   │              └─ Draw to canvas
   │   │           3. texImage2D(atlasTexture, canvas)
   │   │           4. Upload to GPU
   │   │
   │   ├─► Cache uniform locations:
   │   │   └─► locations = cacheUniformLocations(gl, program)
   │   │       Flow: Program → getUniformLocation() → Cache Map
   │   │       Stored in: uniformLocationsRef.current
   │   │
   │   ├─► Set static uniforms (one-time setup):
   │   │   ├─► gl.uniform2f(u_resolution, pixelWidth, pixelHeight)
   │   │   ├─► gl.uniform2f(u_charSize, charWidth, fontSize)
   │   │   ├─► gl.uniform2f(u_gridSize, cols, rows)
   │   │   ├─► gl.uniform1f(u_numChars, chars.length)
   │   │   ├─► gl.uniform1f(u_brightness, brightness)
   │   │   ├─► gl.uniform1i(u_video, 0)    // Texture unit 0
   │   │   ├─► gl.uniform1i(u_asciiAtlas, 1)  // Texture unit 1
   │   │   └─► Initialize feature uniforms to disabled
   │   │       Flow: JavaScript → GPU uniform memory
   │   │
   │   ├─► Set viewport:
   │   │   └─► gl.viewport(0, 0, pixelWidth, pixelHeight)
   │   │       Flow: Coordinates → GPU viewport state
   │   │
   │   └─► Update state:
   │       └─► setIsReady(true)
   │
   │
   3. Component Ready for Rendering
   │
   └─► isReady = true
       ► Video ready to play
       ► WebGL resources initialized
       ► Feature hooks registered
       ► Ready for render loop
```

### Initialization Data Flow Diagram

```
┌─────────────┐
│ Video File  │
└──────┬──────┘
       │ loads
       ▼
┌─────────────┐
│  <video>    │
│  Element    │
└──────┬──────┘
       │ metadata loaded
       ▼
┌─────────────────────────────────┐
│   useVideoToAscii Hook         │
│                                 │
│  ┌─────────────────────────┐   │
│  │  Grid Calculation        │   │
│  │  videoWidth/videoHeight  │───┼──► { cols, rows }
│  │  aspectRatio            │   │
│  └─────────────────────────┘   │
│             │                  │
│             ▼                  │
│  ┌─────────────────────────┐   │
│  │  WebGL Setup             │   │
│  │  ├─ Get Context          │   │
│  │  ├─ Compile Shaders      │   │
│  │  ├─ Create Program       │   │
│  │  ├─ Create Quad          │   │
│  │  └─ Create Textures      │   │
│  └────────┬────────────────┘   │
│           │                      │
│           ▼                      │
│  ┌─────────────────────────┐   │
│  │  Texture Creation       │   │
│  │  Video Texture          │───┼──► Empty texture
│  │  Atlas Texture          │───┼──► Pre-rendered chars
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │  Uniform Caching         │   │
│  │  All 30+ uniforms       │───┼──► Cached locations
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │  Static Uniform Values  │   │
│  │  Resolution, grid size  │───┼──► GPU memory
│  │  Textures (bind units)  │───┼──► GPU memory
│  └─────────────────────────┘   │
└─────────────────────────────────┘
             │
             ▼
    ┌────────────────┐
    │  isReady=true  │
    └────────────────┘
```

---

## Per-Frame Render Flow

The render loop runs continuously while the video is playing, processing data at 60 FPS.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PER-FRAME DATA FLOW                          │
└─────────────────────────────────────────────────────────────────┘

Each Frame (60 FPS):
│
├─► requestAnimationFrame() called by browser
│   │
│   └─► render() callback executes (JavaScript)
│       │
│       ├─► Check if rendering should continue:
│       │   ├─ if (video.paused) → return
│       │   ├─ if (video.ended) → return
│       │   └─ if (!gl || !program) → return
│       │
│       ├─► START FRAME TIMING
│       │   └─► frameStart = performance.now()
│       │
│       ├─► PHASE 1: Upload Video Frame to GPU
│       │   │
│       │   ├─► Bind video texture
│       │   │   └─► gl.activeTexture(gl.TEXTURE0)
│       │   │       gl.bindTexture(gl.TEXTURE_2D, videoTextureRef.current)
│       │   │       Flow: Ref → Texture object → GPU texture unit 0
│       │   │
│       │   ├─► Upload current video frame
│       │   │   └─► gl.texImage2D(
│       │   │           gl.TEXTURE_2D,     // Target
│       │   │           0,                 // Mipmap level
│       │   │           gl.RGBA,           // Internal format
│       │   │           gl.RGBA,           // Source format
│       │   │           gl.UNSIGNED_BYTE,  // Data type
│       │   │           videoRef.current   // Video element
│       │   │       )
│       │   │       Flow: Video element → RGBA pixel data → GPU texture memory
│       │   │       Data: ~2MB for 720p (1920×1080×4 bytes)
│       │   │
│       │   └─► Generate mipmaps (quality optimization)
│       │       └─► gl.generateMipmap(gl.TEXTURE_2D)
│       │           Flow: GPU texture → Mipmap chain → GPU memory
│       │           Purpose: Smoother sampling when scaling
│       │
│       ├─► PHASE 2: Update Feature Uniforms
│       │   │
│       │   ├─► Call all registered uniform setters
│       │   │   └─► for (setter of uniformSettersRef.current.values()) {
│       │   │           setter(gl, program, uniformLocationsRef.current)
│       │   │       }
│       │   │       Flow: Iterate all features → Update GPU uniforms
│       │   │
│       │   ├─► Mouse Feature (useAsciiMouseEffect)
│       │   │   └─► gl.uniform2f(u_mouse, mouseRef.current.x, mouseRef.current.y)
│       │   │       gl.uniform1i(u_trailLength, trailRef.current.length)
│       │   │       for (i = 0; i < 24; i++) {
│       │   │           gl.uniform2f(u_trail[i], trail[i].x, trail[i].y)
│       │   │       }
│       │   │       Flow: JavaScript refs → GPU uniform arrays
│       │   │       Data: 2 floats (mouse) + 48 floats (trail) = 200 bytes
│       │   │
│       │   ├─► Audio Feature (useAsciiAudio)
│       │   │   ├─► Analyze audio (JavaScript → Analyser)
│       │   │   │   └─► analyzer.getByteFrequencyData(dataArrayRef.current)
│       │   │   │       Flow: Audio graph → Frequency data (256 values)
│       │   │   │       Data: 256 bytes per frame
│       │   │   │
│       │   │   ├─► Calculate volume
│       │   │   │   └─► average = sum(dataArray) / dataArray.length / 255
│       │   │   │       Flow: Frequency array → Scalar (0-1)
│       │   │   │
│       │   │   ├─► Smooth volume
│       │   │   │   └─► volumeRef.current = volumeRef.current * 0.7 + average * 0.3
│       │   │   │       Flow: Exponential moving average
│       │   │   │       Purpose: Prevent jitter
│       │   │   │
│       │   │   └─► Upload to GPU
│       │   │       └─► gl.uniform1f(u_audioLevel, volumeRef.current)
│       │   │           gl.uniform1f(u_audioReactivity, reactivity / 100)
│       │   │           gl.uniform1f(u_audioSensitivity, sensitivity / 100)
│       │   │           Flow: JavaScript → GPU uniforms
│       │   │           Data: 3 floats = 12 bytes
│       │   │
│       │   ├─► Ripple Feature (useAsciiRipple)
│       │   │   ├─► Update ripple ages
│       │   │   │   └─► currentTime = performance.now() / 1000
│       │   │   │       Filter out old ripples
│       │   │   │       Flow: Time calculation → Array filtering
│       │   │   │
│       │   │   └─► Upload ripples to GPU
│       │   │       └─► gl.uniform1f(u_time, currentTime)
│       │   │           gl.uniform1f(u_rippleEnabled, 1.0)
│       │   │           gl.uniform1f(u_rippleSpeed, speedRef.current)
│       │   │           for (i = 0; i < 8; i++) {
│       │   │               gl.uniform4f(u_ripples[i], x, y, startTime, enabled)
│       │   │           }
│       │   │           Flow: JavaScript ripple array → GPU vec4 array
│       │   │           Data: 8 × 4 floats = 128 bytes
│       │   │
│       │   └─► Update core uniforms
│       │       └─► gl.uniform1i(u_colored, colored ? 1 : 0)
│       │           gl.uniform1f(u_blend, blend / 100)
│       │           gl.uniform1f(u_highlight, highlight / 100)
│       │           gl.uniform1f(u_brightness, brightness)
│       │           Flow: Props → GPU uniforms
│       │           Data: 4 floats = 16 bytes
│       │
│       ├─► PHASE 3: Draw and Trigger Shader
│       │   │
│       │   ├─► Bind atlas texture
│       │   │   └─► gl.activeTexture(gl.TEXTURE1)
│       │   │       gl.bindTexture(gl.TEXTURE_2D, atlasTextureRef.current)
│       │   │       Flow: Ref → Texture object → GPU texture unit 1
│       │   │
│       │   └─► Issue draw call
│       │       └─► gl.drawArrays(gl.TRIANGLES, 0, 6)
│       │           Flow: Draw command → GPU rasterizer
│       │           Triggers: Vertex shader → Fragment shader per pixel
│       │
│       ├─► PHASE 4: Fragment Shader Execution (GPU)
│       │   │
│       │   └─► For each pixel (millions in parallel):
│       │       │
│       │       ├─► Step 1: Find ASCII cell
│       │       │   └─► cellCoord = floor(v_texCoord * u_gridSize)
│       │       │       Flow: Pixel coordinate → Grid cell (col, row)
│       │       │
│       │       ├─► Step 2: Sample video at cell center
│       │       │   └─► cellCenter = (cellCoord + 0.5) / u_gridSize
│       │       │       videoColor = texture(u_video, cellCenter)
│       │       │       Flow: Cell center → Video texture → RGBA color
│       │       │       Data: 4 floats per pixel
│       │       │
│       │       ├─► Step 3: Calculate base brightness
│       │       │   └─► baseBrightness = dot(videoColor.rgb, vec3(0.299, 0.587, 0.114))
│       │       │       Flow: RGB → Scalar (luminance)
│       │       │       Formula: 0.299*R + 0.587*G + 0.114*B
│       │       │       Purpose: Human eye perception
│       │       │
│       │       ├─► Step 4: Apply audio modulation
│       │       │   └─► audioMultiplier = mix(0.3, 5.0, u_audioLevel)
│       │       │       audioModulated = baseBrightness * audioMultiplier
│       │       │       brightness = mix(baseBrightness, audioModulated, u_audioReactivity)
│       │       │       Flow: Brightness → Audio-modulated → Final brightness
│       │       │
│       │       ├─► Step 5: Calculate mouse glow
│       │       │   └─► cursorGlow = 0.0
│       │       │       For each mouse position:
│       │       │           distance = length(cellCoord - mouseCell)
│       │       │           if (distance <= cursorRadius) {
│       │       │               glow = 1.0 - distance / cursorRadius
│       │       │               cursorGlow += glow
│       │       │           }
│       │       │       Flow: Distance calculation → Glow value
│       │       │
│       │       ├─► Step 6: Calculate ripple glow
│       │       │   └─► For each ripple:
│       │       │           age = u_time - ripple.z
│       │       │           radius = age * u_rippleSpeed
│       │       │           distance = length(cellCoord - ripple.xy)
│       │       │           if (distance is within ring) {
│       │       │               rippleGlow += glow
│       │       │           }
│       │       │       Flow: Time-based animation → Glow value
│       │       │
│       │       ├─► Step 7: Apply brightness multiplier
│       │       │   └─► adjustedBrightness = calculateWithMultiplier(brightness, u_brightness)
│       │       │       Flow: Raw brightness → User-adjusted brightness
│       │       │       Clamp to [0, 1]
│       │       │
│       │       ├─► Step 8: Map brightness to character index
│       │       │   └─► charIndex = floor(adjustedBrightness * (u_numChars - 0.001))
│       │       │       Flow: Brightness [0-1] → Character index [0-numChars-1]
│       │       │
│       │       ├─► Step 9: Sample character from atlas
│       │       │   └─► atlasX = charIndex / u_numChars
│       │       │       cellPos = fract(v_texCoord * u_gridSize)
│       │       │       atlasCoord = vec2(atlasX + cellPos.x / u_numChars, cellPos.y)
│       │       │       charColor = texture(u_asciiAtlas, atlasCoord)
│       │       │       Flow: Character index → Atlas coordinates → Character pixel
│       │       │       Data: 4 floats (RGBA) per pixel
│       │       │
│       │       ├─► Step 10: Determine output color
│       │       │   └─► if (u_colored) baseColor = videoColor.rgb
│       │       │       else baseColor = vec3(0.0, 1.0, 0.0)  // Green
│       │       │       Flow: Conditional → Base color
│       │       │
│       │       ├─► Step 11: Mix background and text
│       │       │   └─► bgColor = baseColor * (0.15 + u_highlight * 0.35)
│       │       │       textColor = baseColor * 1.2
│       │       │       finalColor = mix(bgColor, textColor, charColor.r)
│       │       │       Flow: Background + Text → Blended color
│       │       │       charColor.r = 1.0 for text pixels, 0.0 for background
│       │       │
│       │       ├─► Step 12: Add effects
│       │       │   └─► finalColor += cursorGlow * baseColor * 0.5
│       │       │       finalColor += rippleGlow * baseColor
│       │       │       Flow: Effects accumulation → Final color
│       │       │
│       │       ├─► Step 13: Blend with original video (if requested)
│       │       │   └─► blendedColor = mix(finalColor, videoColor.rgb, u_blend)
│       │       │       Flow: ASCII color + Video color → Output
│       │       │
│       │       └─► Step 14: Output
│       │           └─► fragColor = vec4(blendedColor, 1.0)
│       │               Flow: Final color → Framebuffer → Canvas
│       │
│       ├─► PHASE 5: Update Statistics
│       │   │
│       │   ├─► Calculate frame time
│       │   │   └─► frameEnd = performance.now()
│       │   │       frameTime = frameEnd - frameStart
│       │   │       Flow: Timestamps → Duration
│       │   │
│       │   ├─► Update frame counter
│       │   │   └─► frameCountRef.current++
│       │   │       frameTimesRef.current.push(frameTime)
│       │   │       Flow: Counter increment
│       │   │
│       │   ├─► Keep last 60 frame times
│       │   │   └─► if (frameTimes.length > 60) frameTimes.shift()
│       │   │       Flow: Ring buffer maintenance
│       │   │
│       │   └─► Calculate FPS every second
│       │       └─► if (now - lastFpsTime >= 1000ms) {
│       │           avgFrameTime = average(frameTimes)
│       │           fps = frameCount
│       │           setStats({ fps, frameTime: avgFrameTime })
│       │           onStats?.({ fps, frameTime: avgFrameTime })
│       │           frameCount = 0
│       │           lastFpsTime = now
│       │       }
│       │       Flow: Frame times → Average → FPS → State → Callback
│       │
│       └─► PHASE 6: Schedule Next Frame
│           └─► animationRef.current = requestAnimationFrame(render)
│               Flow: Browser scheduling → Next render call
│
│
│
END OF FRAME (repeat 60 times per second)
```

### Per-Frame Data Flow Visualization

```
┌───────────────────────────────────────────────────────────────┐
│                    FRAME TIMELINE (16.67ms)                    │
└───────────────────────────────────────────────────────────────┘

Time: 0ms
│
├─► requestAnimationFrame triggers
│
│   Time: 0-1ms
│   ▼
│   ┌─────────────────────────────────────┐
│   │ JavaScript: Upload Video Frame      │
│   │ • texImage2D()                       │
│   │ • ~1ms for 720p video                │
│   └─────────────────────────────────────┘
│
│   Time: 1-3ms
│   ▼
│   ┌─────────────────────────────────────┐
│   │ JavaScript: Update Uniforms          │
│   │ • Mouse position                    │
│   │ • Audio analysis                     │
│   │ • Ripple updates                     │
│   │ • ~2ms total                         │
│   └─────────────────────────────────────┘
│
│   Time: 3ms
│   ▼
│   ┌─────────────────────────────────────┐
│   │ GPU: Draw Call                      │
│   │ • drawArrays(TRIANGLES, 0, 6)       │
│   │ • Triggers shaders                  │
│   └─────────────────────────────────────┘
│
│   Time: 3-13ms
│   ▼
│   ┌─────────────────────────────────────┐
│   │ GPU: Fragment Shader (Parallel)     │
│   │ • Sample video texture               │
│   │ • Calculate brightness               │
│   │ • Apply audio modulation             │
│   │ • Add mouse glow                     │
│   │ • Add ripple effect                 │
│   │ • Sample atlas texture               │
│   │ • Mix colors                         │
│   │ • ~10ms for 720p (1.2M pixels)       │
│   └─────────────────────────────────────┘
│
│   Time: 13-14ms
│   ▼
│   ┌─────────────────────────────────────┐
│   │ JavaScript: Update Stats            │
│   │ • Calculate frame time               │
│   │ • Update FPS counter                 │
│   │ • ~1ms                               │
│   └─────────────────────────────────────┘
│
│   Time: 14-16ms
│   ▼
│   ┌─────────────────────────────────────┐
│   │ Browser: Compositing                 │
│   │ • GPU writes to framebuffer         │
│   │ • Canvas rendered to screen         │
│   │ • ~2ms                              │
│   └─────────────────────────────────────┘
│
│   Time: 16ms
│   ▼
│   ┌─────────────────────────────────────┐
│   │ Schedule Next Frame                 │
│   │ • requestAnimationFrame(render)     │
│   └─────────────────────────────────────┘
│
│   Total: ~16ms (60 FPS target) ████████████████████
│   Margin: ~0.67ms                    ░░
```

---

## Feature-Specific Data Flows

### Mouse Effect Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   MOUSE EFFECT DATA FLOW                        │
└─────────────────────────────────────────────────────────────────┘

User Interaction:
│
├─► Mouse moves over container
│   │
│   └─► onMouseMove(e) event handler called
│       │
│       ├─► Calculate normalized coordinates:
│       │   └─► rect = e.currentTarget.getBoundingClientRect()
│       │       x = (e.clientX - rect.left) / rect.width
│       │       y = (e.clientY - rect.top) / rect.height
│       │       Flow: Screen pixels → Normalized [0,1]
│       │
│       ├─► Update current position ref:
│       │   └─► mouseRef.current = { x, y }
│       │       Flow: Event handler → Ref (no re-render)
│       │
│       ├─► Update trail:
│       │   ├─► If (mouseRef.x >= 0) → Add old position to trail
│       │   │   └─► trailRef.current.unshift({ ...mouseRef.current })
│       │   │       Flow: Current pos → Trail array front
│       │   │
│       │   ├─► Cap trail length:
│       │   │   └─► if (trail.length > trailLength) trailRef.current.pop()
│       │   │       Flow: Array size management
│       │   │
│       │   └─► Update current position:
│       │       └─► mouseRef.current = newPos
│       │
│       └─► Triggered on every mouse move event
│           Frequency: ~60-120 Hz during movement
│
│
Per-Frame (during render loop):
│
├─► Uniform setter called by core hook
│   │
│   └─► Update GPU uniforms:
│       ├─► gl.uniform2f(u_mouse, mouseRef.current.x, mouseRef.current.y)
│       │   Flow: Ref → GPU → Shader
│       │
│       ├─► gl.uniform1i(u_trailLength, trailRef.current.length)
│       │   Flow: Array length → GPU
│       │
│       └─► for (i = 0; i < 24; i++) {
│               gl.uniform2f(u_trail[i], trail[i].x, trail[i].y)
│           }
│           Flow: Trail array → GPU array
│
│
Shader Processing (per pixel):
│
└─► Fragment shader uses mouse data:
    │
    ├─► Calculate cursor glow:
    │   └─► mouseCell = floor(u_mouse * u_gridSize)
    │       cellDist = length(thisCell - mouseCell)
    │       if (cellDist <= cursorRadius && u_mouse.x >= 0) {
    │           cursorGlow += 1.0 - cellDist / cursorRadius
    │       }
    │       Flow: Mouse uniform → Distance → Glow value
    │
    ├─► Calculate trail glow:
    │   └─► for (i = 0; i < 12; i++) {
    │           if (i >= u_trailLength) break
    │           trailPos = u_trail[i]
    │           if (trailPos.x < 0) continue
    │           
    │           trailCell = floor(trailPos * u_gridSize)
    │           trailDist = length(thisCell - trailCell)
    │           
    │           if (trailDist <= trailRadius) {
    │               fade = 1.0 - float(i) / float(u_trailLength)
    │               cursorGlow += (1.0 - trailDist / trailRadius) * 0.5 * fade
    │           }
    │       }
    │       Flow: Trail uniforms → Distance × Fade → Glow
    │
    └─► Apply glow to final color:
        └─► finalColor += cursorGlow * baseColor * 0.5
            Flow: Glow → Color addition
```

### Audio Effect Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   AUDIO EFFECT DATA FLOW                         │
└─────────────────────────────────────────────────────────────────┘

Audio Initialization (once):
│
├─► Video plays (play event)
│   │
│   └─► connectAudio() function called
│       │
│       ├─► Check if already connected:
│       │   └─► if (connectedVideoRef.current === video) return
│       │       Flow: Prevent double connection
│       │
│       ├─► Create AudioContext:
│       │   └─► if (!audioContextRef.current) {
│       │           audioContextRef.current = new AudioContext()
│       │       }
│       │       Flow: Browser API → Audio context
│       │
│       ├─► Create AnalyserNode:
│       │   └─► analyzer = ctx.createAnalyser()
│       │       analyzer.fftSize = 256
│       │       analyzer.smoothingTimeConstant = 0.8
│       │       analyzerRef.current = analyzer
│       │       Flow: Audio graph node creation
│       │
│       ├─► Create data array for frequency data:
│       │   └─► dataArray = new Uint8Array(analyzer.frequencyBinCount)
│       │       dataArrayRef.current = dataArray
│       │       Flow: Allocate 128 bytes (128 frequency bins)
│       │
│       ├─► Connect audio graph:
│       │   └─► source = ctx.createMediaElementSource(video)
│       │       source.connect(analyzer)
│       │       analyzer.connect(ctx.destination)
│       │       sourceRef.current = source
│       │       Flow: Video → Source → Analyser → Speakers
│       │
│       └─► Resume context:
│           └─► ctx.resume()
│               Flow: Start audio processing
│
│
Per-Frame (during render loop):
│
├─► Uniform setter called by core hook
│   │
│   ├─► Get frequency data:
│   │   └─► analyzer.getByteFrequencyData(dataArrayRef.current)
│   │       Flow: Audio graph → Frequency array [0-255]
│   │       Data: 128 values, 128 bytes
│   │
│   ├─► Calculate average volume:
│   │   └─► sum = 0
│   │       for (i = 0; i < dataArray.length; i++) {
│   │           sum += dataArray[i]
│   │       }
│   │       average = sum / dataArray.length / 255
│   │       Flow: Frequency array → Sum → Average → Normalized
│   │       Result: 0.0 (silence) to 1.0 (max loudness)
│   │
│   ├─► Smooth volume (prevent jitter):
│   │   └─► volumeRef.current = volumeRef.current * 0.7 + average * 0.3
│   │       Flow: Exponential moving average
│   │       Formula: new = old * 0.7 + current * 0.3
│   │       Purpose: Smooth transitions
│   │
│   └─► Upload to GPU:
│       └─► gl.uniform1f(u_audioLevel, volumeRef.current)
│           gl.uniform1f(u_audioReactivity, reactivity / 100)
│           gl.uniform1f(u_audioSensitivity, sensitivity / 100)
│           Flow: JavaScript → GPU uniforms
│
│
Shader Processing (per pixel):
│
└─► Fragment shader uses audio data:
    │
    ├─► Calculate audio multiplier:
    │   └─► minBrightness = mix(0.3, 0.0, u_audioSensitivity)
    │       maxBrightness = mix(1.0, 5.0, u_audioSensitivity)
    │       audioMultiplier = mix(minBrightness, maxBrightness, u_audioLevel)
    │       Flow: Audio level → Multiplier based on sensitivity
    │       Range: 0.3x (silence) to 5.0x (loud)
    │
    ├─► Apply to brightness:
    │   └─► audioModulated = baseBrightness * audioMultiplier
    │       Flow: Base brightness × Audio multiplier
    │
    └─► Blend based on reactivity:
        └─► brightness = mix(baseBrightness, audioModulated, u_audioReactivity)
            Flow: Lerp between original and modulated
            Reactivity 0: No audio effect
            Reactivity 100: Full audio effect
```

### Ripple Effect Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   RIPPLE EFFECT DATA FLOW                       │
└─────────────────────────────────────────────────────────────────┘

User Interaction:
│
├─► User clicks on container
│   │
│   └─► onClick(e) event handler called
│       │
│       ├─► Calculate click position:
│       │   └─► rect = e.currentTarget.getBoundingClientRect()
│       │       x = (e.clientX - rect.left) / rect.width
│       │       y = (e.clientY - rect.top) / rect.height
│       │       Flow: Screen pixels → Normalized [0,1]
│       │
│       ├─► Create new ripple:
│       │   └─► newRipple = {
│       │           x, y,
│       │           startTime: performance.now() / 1000
│       │       }
│       │       Flow: Position + Time → Ripple object
│       │
│       ├─► Add to ripple array:
│       │   └─► ripplesRef.current.unshift(newRipple)
│       │       Flow: New ripple at front of array
│       │
│       └─► Cap at max ripples:
│           └─► if (ripples.length > 8) ripplesRef.current.pop()
│               Flow: Remove oldest ripple
│
│
Per-Frame (during render loop):
│
├─► Uniform setter called by core hook
│   │
│   ├─► Get current time:
│   │   └─► currentTime = performance.now() / 1000
│       │       Flow: Timestamp → Seconds
│   │
│   ├─► Filter out old ripples:
│   │   └─► maxDist = sqrt(cols² + rows²)
│       │       maxLifetime = maxDist / speedRef.current + 1.0
│       │       ripples = ripples.filter(r => 
│   │           currentTime - r.startTime < maxLifetime
│   │       )
│       │       Flow: Remove expired ripples
│       │       Purpose: Keep array small
│   │
│   └─► Upload to GPU:
│       ├─► gl.uniform1f(u_time, currentTime)
│       │   Flow: Time → Shader (for animation)
│       │
│       ├─► gl.uniform1f(u_rippleEnabled, 1.0)
│       │   Flow: Enable ripple effect in shader
│       │
│       ├─► gl.uniform1f(u_rippleSpeed, speedRef.current)
│       │   Flow: Expansion speed → Shader
│       │
│       └─► for (i = 0; i < 8; i++) {
│               const ripple = ripples[i]
│               if (ripple) {
│                   gl.uniform4f(u_ripples[i], x, y, startTime, 1.0)
│               } else {
│                   gl.uniform4f(u_ripples[i], 0, 0, 0, 0.0)  // Disabled
│               }
│           }
│           Flow: Ripple array → GPU vec4 array
│           Each ripple: vec4(x, y, startTime, enabled)
│
│
Shader Processing (per pixel):
│
└─► Fragment shader uses ripple data:
    │
    ├─► Initialize ripple glow:
    │   └─► rippleGlow = 0.0
    │
    ├─► For each active ripple:
    │   │
    │   ├─► Calculate ripple age:
    │   │   └─► age = u_time - ripple.z
    │   │       if (age < 0) continue
    │   │       Flow: Current time - Start time
    │   │
    │   ├─► Calculate current radius:
    │   │   └─► rippleCell = floor(ripple.xy * u_gridSize)
    │   │       cellDist = length(thisCell - rippleCell)
    │   │       initialRadius = 5.0
    │   │
    │   │       distFromEdge = max(0.0, cellDist - initialRadius)
    │   │       reachTime = distFromEdge / u_rippleSpeed
    │   │       timeSinceReached = age - reachTime
    │   │       Flow: Distance → Edge distance → Time to reach
    │   │
    │   ├─► Calculate glow at this pixel:
    │   │   └─► fadeDuration = 0.5
    │   │       if (timeSinceReached >= 0.0 && timeSinceReached < fadeDuration) {
    │   │           pop = 1.0 - timeSinceReached / fadeDuration
    │   │           pop = pop * pop  // Quadratic falloff for smoother effect
    │   │           rippleGlow += pop * 0.3
    │   │       }
    │   │       Flow: Time → Fade → Glow contribution
    │   │       Effect: Bright ring that fades over 0.5 seconds
    │   │
    │   └─► Accumulate ripple glow
    │       Flow: Sum of all ripple glows
    │
    └─► Apply to final color:
        └─► finalColor += rippleGlow * baseColor
            Flow: Ripple glow → Color addition
```

---

## WebGL Data Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEBGL DATA PIPELINE                          │
└─────────────────────────────────────────────────────────────────┘

Data Sources:
│
├─► Video Frame Data (per frame)
│   │
│   └─► Source: HTMLVideoElement
│       │
│       ├─► Format: RGBA, 8 bits per channel
│       ├─► Size: Varies by video resolution
│       │   720p (1280×720): 3.7 MB per frame
│       │   1080p (1920×1080): 8.3 MB per frame
│       │
│       └─► Upload: gl.texImage2D()
│           Flow: Video element → GPU texture memory
│           Frequency: 60 FPS
│           Bandwidth: ~220 MB/s at 720p
│
│
├─► ASCII Atlas Texture (once)
│   │
│   └─► Source: Pre-rendered character canvas
│       │
│       ├─► Format: RGBA, 8 bits per channel
│       ├─► Size: Depends on character set
│       │   Standard (10 chars): 640×64 = 40 KB
│       │   Detailed (70 chars): 4480×64 = 280 KB
│       │
│       ├─► Content: Characters on black background
│       │   Black (0,0,0,1): Background pixels
│       │   White (1,1,1,1): Character pixels
│       │
│       └─► Upload: gl.texImage2D()
│           Flow: Canvas → GPU texture memory
│           Frequency: Once at init
│
│
├─► Uniform Data (per frame)
│   │
│   └─► Source: JavaScript state
│       │
│       ├─► Core uniforms:
│       │   ├─ u_resolution: vec2 (8 bytes)
│       │   ├─ u_charSize: vec2 (8 bytes)
│       │   ├─ u_gridSize: vec2 (8 bytes)
│       │   ├─ u_numChars: float (4 bytes)
│       │   ├─ u_colored: int (4 bytes)
│       │   ├─ u_blend: float (4 bytes)
│       │   ├─ u_highlight: float (4 bytes)
│       │   └─ u_brightness: float (4 bytes)
│       │   Subtotal: ~44 bytes (static)
│       │
│       ├─► Mouse uniforms:
│       │   ├─ u_mouse: vec2 (8 bytes)
│       │   ├─ u_mouseRadius: float (4 bytes)
│       │   ├─ u_trailLength: int (4 bytes)
│       │   └─ u_trail[24]: vec2[] (192 bytes)
│       │   Subtotal: ~208 bytes
│       │
│       ├─► Ripple uniforms:
│       │   ├─ u_time: float (4 bytes)
│       │   ├─ u_rippleEnabled: float (4 bytes)
│       │   ├─ u_rippleSpeed: float (4 bytes)
│       │   └─ u_ripples[8]: vec4[] (128 bytes)
│       │   Subtotal: ~140 bytes
│       │
│       └─► Audio uniforms:
│           ├─ u_audioLevel: float (4 bytes)
│           ├─ u_audioReactivity: float (4 bytes)
│           └─ u_audioSensitivity: float (4 bytes)
│           Subtotal: ~12 bytes
│       │
│       Total per frame: ~404 bytes
│       Frequency: 60 FPS
│       Bandwidth: ~24 KB/s (negligible)
│
│
Processing (Fragment Shader):
│
├─► Input data per pixel:
│   │
│   ├─► Built-in inputs:
│   │   └─ gl_FragCoord: vec4 (screen coordinates)
│   │
│   ├─► Varying from vertex shader:
│   │   └─ v_texCoord: vec2 (texture coordinates)
│   │
│   └─► Uniforms:
│       └─ All 30+ uniforms listed above
│
│
├─► Texture sampling:
│   │
│   ├─► Video texture sample:
│   │   └─► videoColor = texture(u_video, cellCenter)
│   │       Flow: Texture unit 0 → Pixel RGBA
│   │       Mipmapping: Yes (quality optimization)
│   │
│   └─► Atlas texture sample:
│       └─► charColor = texture(u_asciiAtlas, atlasCoord)
│           Flow: Texture unit 1 → Character RGBA
│           Mipmapping: No (crisp text)
│
│
└─► Output data:
    │
    └─► fragColor: vec4 (final pixel color)
        Format: RGBA, 8 bits per channel
        Destination: Framebuffer
        Flow: Shader → GPU memory → Canvas → Screen
        Bandwidth: ~220 MB/s at 720p (same as input)
```

### Memory Layout on GPU

```
GPU Memory Layout:
┌─────────────────────────────────────────────────────────────────┐
│                     TEXTURE MEMORY                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Texture Unit 0: Video Texture                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Size: ~8 MB (1080p)                                      │   │
│  │  Format: RGBA, UNSIGNED_BYTE                              │   │
│  │  Mipmaps: Yes (quality optimization)                       │   │
│  │  Update: Every frame                                      │   │
│  │  Access: texture(u_video, coord)                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Texture Unit 1: ASCII Atlas                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Size: ~280 KB (70 chars)                                │   │
│  │  Format: RGBA, UNSIGNED_BYTE                              │   │
│  │  Mipmaps: No (crisp text)                                │   │
│  │  Update: Once at init                                     │   │
│  │  Access: texture(u_asciiAtlas, coord)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     UNIFORM MEMORY                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Uniform Locations (cached):                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  u_video: sampler2D (int - texture unit)                │   │
│  │  u_asciiAtlas: sampler2D (int - texture unit)            │   │
│  │  u_resolution: vec2                                      │   │
│  │  u_charSize: vec2                                        │   │
│  │  u_gridSize: vec2                                        │   │
│  │  u_numChars: float                                       │   │
│  │  u_colored: int                                          │   │
│  │  u_blend: float                                          │   │
│  │  u_highlight: float                                      │   │
│  │  u_brightness: float                                     │   │
│  │  u_mouse: vec2                                           │   │
│  │  u_mouseRadius: float                                    │   │
│  │  u_trailLength: int                                      │   │
│  │  u_trail[24]: vec2 array                                 │   │
│  │  u_time: float                                           │   │
│  │  u_rippleEnabled: float                                  │   │
│  │  u_rippleSpeed: float                                    │   │
│  │  u_ripples[8]: vec4 array                                │   │
│  │  u_audioLevel: float                                     │   │
│  │  u_audioReactivity: float                                │   │
│  │  u_audioSensitivity: float                                │   │
│  │                                                          │   │
│  │  Total: ~404 bytes per frame                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     VERTEX DATA                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Fullscreen Quad (2 triangles, 6 vertices):                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Position (vec2):                                        │   │
│  │    (-1, -1), (1, -1), (-1, 1)                            │   │
│  │    (-1, 1), (1, -1), (1, 1)                              │   │
│  │                                                          │   │
│  │  TexCoord (vec2):                                        │   │
│  │    (0, 1), (1, 1), (0, 0)                               │   │
│  │    (0, 0), (1, 1), (1, 0)                               │   │
│  │                                                          │   │
│  │  Total: 6 vertices × 4 floats = 96 bytes                 │   │
│  │  Update: Never (static)                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Event Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   EVENT HANDLING DATA FLOW                      │
└─────────────────────────────────────────────────────────────────┘

Video Events:
│
├─► loadedmetadata
│   │
│   └─► Trigger: Video metadata loaded (dimensions, duration)
│       │
│       └─► Action: initWebGL()
│           Flow: Event → WebGL initialization
│
├─► play
│   │
│   └─► Trigger: Video starts playing
│       │
│       ├─► Action 1: setIsPlaying(true)
│       │   Flow: Update state → UI updates
│       │
│       └─► Action 2: Start render loop
│           └─► animationRef.current = requestAnimationFrame(render)
│               Flow: Start per-frame processing
│
├─► pause
│   │
│   └─► Trigger: Video paused
│       │
│       ├─► Action 1: setIsPlaying(false)
│       │   Flow: Update state → UI updates
│       │
│       └─► Action 2: Stop render loop
│           └─► cancelAnimationFrame(animationRef.current)
│               Flow: Stop per-frame processing
│
└─► ended
    │
    └─► Trigger: Video finished
        │
        ├─► Action 1: setIsPlaying(false)
        │   Flow: Update state → UI updates
        │
        └─► Action 2: Stop render loop
            └─► cancelAnimationFrame(animationRef.current)
                Flow: Stop per-frame processing
│
│
Mouse Events (on container):
│
├─► onMouseMove (if enableMouse)
│   │
│   └─► Trigger: Mouse moves over container
│       │
│       └─► Action: Update mouse position and trail
│           Flow: Event → mouseRef, trailRef → Next frame's uniform update
│
├─► onMouseLeave (if enableMouse)
│   │
│   └─► Trigger: Mouse leaves container
│       │
│       └─► Action: Reset mouse position
│           Flow: Event → mouseRef = {x:-1, y:-1}, trailRef = []
│
└─► onClick (if enableRipple)
    │
    └─► Trigger: User clicks container
        │
        └─► Action: Spawn new ripple
            Flow: Event → ripplesRef.unshift(newRipple) → Next frame's uniform update
│
│
Keyboard Events:
│
└─► onKeyDown (if enableSpacebarToggle)
    │
    └─► Trigger: Spacebar pressed
        │
        ├─► Condition: e.code === 'Space' && e.target === document.body
        │
        └─► Action: toggle() → video.play() or video.pause()
            Flow: Keyboard → Video playback control
│
│
Resize Events (if numColumns specified):
│
└─► ResizeObserver on container
    │
    └─► Trigger: Container size changes
        │
        └─► Action: Reinitialize WebGL with new size
            Flow: Resize → initWebGL() → Recalculate grid → New canvas size
```

---

## State Management Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   STATE MANAGEMENT DATA FLOW                    │
└─────────────────────────────────────────────────────────────────┘

State Categories:
│
├─► Component State (triggers re-renders)
│   │
│   ├─► dimensions: { cols, rows }
│   │   ├─ Source: calculateGridDimensions()
│   │   ├─ Update: When video loads or numColumns changes
│   │   ├─ Flow: Video aspect ratio → Grid calculation → State
│   │   └─ Usage: Stats display, internal calculations
│   │
│   ├─► stats: { fps, frameTime }
│   │   ├─ Source: Frame timing measurements
│   │   ├─ Update: Every second (per-frame accumulation)
│   │   ├─ Flow: frameTimes array → Average → State
│   │   └─ Usage: Stats display, performance monitoring
│   │
│   ├─► isReady: boolean
│   │   ├─ Source: WebGL initialization completion
│   │   ├─ Update: When WebGL setup finishes
│   │   ├─ Flow: initWebGL() → setState(true)
│   │   └─ Usage: Conditional rendering, autoplay logic
│   │
│   └─► isPlaying: boolean
│       ├─ Source: Video play/pause events
│       ├─ Update: On video play/pause events
│       ├─ Flow: Video events → setState()
│       └─ Usage: Render loop control, UI feedback
│
│
├─► Refs (persist across renders, no re-render)
│   │
│   ├─► DOM Element Refs:
│   │   ├─ containerRef: Interactive container div
│   │   ├─ videoRef: Hidden video element
│   │   └─ canvasRef: WebGL canvas
│   │   Flow: JSX ref attribute → Ref object → DOM access
│   │
│   ├─► WebGL Resource Refs:
│   │   ├─ glRef: WebGL2RenderingContext
│   │   ├─ programRef: WebGLProgram
│   │   ├─ videoTextureRef: WebGLTexture
│   │   ├─ atlasTextureRef: WebGLTexture
│   │   └─ animationRef: requestAnimationFrame ID
│   │   Flow: WebGL creation → Ref storage → Cleanup access
│   │
│   ├─► Cached Data Refs:
│   │   ├─ uniformLocationsRef: Cached uniform locations
│   │   └─ uniformSettersRef: Map of feature setters
│   │   Flow: Init → Cache → Per-frame use
│   │
│   └─► Feature State Refs:
│       ├─ Mouse: mouseRef, trailRef
│       ├─ Audio: audioContextRef, analyzerRef, volumeRef
│       └─ Ripple: ripplesRef
│       Flow: Event handlers → Refs → Uniform updates
│
│
└─► External State (from props):
    │
    ├─► Configuration Props:
    │   ├─ src: Video URL
    │   ├─ numColumns: Grid width
    │   ├─ colored: Color mode
    │   ├─ blend: Blend factor (0-100)
    │   ├─ highlight: Background intensity
    │   ├─ brightness: Brightness multiplier
    │   ├─ charset: Character set key
    │   ├─ enableMouse: Mouse effect toggle
    │   ├─ trailLength: Mouse trail size
    │   ├─ enableRipple: Ripple effect toggle
    │   ├─ rippleSpeed: Ripple expansion speed
    │   ├─ audioEffect: Audio reactivity (0-100)
    │   ├─ audioRange: Audio sensitivity
    │   ├─ isPlaying: Playback control
    │   ├─ autoPlay: Auto-play on load
    │   ├─ enableSpacebarToggle: Keyboard control
    │   ├─ showStats: Stats overlay
    │   ├─ className: CSS class
    │   ├─ style: CSS styles
    │   └─ maxWidth: Container max width
    │
    └──► Props Flow:
        └─ Parent Component → Video2Ascii Props → Hooks → WebGL Uniforms
```

### State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    STATE FLOW DIAGRAM                           │
└─────────────────────────────────────────────────────────────────┘

                          ┌──────────────┐
                          │   Parent     │
                          │  Component   │
                          └──────┬───────┘
                                 │ Props
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Video2Ascii Component                         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
    ┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
    │   Component      │ │   Feature    │ │   Feature    │
    │    State         │ │    Refs      │ │    Refs      │
    │                  │ │              │ │              │
    │ • dimensions     │ │ • mouseRef   │ │ • volumeRef  │
    │ • stats          │ │ • trailRef   │ │ • ripplesRef │
    │ • isReady        │ │              │ │              │
    │ • isPlaying      │ │              │ │              │
    └──────────────────┘ └──────────────┘ └──────────────┘
                │                │                │
                │                │                │
                └────────────────┼────────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │     useVideoToAscii       │
                    │        Core Hook          │
                    └───────────┬──────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
   │  WebGL Refs     │  │  Cached Data    │  │  DOM Refs        │
   │                 │  │                 │  │                 │
   │ • glRef         │  │ • uniformLocs   │  │ • containerRef  │
   │ • programRef    │  │ • settersMap    │  │ • videoRef      │
   │ • textures      │  │                 │  │ • canvasRef     │
   │ • animationRef  │  │                 │  │                 │
   └─────────────────┘  └─────────────────┘  └─────────────────┘
            │                   │                   │
            └───────────────────┼───────────────────┘
                                │
                                ▼
                    ┌──────────────────────────┐
                    │      Render Loop         │
                    │  (Per-Frame Execution)   │
                    └───────────┬──────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
   │  WebGL Uniforms │  │  WebGL Textures │  │  GPU Shaders    │
   │                 │  │                 │  │                 │
   │ • Position      │  │ • Video Frame   │  │ • Fragment      │
   │ • Color        │  │ • Atlas         │  │ • Processing    │
   │ • Effects       │  │                 │  │                 │
   └─────────────────┘  └─────────────────┘  └─────────────────┘
            │                   │                   │
            └───────────────────┼───────────────────┘
                                │
                                ▼
                    ┌──────────────────────────┐
                    │      Canvas Display       │
                    │     (Visual Output)       │
                    └──────────────────────────┘
```

---

## Performance Flow Considerations

### Bottleneck Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│              PERFORMANCE BOTTLENECK DATA FLOW                    │
└─────────────────────────────────────────────────────────────────┘

Per-Frame Time Budget: 16.67ms (60 FPS target)
│
├─► JavaScript Phase: ~2-3ms (15-20%)
│   │
│   ├─► Event handling: <0.1ms
│   │   └─ Mouse, keyboard, video events
│   │   Flow: Browser → JavaScript handlers
│   │
│   ├─► State updates: <0.1ms
│   │   └─ setState() calls (rare, mostly refs)
│   │   Flow: State changes → React reconciliation
│   │
│   ├─► Hook function calls: <0.1ms
│   │   └─ Feature hook execution
│   │   Flow: Hooks → Ref updates
│   │
│   ├─► Uniform updates: ~0.5-1ms
│   │   └─ gl.uniform*() calls (30+ uniforms)
│   │   Flow: JavaScript → GPU memory
│   │   Optimization: Cached locations save ~2ms/frame
│   │
│   └─► Audio analysis: ~0.5-1ms
│       └─ getByteFrequencyData()
│       Flow: Audio graph → JavaScript array
│       Optimization: Small FFT size (256)
│
├─► WebGL Overhead: ~1-2ms (5-10%)
│   │
│   ├─► Texture upload: ~1-2ms
│   │   └─ texImage2D() for video frame
│   │   Flow: Video element → GPU texture
│   │   Data: ~8 MB for 1080p
│   │   Bottleneck: High at 1080p+
│   │
│   ├─► Mipmap generation: ~0.5ms
│   │   └─ generateMipmap()
│   │   Flow: GPU texture → Mipmap chain
│   │   Purpose: Quality improvement
│   │
│   └─► State changes: <0.1ms
│       └─ gl.uniform*(), gl.bindTexture()
│       Flow: JavaScript → GPU state
│       Optimization: Batched updates
│
└─► GPU Processing: ~10-12ms (60-70%)
    │
    └─► Fragment shader execution: ~10-12ms
        └─ For each pixel (1.2M pixels at 720p):
            ├─ Texture lookups: ~3-4ms
            │   Flow: Texture sampling → Pixel data
            │   Count: 2 per pixel (video + atlas)
            │
            ├─ Brightness calc: ~1-2ms
            │   Flow: RGB → Luminance
            │   Complexity: Simple math
            │
            ├─ Effect calculations: ~2-3ms
            │   Flow: Distance → Glow values
            │   Count: 12 trail points + 8 ripples
            │
            └─ Color mixing: ~1-2ms
                Flow: Background + Text + Effects
                Complexity: Multiple mix operations
```

### Optimization Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                OPTIMIZATION DATA FLOW STRATEGIES                │
└─────────────────────────────────────────────────────────────────┘

Strategy 1: Uniform Location Caching
│
├─► Problem: getUniformLocation() is expensive (~0.05ms per call)
├─► Solution: Cache all locations at init
└─► Flow:
    Init: Lookup all 30+ uniforms once → Store in ref → ~1.5ms total
    Per-frame: Use cached locations → Direct memory access → ~0ms overhead
    Savings: ~1.5ms/frame (9% at 60 FPS)
│
Strategy 2: Ref-Based State
│
├─► Problem: React state updates cause re-renders (expensive)
├─► Solution: Use refs for data that doesn't need UI updates
└─► Flow:
    Before: State → Re-render → DOM diff → Update (~2ms)
    After: Ref → Direct access (~0.01ms)
    Savings: ~2ms/frame per avoided re-render
│
Strategy 3: Texture Atlasing
│
├─► Problem: Individual texture lookups are expensive
├─► Solution: Single atlas with all characters
└─► Flow:
    Before: 70 texture binds per frame → 70 × 0.01ms = 0.7ms
    After: 1 texture bind → 0.01ms
    Savings: ~0.7ms/frame (4% at 60 FPS)
│
Strategy 4: Mipmapping for Video
│
├─► Problem: Large texture samples cause quality issues at distance
├─► Solution: Generate mipmaps for video texture
└─► Flow:
    Upload: texImage2D → generateMipmap → Additional 0.5ms
    Sampling: GPU uses appropriate mipmap level → Improved quality
    Trade-off: 0.5ms overhead for better visual quality
│
Strategy 5: Small FFT Size for Audio
│
├─► Problem: Large FFT sizes are expensive to process
├─► Solution: Use small FFT size (256 instead of 2048)
└─► Flow:
    FFT size 256: 128 bins → Fast (~0.5ms)
    FFT size 2048: 1024 bins → Slow (~2ms)
    Savings: ~1.5ms/frame (9% at 60 FPS)
    Trade-off: Less frequency detail (acceptable for this use case)
│
Strategy 6: Batched Uniform Updates
│
├─► Problem: Individual uniform calls have overhead
├─► Solution: Call all uniform updates in sequence, then draw
└─► Flow:
    Before: Update → Draw → Update → Draw (multiple draw calls)
    After: Update all → Draw once (single draw call)
    Savings: Minimizes GPU state changes
│
Strategy 7: Minimize Texture Uploads
│
├─► Problem: Uploading large textures every frame is expensive
├─► Solution: Only upload video frame (atlas never changes)
└─► Flow:
    Per-frame: Upload video (~2ms)
    Atlas: Upload once at init (~1ms total)
    Savings: Avoid redundant atlas uploads
```

---

## Summary

The data flow in video2ascii follows a well-orchestrated pipeline:

1. **Input**: Video frames from HTML video element
2. **Processing**: JavaScript hooks analyze and prepare data (mouse, audio, ripple)
3. **GPU Upload**: Textures (video + atlas) and uniforms sent to WebGL
4. **Shader Execution**: Fragment shader processes all pixels in parallel
5. **Output**: ASCII art rendered to canvas at 60 FPS

Key data flow characteristics:
- **High throughput**: ~220 MB/s of texture data at 720p
- **Low latency**: ~16ms per frame (60 FPS target)
- **Parallel processing**: GPU handles millions of pixels simultaneously
- **Modular**: Features are independent and register themselves
- **Optimized**: Caching, refs, and batching minimize JavaScript overhead

Understanding this data flow is essential for:
- Adding new features
- Optimizing performance
- Debugging issues
- Learning WebGL and React patterns

The architecture demonstrates how to build real-time graphics applications that are both performant and maintainable.