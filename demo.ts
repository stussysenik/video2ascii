#!/usr/bin/env bun

const PORT = 3000;

const server = Bun.serve({
        port: PORT,
        async fetch(req) {
                const url = new URL(req.url);
                const pathname = url.pathname;

                // Serve the video file
                if (pathname === "/born.mp4") {
                        const file = Bun.file("./born.mp4");
                        return new Response(file, {
                                headers: {
                                        "Content-Type": "video/mp4",
                                        "Access-Control-Allow-Origin": "*",
                                },
                        });
                }

                // Serve the built library
                if (pathname.startsWith("/dist/")) {
                        const file = Bun.file("." + pathname);
                        if (file.size > 0) {
                                return new Response(file);
                        }
                        return new Response("Not found", { status: 404 });
                }

                // Only serve HTML on root path
                if (pathname !== "/") {
                        return new Response("Not found", { status: 404 });
                }

                // Serve the demo HTML page
                const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video2ASCII Demo</title>
  <style>
    body { margin: 0; padding: 0; background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: "Courier New", monospace; }
    #root { width: 100%; height: 100vh; display: flex; justify-content: center; align-items: center; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script type="module">
    console.log('Starting demo...');

    import Video2Ascii from './dist/index.mjs';
    console.log('Video2Ascii loaded:', Video2Ascii);

    const App = () => {
      console.log('App component rendering...');
      return React.createElement(Video2Ascii, {
        src: "/born.mp4",
        numColumns: 150,
        colored: true,
        brightness: 1.0,
        audioEffect: 50,
        enableMouse: true,
        enableRipple: true,
        charset: "detailed",
        isPlaying: true,
        autoPlay: true,
        onError: (error) => {
          console.error('Video2Ascii error:', error);
        }
      });
    };

    try {
      const root = ReactDOM.createRoot(document.getElementById("root"));
      root.render(React.createElement(App));
      console.log('App rendered successfully');
    } catch (error) {
      console.error('Error rendering app:', error);
      document.getElementById("root").innerHTML = '<div style="color: white; text-align: center; padding: 20px;"><h3>Error</h3><p>' + error.message + '</p></div>';
    }
  </script>
  <script>
    window.addEventListener('error', (e) => {
      console.error('Global error:', e.error);
    });
  </script>
</body>
</html>`;

                return new Response(html, {
                        headers: { "Content-Type": "text/html; charset=utf-8" },
                });
        },
});

console.log(`🚀 Video2ASCII Demo running at http://localhost:${PORT}`);
console.log(`📹 Playing: born.mp4`);
