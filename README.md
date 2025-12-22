# video2ascii

WebGL-powered React Component for video to ASCII conversion.

![gta.jpeg](./assets/gta.jpeg)


## Installation

```bash
npm install video2ascii
```

## Usage

```tsx
import { VideoToAscii } from "video2ascii";

<VideoToAscii 
    src="/video.mp4" 
    fontSize={12} 
    colored={true} 
    audioReactivity={50} 
    enableMouse={true}
    enableRipple={true}
    charset="detailed"
/>;
```

## Props

| Prop               | Type         | Default      | Description                            |
| ------------------ | ------------ | ------------ | -------------------------------------- |
| `src`              | `string`     | required     | Video URL                              |
| `fontSize`         | `number`     | `10`         | Character size (smaller = more detail) |
| `colored`          | `boolean`    | `false`      | Use video colors vs green terminal     |
| `blend`            | `number`     | `0`          | 0 = ASCII, 100 = original video        |
| `highlight`        | `number`     | `0`          | Background behind characters (0-100)   |
| `charset`          | `CharsetKey` | `"standard"` | Character set                          |
| `maxWidth`         | `number`     | `900`        | Max width in pixels                    |
| `enableMouse`      | `boolean`    | `true`       | Cursor glow effect                     |
| `trailLength`      | `number`     | `24`         | Mouse trail length                     |
| `enableRipple`     | `boolean`    | `false`      | Click ripple effect                    |
| `rippleSpeed`      | `number`     | `40`         | Ripple expansion speed                 |
| `audioReactivity`  | `number`     | `0`          | Brightness from audio (0-100)          |
| `audioSensitivity` | `number`     | `50`         | How dramatic audio effect is           |
| `showStats`        | `boolean`    | `false`      | Show FPS overlay                       |

## Character Sets

```tsx
import { ASCII_CHARSETS } from "@/lib/ascii-charsets";
```

- `standard` — `@%#*+=-:. `
- `detailed` — Full gradient with 70 characters
- `blocks` — `█▓▒░ `
- `minimal` — `@#. `
- `binary` — `10 `
- `dots` — `●◉○◌ `
- `arrows` — `↑↗→↘↓↙←↖ `
- `emoji` — Various emoji
