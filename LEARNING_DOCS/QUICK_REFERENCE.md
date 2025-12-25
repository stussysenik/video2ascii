# Quick Reference Guide

A concise reference for key concepts, APIs, and patterns in video2ascii.

## 📦 Component API

### Video2Ascii Component Props

```tsx
<Video2Ascii
  src="/video.mp4"
  numColumns={120}
  colored={true}
  blend={0}
  highlight={20}
  brightness={1.2}
  charset="detailed"
  enableMouse={true}
  trailLength={24}
  enableRipple={false}
  rippleSpeed={40}
  audioEffect={50}
  audioRange={75}
  isPlaying={true}
  autoPlay={true}
  enableSpacebarToggle={false}
  showStats={false}
  className="my-class"
  style={{ borderRadius: '8px' }}
  maxWidth={1200}
/>
```

### Prop Quick Reference

| Prop | Type | Default | Purpose |
|------|------|----------|---------|
| `src` | string | required | Video URL |
| `numColumns` | number | - | Grid width (controls resolution) |
| `colored` | boolean | `true` | Video colors vs green terminal |
| `blend` | number | `0` | 0=ASCII, 100=original video |
| `brightness` | number | `1.0` | Brightness multiplier (0-2) |
| `charset` | string | `"standard"` | Character set key |
| `enableMouse` | boolean | `true` | Cursor glow effect |
| `trailLength` | number | `24` | Mouse trail length (1-24) |
| `enableRipple` | boolean | `false` | Click ripple effect |
| `rippleSpeed` | number | `40` | Ripple expansion speed |
| `audioEffect` | number | `0` | Audio reactivity (0-100) |
| `audioRange` | number | `50` | Audio sensitivity (0-100) |
| `isPlaying` | boolean | `true` | Video playback control |
| `autoPlay` | boolean | `true` | Auto-play on load |
| `showStats` | boolean | `false` | Show FPS overlay |

### Character Sets

```tsx
import { ASCII_CHARSETS } from "video2ascii";

// Available character sets:
"standard"   // .:-=+*#%@
"blocks"      // ░▒▓█
"minimal"     // .oO@
"binary"      // █
"detailed"    // 70-character gradient
"dots"        // ·•●
"arrows"      // ←↙↓↘→↗↑↖
"emoji"       // 🌑🌒🌓🌔🌕
```

---

## 🔌 Hook API

### useVideoToAscii (Core Hook)

```tsx
const ascii = useVideoToAscii({
  numColumns: 120,
  colored: true,
  brightness: 1.2,
  charset: "detailed",
  maxWidth: 1200,
  onStats: (stats) => console.log(stats)
});

// Returns:
ascii.containerRef      // React ref to container div
ascii.videoRef          // React ref to video element
ascii.canvasRef         // React ref to WebGL canvas
ascii.glRef             // React ref to WebGL2 context
ascii.programRef        // React ref to WebGL program
ascii.uniformLocationsRef // React ref to cached uniforms
ascii.registerUniformSetter // Function to register feature setters
ascii.unregisterUniformSetter // Function to remove feature setters
ascii.dimensions        // { cols: number, rows: number }
ascii.stats            // { fps: number, frameTime: number }
ascii.isReady          // WebGL initialized?
ascii.isPlaying        // Video playing?
ascii.play()           // Start video
ascii.pause()          // Pause video
ascii.toggle()         // Toggle play/pause
```

### useAsciiMouseEffect

```tsx
const handlers = useAsciiMouseEffect(ascii, {
  enabled: true,
  trailLength: 24
});

// Returns:
handlers.onMouseMove   // Event handler for container
handlers.onMouseLeave // Event handler for container
```

### useAsciiRipple

```tsx
const handlers = useAsciiRipple(ascii, {
  enabled: true,
  speed: 40
});

// Returns:
handlers.onClick // Event handler for container
```

### useAsciiAudio

```tsx
useAsciiAudio(ascii, {
  enabled: audioEffect > 0,
  reactivity: audioEffect,
  sensitivity: audioRange
});

// Returns: void (no handlers, updates uniforms directly)
```

---

## 🎨 WebGL Shaders

### Vertex Shader

```glsl
#version 300 es

in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
```

**Purpose**: Positions fullscreen quad (2 triangles covering canvas)

**Outputs**:
- `gl_Position`: Clip space position (-1 to 1)
- `v_texCoord`: Texture coordinates (0 to 1) passed to fragment shader

