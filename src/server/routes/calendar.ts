import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.ts";
import { createOAuthClient, syncFromGoogle } from "../services/calendarSyncService.ts";
import { prisma } from "../lib/prisma.ts";

const router = Router();

// Routes BEFORE middleware (public)
router.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  const userId = state as string;

  if (!userId || !code) {
    console.error("Invalid OAuth callback:", { userId, code });
    return res.status(400).send("Invalid request: missing user or code");
  }

  const oauth2Client = createOAuthClient();
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    
    await prisma.googleToken.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: new Date(tokens.expiry_date!),
      },
      create: {
        userId,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt: new Date(tokens.expiry_date!),
      },
    });

    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; margin: 0;">
          <div style="text-align: center; background: white; padding: 3rem; border-radius: 2rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0; max-w: 400px; width: 80%;">
            <svg style="width: 64px; height: 64px; color: #10b981; margin: 0 auto 1.5rem auto;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h1 style="color: #0f172a; font-size: 1.75rem; font-weight: 800; margin: 0 0 0.5rem 0; tracking: -0.025em;">Connected!</h1>
            <p style="color: #64748b; font-size: 0.95rem; margin: 0 0 1.5rem 0; line-height: 1.5;">Your calendar has been successfully linked. You can close this window now.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                setTimeout(() => window.close(), 1500);
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).send("Authentication failed. Please try again.");
  }
});

// Routes AFTER middleware (protected)
router.use(authenticate);

router.get("/auth-url", (req: AuthRequest, res) => {
  const oauth2Client = createOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    prompt: "consent",
    state: req.user?.id // Pass userId in state to identify back in callback
  });
  res.json({ data: { url } });
});

router.post("/sync", async (req: AuthRequest, res) => {
  try {
    await syncFromGoogle(req.user!.id);
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(500).json({ error: "Failed to sync" });
  }
});

router.delete("/disconnect", async (req: AuthRequest, res) => {
  try {
    await prisma.googleToken.deleteMany({ where: { userId: req.user!.id } });
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

router.get("/status", async (req: AuthRequest, res) => {
  const token = await prisma.googleToken.findUnique({ where: { userId: req.user!.id } });
  res.json({ data: { connected: !!token, lastSyncedAt: token?.lastSyncedAt } });
});

export default router;
