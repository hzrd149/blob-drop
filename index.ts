#!/usr/bin/env bun

import "./env";
import "./db/index.ts";
import "./storage/index.ts";
import "./cron/index.ts";

import { PORT } from "./env";
import { handleUploadRequest } from "./api/upload";
import handleDownloadRequest from "./api/download";

import homepage from "./homepage/index.html";

const server = Bun.serve({
  port: PORT,
  routes: {
    // Blossom API
    "/upload": async (req) => await handleUploadRequest(req),
    "/:sha256": async (req) => await handleDownloadRequest(req),

    // fallback to serving web app
    "/": homepage,
  },

  development: true,
});

console.log(`Server running at http://localhost:${server.port}`);