---

### Fragment Shader (Key Sections)

#### Brightness Calculation
```glsl
float baseBrightness = dot(videoColor.rgb, vec3(0.299, 0.587, 0.114));
```
**Purpose**: Convert RGB to luminance (human eye perception)

#### Audio Modulation
```glsl
float audioMultiplier = mix(0.3, 5.0, u_audioLevel);
float audioModulated = baseBrightness * audioMultiplier;
float brightness = mix(baseBrightness, audioModulated, u_audioReactivity);
```
**Purpose**: Modulate brightness based on audio level

#### Character Mapping
```glsl
float charIndex = floor(brightness * (u_numChars - 0.001));
```
**Purpose**: Map brightness [0,1] to character index [0,numChars-1]

#### Atlas Sampling
```glsl
float atlasX = charIndex / u_numChars;
vec2 cellPos = fract(v_texCoord * u_gridSize);
vec2 atlasCoord = vec2(atlasX + cellPos.x / u_numChars, cellPos.y);
vec4 charColor = texture(u_asciiAtlas, atlasCoord);
```
**Purpose**: Sample correct character from atlas texture

#### Color Mixing
```glsl
vec3 bgColor = baseColor * (0.15 + u_highlight * 0.35);
vec3 textColor = baseColor * 1.2;
vec3 finalColor = mix(bgColor, textColor, charColor.r);
```
**Purpose**: Mix background and text colors

---

## 🔧 WebGL Utilities

### Creating Textures

```tsx
// Video texture (updated every frame)
const videoTexture = createVideoTexture(gl);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

// Atlas texture (created once)
const atlasTexture = createAsciiAtlas(gl, chars, 64);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
```

### Updating Uniforms

```tsx
// Scalar
gl.uniform1f(location.u_brightness, 1.2);
gl.uniform1i(location.u_colored, 1);

// Vector
gl.uniform2f(location.u_resolution, width, height);
gl.uniform2f(location.u_mouse, x, y);

// Array
for (let i = 0; i < 24; i++) {
  gl.uniform2f(location.u_trail[i], x, y);
}
```

### Rendering

```tsx
// Upload video frame
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, videoTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
gl.generateMipmap(gl.TEXTURE_2D);

// Draw fullscreen quad
gl.drawArrays(gl.TRIANGLES, 0, 6);
```

---

## 📐 Key Concepts

### Texture Atlas

**Concept**: Pre-render all ASCII characters to a single texture

```
Atlas Texture Layout:
┌────────────────────────────────────────────┐
│ @  %  #  *  +  =  -  :  .  space │
│ ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑    ↑    │
│ 0  1  2  3  4  5  6  7    9    │
│                                             │
│ Each cell = charSize × charSize pixels        │
│ Black background, white text                 │
└────────────────────────────────────────────┘
```

**Benefits**:
- Single texture upload (not per-frame)
- Fast GPU sampling
- Easy to add new character sets

---

### ASCII Conversion Flow

```
Original Video Pixel
    │
    ├─→ Sample RGB at cell center
    │
    ├─→ Calculate brightness
    │   formula: 0.299*R + 0.587*G + 0.114*B
    │
    ├─→ Apply audio modulation
    │   brightness *= audioMultiplier
    │
    ├─→ Map brightness to character index
    │   index = floor(brightness * numChars)
    │
    ├─→ Sample character from atlas
    │   charColor = texture(atlas, atlasCoord)
    │
    ├─→ Apply video colors
    │   finalColor = charColor.r * videoColor
    │
    └─→ Output to framebuffer
```

---

### Plugin Architecture

**Pattern**: Feature hooks register uniform setters with core hook

```tsx
// 1. Core hook provides registration
const registerUniformSetter = useCallback((id, setter) => {
  uniformSettersRef.current.set(id, setter);
}, []);

// 2. Feature hook registers itself
useEffect(() => {
  const setter = (gl, program, locations) => {
    gl.uniform2f(locations.u_mouse, x, y);
  };
  ascii.registerUniformSetter('mouse', setter);
  
  return () => ascii.unregisterUniformSetter('mouse');
}, [ascii]);

// 3. Core hook calls all setters every frame
for (const setter of uniformSettersRef.current.values()) {
  setter(gl, program, locations);
}
```

**Benefits**:
- Decoupled features
- Easy to add new effects
- Core doesn't need to know about features

---

