# Google Calendar Integration Setup

To enable Google Calendar sync, you need to set up a Google Cloud Project and obtain OAuth 2.0 credentials.

## 1. Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named "Bloom Task Manager".

## 2. Enable APIs
1. In the sidebar, go to **APIs & Services > Library**.
2. Search for and enable the **Google Calendar API**.

## 3. Configure OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Select **External** and fill in the required fields (App name, support email, etc.).
3. Add the scope: `.../auth/calendar.events` (Manage your Google Calendar events).
4. Add your email as a **Test User** if the app is in Testing mode.

## 4. Create OAuth 2.0 Credentials
1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Select **Web application** as the application type.
4. Add the following **Authorized Redirect URIs**:
   - `http://localhost:3000/api/calendar/callback`
   - `[YOUR_APP_URL]/api/calendar/callback` (Replace `[YOUR_APP_URL]` with your live URL provided by AI Studio)
5. Click **Create** and copy the **Client ID** and **Client Secret**.

## 5. Set Environment Variables
Add the following to your environment in AI Studio:
- `GOOGLE_CLIENT_ID`: Your Google Client ID
- `GOOGLE_CLIENT_SECRET`: Your Google Client Secret
