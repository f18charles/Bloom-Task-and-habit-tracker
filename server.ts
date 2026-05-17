// This is the main server entry point that integrates Vite with Express.
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { setupBackend } from "./src/server/index.ts";
import { setupCronJobs } from "./src/server/cron.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for JSON bodies
  app.use(express.json());

  // Setup Backend API routes
  setupBackend(app);
  
  // Setup Background Jobs
  setupCronJobs();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bloom server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