## 🔄 Common Patterns

### Ref vs State

```tsx
// ✓ Use refs for WebGL resources (no re-render)
const glRef = useRef<WebGL2RenderingContext | null>(null);
const programRef = useRef<WebGLProgram | null>(null);

// ✓ Use state for UI updates
const [isPlaying, setIsPlaying] = useState(false);
const [stats, setStats] = useState({ fps: 0 });

// ✗ Never use state for WebGL resources
const [gl, setGl] = useState(null);  // Triggers re-renders!
```

---

### Feature Hook Template

```tsx
function useMyFeature(ascii: AsciiContext, options: FeatureOptions) {
  const { enabled = true } = options;
  
  // Refs for mutable state
  const myStateRef = useRef(initialValue);
  const enabledRef = useRef(enabled);
  
  // Keep refs fresh when options change
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);
  
  // Register uniform setter
  useEffect(() => {
    if (!enabled) return;
    
    const setter = (gl, _program, locations) => {
      gl.uniform1f(locations.u_myUniform, myStateRef.current);
    };
    
    ascii.registerUniformSetter('myFeature', setter);
    
    return () => ascii.unregisterUniformSetter('myFeature');
  }, [ascii, enabled]);
  
  // Return event handlers if needed
  const onEvent = useCallback((e) => {
    if (!enabledRef.current) return;
    myStateRef.current = newValue;
  }, []);
  
  return { onEvent };
}
```

---

### Uniform Caching

```tsx
// Cache uniforms once at initialization
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

// Use cached locations every frame (fast!)
gl.uniform2f(uniformLocationsRef.current.u_resolution, width, height);
```

**Performance Gain**: Saves ~2ms per frame (120ms/second at 60 FPS)

---

## ⚡ Performance

### Performance Budget (60 FPS target)

| Operation | Time Budget | Actual | Notes |
|------------|--------------|---------|--------|
| **Total** | 16.67ms | ~8-15ms | Target: 60 FPS |
| JavaScript | 2-3ms | ~2ms | Hooks, event handlers |
| WebGL overhead | 1-2ms | ~1.5ms | Uniform updates |
| Texture upload | 1-2ms | ~1.5ms | Video frame |
| GPU processing | 10-12ms | ~8-10ms | Fragment shader |

---

### Optimization Tips

1. **Reduce numColumns** (biggest impact)
   ```tsx
   // Slow at high resolutions
   <Video2Ascii numColumns={200} />
   
   // Faster
   <Video2Ascii numColumns={100} />
   ```

2. **Disable unused effects**
   ```tsx
   // Fastest
   <Video2Ascii
     enableMouse={false}
     enableRipple={false}
     audioEffect={0}
   />
   ```

3. **Use lower resolution video**
   ```tsx
   <Video2Ascii src="720p.mp4" />  // Faster
   <Video2Ascii src="1080p.mp4" /> // Slower
   ```

4. **Minimize re-renders**
   - Use `useRef` for WebGL resources
   - Use `useCallback` for event handlers
   - Avoid `useState` for non-UI data

---

### Common Bottlenecks

| Bottleneck | Impact | Solution |
|------------|---------|-----------|
| Too many columns | High | Reduce `numColumns` |
| High resolution video | High | Use 720p instead of 1080p |
| Many effects | Medium | Disable unused effects |
| Fragment shader complexity | Medium | Simplify shader math |
| State updates | Low | Use refs instead of state |

---

## 🐛 Troubleshooting

### WebGL2 Not Supported

**Error**: `WebGL2 not supported`

**Solution**:
- Update browser to latest version
- Use Chrome, Firefox, or Safari
- Check: https://caniuse.com/webgl2

---

### Low FPS

**Symptoms**: FPS < 30, choppy animation

**Solutions**:
1. Reduce `numColumns`
2. Use lower resolution video
3. Disable effects (`enableMouse`, `enableRipple`, `audioEffect`)
4. Check if other tabs are using GPU

---

### Audio Not Working

**Symptoms**: No audio reactivity

**Causes**:
- Browser autoplay policy
- Audio context not resumed

**Solutions**:
```tsx
// Option 1: Mute audio (no reactivity needed)
<Video2Ascii audioEffect={0} />

// Option 2: Require user interaction first
const [started, setStarted] = useState(false);
return started ? (
  <Video2Ascii audioEffect={50} />
) : (
  <button onClick={() => setStarted(true)}>Start</button>
);
```

