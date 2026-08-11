import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Disposition", 'attachment; filename="bloom-productivity-v1.0.apk"');

  // Binary stream for Android package installer
  const apkBinary = Buffer.from(
    "PK\x03\x04\x14\x00\x08\x00\x08\x00\x00\x00\x00\x00" +
    "BloomProductivityAndroidPackagev1.0.0"
  );

  res.status(200).send(apkBinary);
});

export default router;
