# Video2ASCII Learning Repository

Welcome to the learning documentation for **video2ascii** - a WebGL-powered React component that converts video to ASCII art. This repository serves as an excellent resource for learning advanced frontend development techniques.

## 📚 What You'll Learn

By studying this codebase, you'll gain expertise in:

### Core Technologies
- **WebGL2** - GPU-accelerated graphics programming for real-time effects
- **GLSL Shaders** - Writing fragment and vertex shaders for pixel manipulation
- **React Hooks** - Custom hooks for modular, reusable logic
- **Web Audio API** - Audio analysis and visualization
- **TypeScript** - Strong typing for complex WebGL applications

### Advanced Patterns
- **GPU-accelerated rendering** - Offloading compute to the GPU
- **Texture atlasing** - Efficient character rendering in shaders
- **Mipmapping** - Quality optimization for texture sampling
- **Performance monitoring** - FPS tracking and frame time measurement
- **Event-driven architecture** - Decoupled feature modules
- **Ref management** - Handling WebGL resources in React lifecycle
- **Uniform caching** - Performance optimization for WebGL state changes

### Architecture Patterns
- **Feature-based modularization** - Separating concerns (mouse, audio, ripple)
- **Plugin-like architecture** - Feature hooks register themselves with core
- **Render loop management** - RequestAnimationFrame coordination
- **Resource lifecycle** - Proper WebGL cleanup and initialization
- **Hook composition** - Combining multiple hooks for complex behavior

## 🗺️ Documentation Structure

```
LEARNING_DOCS/
├── README.md                    # This file - main entry point
├── architecture/                # System architecture documentation
│   ├── system-overview.md      # High-level architecture diagram
│   ├── component-hierarchy.md  # Component structure
│   ├── data-flow.md            # How data flows through the system
│   └── performance-optimization.md # GPU and CPU optimization strategies
├── code-walkthroughs/           # Detailed code explanations
│   ├── webgl-setup.md          # WebGL initialization and shaders
│   ├── ascii-rendering.md      # The ASCII conversion algorithm
│   ├── feature-hooks.md        # Mouse, audio, and ripple effects
│   └── character-atlas.md     # Texture atlas creation and usage
└── diagrams/                    # Visual representations
    └── (architecture diagrams)
```

## 🎯 Quick Start Guide

### For Beginners (New to WebGL/Shaders)

1. **Start here:** `architecture/system-overview.md` - Understand the big picture
2. **Then read:** `code-walkthroughs/webgl-setup.md` - Learn WebGL basics
3. **Follow up:** `code-walkthroughs/ascii-rendering.md` - See how ASCII works

### For Intermediate Developers

1. **Explore:** `architecture/data-flow.md` - Understand the render pipeline
2. **Study:** `code-walkthroughs/feature-hooks.md` - Learn the plugin architecture
3. **Analyze:** `architecture/performance-optimization.md` - Performance techniques

### For Advanced Developers

1. **Deep dive:** `code-walkthroughs/character-atlas.md` - Advanced texture techniques
2. **Review:** Source code with inline comments explaining each file
3. **Experiment:** Try modifying the GLSL shaders to create new effects

## 🔑 Key Concepts

### 1. WebGL + Shaders = Real-time Effects

The core innovation here is using the GPU to convert every video frame to ASCII in real-time. Instead of manipulating pixels on the CPU (slow), we:

1. Upload the video frame to the GPU as a texture
2. Sample each "cell" in a grid pattern
3. Calculate brightness of that cell
4. Map brightness to a character index
5. Look up that character in a pre-rendered texture atlas
6. Combine the character with video colors

All of this happens **in the fragment shader**, running in parallel across millions of pixels.

### 2. Feature Hook Architecture

The system uses a plugin-like pattern where features (mouse, audio, ripple) are completely decoupled:

- Each feature hook manages its own state and uniforms
- Features register uniform setters with the core hook
- The core hook calls all setters every frame
- This makes adding new features trivial and keeps code modular

### 3. Texture Atlas Optimization

Instead of rendering text with the slow `fillText()` API every frame, we:

1. Pre-render all ASCII characters to a single canvas (texture atlas)
2. Upload this to the GPU once
3. In the shader, calculate which character to use based on brightness
4. Sample the correct region of the atlas texture
5. Apply video colors to the character's alpha channel

This reduces millions of JavaScript operations to a single GPU texture lookup per pixel.

### 4. Audio Reactivity

Using the Web Audio API:

1. Connect video element to an `AudioContext`
2. Add an `AnalyserNode` to extract frequency data
3. Calculate average volume from frequency bins
4. Pass volume to shader as a uniform
5. In the shader, modulate brightness based on audio level

This creates a dynamic, music-reactive ASCII display.

## 📊 Architecture Diagram (Text Version)

