import "./env";
import "./db/index.ts";
import "./storage/index.ts";
import "./cron/index.ts";

import { PORT } from "./env";
import { handleUploadRequest } from "./api/upload";
import handleDownloadRequest from "./api/download";

const server = Bun.serve({
  port: PORT,
  routes: {
    // Serve web app
    "/": { GET: () => new Response(Bun.file("public/index.html")) },
    "/index.html": { GET: () => new Response(Bun.file("public/index.html")) },
    "/main.js": { GET: () => new Response(Bun.file("public/main.js")) },
    "/styles.css": { GET: () => new Response(Bun.file("public/styles.css")) },

    // Blossom API
    "/upload": handleUploadRequest,
    "/:sha256": handleDownloadRequest,
  },
});

console.log(`Server running at http://localhost:${server.port}`);
