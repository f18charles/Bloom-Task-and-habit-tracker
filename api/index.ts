import serverApp from "../dist/server.cjs";

// Handle both standard default import and ESModule default wrapping from CommonJS
const app = (serverApp as any).default || serverApp;

export default app;
