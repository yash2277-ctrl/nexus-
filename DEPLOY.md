# Nexus Chat — Appwrite Deployment Guide

## Architecture

```
Browser → Appwrite Cloud
            ├── Authentication
            ├── Database collections
            ├── Storage bucket
            └── Realtime subscriptions
```

---

## What to deploy

Deploy the `client/` folder as a static Vite app. Appwrite handles auth, storage, database, and realtime, so no separate backend host is needed for the current setup.

---

## Before deployment

1. Confirm these Appwrite env vars exist in `client/.env` and in your host dashboard:
    - `VITE_APPWRITE_ENDPOINT`
    - `VITE_APPWRITE_PROJECT_ID`
    - `VITE_APPWRITE_DATABASE_ID`
    - `VITE_APPWRITE_USER_COLLECTION_ID`
    - `VITE_APPWRITE_MESSAGE_COLLECTION_ID`
    - `VITE_APPWRITE_STORAGE_ID`
2. Make sure the Appwrite collections and bucket permissions are set correctly.
3. Run a local build once with `npm run build` inside `client/`.

---

## Build command

Use this for hosting providers like Netlify, Cloudflare Pages, or any static host:

| Setting | Value |
|---------|-------|
| **Root directory** | `client` |
| **Build command** | `npm run build` |
| **Output directory** | `dist` |

---

## Environment variables

Add the same values from `client/.env` to your host platform:

| Key | Example |
|-----|---------|
| `VITE_APPWRITE_ENDPOINT` | `https://cloud.appwrite.io/v1` |
| `VITE_APPWRITE_PROJECT_ID` | `69ea8ab4002d951ad4fe` |
| `VITE_APPWRITE_DATABASE_ID` | `69ea8bed002722169e62` |
| `VITE_APPWRITE_USER_COLLECTION_ID` | `69ea8c7f0023492752fa` |
| `VITE_APPWRITE_MESSAGE_COLLECTION_ID` | `69ea8cbf001a5ab705f0` |
| `VITE_APPWRITE_STORAGE_ID` | `69ea8d0a0001199a7474` |

---

## Verification

After deployment:

1. Open the site and confirm the login screen loads.
2. Register or sign in.
3. Load the user list and message list.
4. Send a message and refresh to confirm it persists.
5. Open a second browser to verify realtime updates.

---

## Notes

- If you use a static host, make sure the host serves `client/dist` as the public directory.
- If you later add a custom domain, update Appwrite allowed platforms accordingly.
TURN_URL=turn:your-server.com:3478
TURN_USERNAME=your_username
TURN_CREDENTIAL=your_password
```
