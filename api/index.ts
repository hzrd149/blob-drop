import { PORT } from "../env";
import handleDownloadRequest from "./download";
import { handleUploadRequest } from "./upload";

const server = Bun.serve({
  port: PORT,
  routes: {
    "/upload": handleUploadRequest,
    "/:sha256": handleDownloadRequest,
  },
});

console.log(`Server running at http://localhost:${server.port}`);