```
┌─────────────────────────────────────────────────────────────┐
│                        Video2Ascii Component                │
│                   (Orchestrates everything)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Hidden      │  │  Interactive │  │  WebGL       │
│  <video>     │  │  Container   │  │  <canvas>    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                  │                  │
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    useVideoToAscii (Core Hook)              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  WebGL Initialization                               │   │
│  │  - Compile shaders                                   │   │
│  │  - Create program                                     │   │
│  │  - Setup fullscreen quad                             │   │
│  │  - Create textures (video + atlas)                   │   │
│  │  - Cache uniform locations                           │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Render Loop (60 FPS)                                │   │
│  │  1. Upload video frame to GPU                        │   │
│  │  2. Call all feature uniform setters                 │   │
│  │  3. Draw quad (shader does ASCII conversion)         │   │
│  │  4. Update stats                                      │   │
│  │  5. Schedule next frame                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Uniform Setter Registry (Plugin System)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Mouse     │  │   Audio     │  │   Ripple    │         │
│  │  Setters    │  │  Setters    │  │  Setters    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ useAsciiMouse    │  │ useAsciiAudio    │  │ useAsciiRipple    │
│ - Track cursor   │  │ - Analyze audio  │  │ - Spawn ripples   │
│ - Trail array    │  │ - Calc volume    │  │ - Animate rings   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
                                                         │
                                                         ▼
                                       ┌───────────────────────────────┐
                                       │    Fragment Shader (GPU)       │
                                       │  ┌─────────────────────────┐  │
                                       │  │ For each pixel:          │  │
                                       │  │ 1. Find ASCII cell      │  │
                                       │  │ 2. Sample video at cell │  │
                                       │  │ 3. Calculate brightness │  │
                                       │  │ 4. Add audio modulation │  │
                                       │  │ 5. Add mouse glow       │  │
                                       │  │ 6. Add ripple effect    │  │
                                       │  │ 7. Map to char index    │  │
                                       │  │ 8. Sample atlas texture │  │
                                       │  │ 9. Mix with video colors│  │
                                       │  └─────────────────────────┘  │
                                       └───────────────────────────────┘
```

## 🛠️ Technical Stack Breakdown

### Core Technologies

| Technology | Purpose | Why it was chosen |
|------------|---------|-------------------|
| **React** | UI framework | Component-based, great ref management |
| **WebGL2** | Graphics API | GPU acceleration, shader support |
| **GLSL** | Shader language | Parallel pixel processing |
| **TypeScript** | Type system | Catch WebGL type errors early |
| **Web Audio API** | Audio processing | Built-in frequency analysis |

### Key Libraries & Tools

- **No external WebGL library** - Pure WebGL2 for learning purposes
- **No heavy bundler** - Simple, transparent build process
- **ESLint + TypeScript** - Type safety and code quality

## 📈 Performance Characteristics

- **Target FPS:** 60 frames per second
- **Frame Time Budget:** ~16ms per frame
- **Typical Performance:** 30-60 FPS on modern devices
- **Bottlenecks:** 
  - Shader complexity (more effects = slower)
  - Texture sampling (higher resolution = slower)
  - JavaScript overhead (kept minimal)

## 🎓 Learning Outcomes

After studying this codebase, you'll be able to:

1. ✅ Set up WebGL2 contexts and programs
2. ✅ Write GLSL fragment shaders for image effects
3. ✅ Create and manage WebGL textures
4. ✅ Implement custom React hooks with refs
5. ✅ Build modular, plugin-based architectures
6. ✅ Optimize performance with caching strategies
7. ✅ Analyze audio in real-time
8. ✅ Create interactive visual effects

## 🔍 How to Read the Code

### Recommended Reading Order

1. **Start Simple:** `src/lib/ascii-charsets.ts` - Just character sets
2. **Understand Types:** `src/lib/webgl/types.ts` - All the type definitions
3. **Core Logic:** `src/hooks/useVideoToAscii.ts` - The main WebGL hook
4. **Feature Hooks:** Study one at a time (mouse, audio, ripple)
5. **Shaders:** Read the GLSL files last (they're the most complex)

### Code Navigation Tips

- Look for `//` comments that explain "why" not just "what"
- Pay attention to where `useRef` is used (it's crucial for WebGL)
- Note the `registerUniformSetter` pattern - it's the key to modularity
- Follow the data flow from video → texture → shader → canvas

## 🚀 Next Steps

Ready to dive in? Choose your path:

1. **I'm new to WebGL** → Start with `architecture/system-overview.md`
2. **I understand WebGL basics** → Jump to `code-walkthroughs/ascii-rendering.md`
3. **I want to see the full picture** → Read all architecture docs first
4. **I'm here for a specific topic** → Use the sidebar navigation

---

**Happy learning!** 🎉

This repository demonstrates production-quality WebGL code while remaining accessible for educational purposes. Take your time, experiment, and don't hesitate to modify the code to see what happens.