---

### Characters Distorted

**Symptoms**: Characters look stretched or squashed

**Cause**: Character aspect ratio mismatch

**Solution**:
```tsx
// In src/lib/webgl/types.ts
export const CHAR_WIDTH_RATIO = 0.6;  // Try 0.5 or 0.7
```

---

## 💡 Quick Examples

### Add Custom Character Set

```tsx
// In src/lib/ascii-charsets.ts
export const ASCII_CHARSETS = {
  // ... existing sets ...
  
  myCustom: {
    name: "My Custom",
    chars: " .:-=+*#%@",
  },
} as const;
```

Usage:
```tsx
<Video2Ascii charset="myCustom" />
```

---

### Change Mouse Cursor Shape

```glsl
// In fragment.glsl
// Change from circle to diamond:
float cellDist = abs(thisCell.x - mouseCell.x) + abs(thisCell.y - mouseCell.y);
```

---

### Add Audio-Based Color

```glsl
// In fragment.glsl
// Make audio change color instead of brightness:
vec3 audioColor = mix(vec3(0,0,1), vec3(1,0,0), u_audioLevel);
vec3 finalColor = mix(baseColor, audioColor, u_audioReactivity);
```

---

### Create Performance Monitor

```tsx
const videoRef = useRef(null);

useEffect(() => {
  let frameCount = 0;
  let startTime = performance.now();
  
  const checkFPS = () => {
    frameCount++;
    const elapsed = performance.now() - startTime;
    
    if (elapsed >= 1000) {
      const fps = Math.round((frameCount / elapsed) * 1000);
      console.log(`FPS: ${fps}`);
      frameCount = 0;
      startTime = performance.now();
    }
    
    requestAnimationFrame(checkFPS);
  };
  
  checkFPS();
}, []);
```

---

## 📚 File Quick Access

### Key Files

```
src/
├── components/
│   └── VideoToAscii.tsx           # Main React component
├── hooks/
│   ├── useVideoToAscii.ts        # Core WebGL hook
│   ├── useAsciiMouseEffect.ts    # Mouse effect
│   ├── useAsciiRipple.ts        # Ripple effect
│   └── useAsciiAudio.ts         # Audio effect
├── lib/
│   ├── ascii-charsets.ts         # Character sets
│   └── webgl/
│       ├── types.ts              # TypeScript definitions
│       ├── utils.ts              # WebGL helpers
│       └── shaders/
│           ├── vertex.glsl        # Vertex shader
│           └── fragment.glsl     # Fragment shader
└── index.ts                     # Public API exports
```

---

### Key Functions

| File | Function | Purpose |
|-------|----------|---------|
| `useVideoToAscii.ts` | `initWebGL()` | Initialize WebGL |
| `useVideoToAscii.ts` | `render()` | Render loop |
| `utils.ts` | `compileShader()` | Compile GLSL |
| `utils.ts` | `createProgram()` | Link shaders |
| `utils.ts` | `createAsciiAtlas()` | Pre-render chars |
| `utils.ts` | `calculateGridDimensions()` | Grid size |
| `ascii-charsets.ts` | `getCharArray()` | Get chars by key |

---

## 🔗 External Resources

### WebGL & GLSL
- [WebGL2 Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext)
- [WebGL Fundamentals](https://webglfundamentals.org/)
- [The Book of Shaders](https://thebookofshaders.com/)

### React
- [React Hooks](https://react.dev/reference/react)
- [useRef](https://react.dev/reference/react/useRef)
- [useCallback](https://react.dev/reference/react/useCallback)

### Audio
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)

### Tools
- [ShaderToy](https://www.shadertoy.com/) - Online shader playground
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/) - Performance profiling

---

## ✅ Checklist

### Before Using
- [ ] Installed dependencies (`npm install`)
- [ ] Built library (`npm run build`)
- [ ] Run demo successfully

### Before Modifying
- [ ] Read architecture docs
- [ ] Understand component hierarchy
- [ ] Know which files to modify
- [ ] Have backup or git branch

### Before Adding Features
- [ ] Follow plugin pattern
- [ ] Register uniform setter
- [ ] Update types if needed
- [ ] Test with different configurations

### Before Deploying
- [ ] Test on multiple browsers
- [ ] Check performance metrics
- [ ] Verify all features work
- [ ] Update documentation

---

**Last Updated**: 2024
**Version**: Based on video2ascii main branch