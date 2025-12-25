# video2ascii

WebGL-powered React Component for video to ASCII conversion.

![gta.jpeg](./assets/gta.jpeg)

## Installation

```bash
npm install video2ascii
```

## Local Demo

To run a demo locally using Bun:

```bash
# Build the library
npm run build

# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Run the demo with Bun
bun run demo.ts
```

The demo will open in your browser at `http://localhost:3000` and display the `born.mp4` video as ASCII art.

## Usage

```tsx
import Video2Ascii from "video2ascii";

<Video2Ascii
  src="/video.mp4"
  numColumns={120}
  colored={true}
  brightness={1.0}
  audioEffect={50}
  enableMouse={true}
  enableRipple={true}
  charset="detailed"
  isPlaying={true}
  autoPlay={true}
/>;
```

## Props

| Prop                   | Type         | Default      | Description                                       |
| ---------------------- | ------------ | ------------ | ------------------------------------------------- |
| `src`                  | `string`     | required     | Video URL                                         |
| `numColumns`           | `number`     | -            | Number of columns (controls size)                 |
| `colored`              | `boolean`    | `true`      | Use video colors vs green terminal                |
| `brightness`           | `number`     | `1.0`        | Brightness multiplier (0-2, 1.0 = normal)         |
| `blend`                | `number`     | `0`          | 0 = ASCII, 100 = original video                   |
| `highlight`            | `number`     | `0`          | Background behind characters (0-100)              |
| `charset`              | `CharsetKey` | `"standard"` | Character set                                     |
| `enableMouse`          | `boolean`    | `true`       | Cursor glow effect                                |
| `trailLength`          | `number`     | `24`         | Mouse trail length                                |
| `enableRipple`         | `boolean`    | `false`      | Click ripple effect                               |
| `rippleSpeed`          | `number`     | `40`         | Ripple expansion speed                            |
| `audioEffect`          | `number`     | `0`          | How much audio affects brightness (0-100)         |
| `audioRange`           | `number`     | `50`         | How dramatic audio brightness changes are (0-100) |
| `isPlaying`            | `boolean`    | `true`       | Whether video is playing                          |
| `autoPlay`             | `boolean`    | `true`       | Auto-play on load                                 |
| `enableSpacebarToggle` | `boolean`    | `false`      | Enable spacebar to toggle play/pause              |
| `showStats`            | `boolean`    | `false`      | Show FPS overlay                                  |
| `className`            | `string`     | `""`         | CSS class name                                    |

## Character Sets

```tsx
import { ASCII_CHARSETS } from "video2ascii";
```

- `standard` — `@%#*+=-:. `
- `detailed` — Full gradient with 70 characters
- `blocks` — `█▓▒░ `
- `minimal` — `@#. `
- `binary` — `10 `
- `dots` — `●◉○◌ `
- `arrows` — `↑↗→↘↓↙←↖ `
- `emoji` — Various emoji
