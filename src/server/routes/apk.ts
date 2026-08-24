import { Router } from "express";
import path from "path";
import fs from "fs";

const router = Router();

function getApkFilePath() {
  const publicApk = path.join(process.cwd(), "public", "bloom-productivity.apk");
  if (fs.existsSync(publicApk)) return publicApk;

  const rootApk = path.join(process.cwd(), "bloom-productivity.apk");
  if (fs.existsSync(rootApk)) return rootApk;

  return null;
}

router.get("/status", (req, res) => {
  const customUrl = process.env.APK_DOWNLOAD_URL;
  const filePath = getApkFilePath();

  if (customUrl || filePath) {
    return res.json({
      available: true,
      downloadUrl: customUrl || "/api/apk/download",
    });
  }

  return res.json({
    available: false,
    message: "Android App coming soon",
  });
});

router.get("/download", (req, res) => {
  const customUrl = process.env.APK_DOWNLOAD_URL;
  if (customUrl) {
    return res.redirect(customUrl);
  }

  const filePath = getApkFilePath();
  if (filePath) {
    return res.download(filePath, "bloom-productivity.apk");
  }

  return res.status(404).json({ message: "Android APK coming soon" });
});

export default router;
