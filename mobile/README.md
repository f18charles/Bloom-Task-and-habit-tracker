# Bloom Mobile (Expo / React Native)

Native client for the Bloom backend (`/api/*`). Features: sign in / register, dashboard, Kanban board, calendar and events, habits, progress charts, settings, Google Calendar connection status, and feedback.

## Run it

```bash
cd mobile
npm install
npx expo start          # scan the QR code with Expo Go, or press "a" for an emulator
```

## Point it at your backend

The API URL is resolved in this order:

1. `EXPO_PUBLIC_API_URL` environment variable
2. `expo.extra.apiUrl` in `app.json` — currently the hosted backend
   `https://bloom-iota-eight-40.vercel.app`
3. The Expo dev server host + port `3000` (local development fallback)
4. Platform fallback (`10.0.2.2` on the Android emulator, `127.0.0.1` elsewhere)

So normally just run:

```bash
npm start
```

To point at a local backend instead, override it:

```powershell
$env:EXPO_PUBLIC_API_URL="http://192.168.1.50:3000"; npm start
```

## Build an APK

```bash
npx eas-cli login
npx eas-cli init          # writes a real projectId into app.json
npx eas-cli build -p android --profile preview
```

`eas.json` defines the `preview` profile (APK output). Its `env` sets
`EXPO_PUBLIC_API_URL=https://bloom-iota-eight-40.vercel.app`, so the installed
app talks to the hosted backend.

The build page gives you a download link and an install QR code. On Android,
allow "Install unknown apps" for the browser you download with.

To serve the finished APK from the web app's "Get App" button, either commit it
at `public/bloom-productivity.apk` and redeploy, or set `APK_DOWNLOAD_URL` on
Vercel to the APK's download URL and redeploy.

## Notes

- The backend wraps responses as `{ data: ... }`; `src/api/client.ts` unwraps this.
- The JWT is stored with `expo-secure-store`. A 401 on any request signs the user out.
- The UI mirrors the web app: Outfit typography, slate/emerald/indigo palette, six-tab navigation.
- After installing new native modules, restart Metro with `npm start -- --clear`.
