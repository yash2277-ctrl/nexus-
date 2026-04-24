# Nexus Chat — Deployment Guide

## Architecture: Vercel (Frontend) + Render (Backend) + Hostinger (DNS)

```
Browser → yourdomain.com (Hostinger DNS → Vercel)
           ├── Frontend (React/Vite) ← Served by Vercel
           └── API + WebSocket calls → nexus-chat.onrender.com (Render)
                                         ├── REST API (/api/*)
                                         ├── Socket.IO (WebSocket)
                                         ├── File uploads (/uploads/*)
                                         └── SQLite database
```

---

## Step 1: Deploy Backend on Render

### 1.1 Create a Web Service on Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo: `yash2277-ctrl/nexus-`
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `nexus-chat` (or any name) |
| **Root Directory** | *(leave empty — use project root)* |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server/index.js` |
| **Instance Type** | Free (or paid for always-on) |

### 1.2 Set Environment Variables on Render

Go to **Environment** tab and add:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | *(generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)* |
| `CORS_ORIGINS` | `https://your-app.vercel.app,https://yourdomain.com,https://www.yourdomain.com` |
| `PORT` | `10000` *(Render uses 10000 by default, or leave empty — Render sets it)* |
| `TURN_URL` | *(optional, e.g. `turn:your-turn-server.com:3478`)* |
| `TURN_USERNAME` | *(optional)* |
| `TURN_CREDENTIAL` | *(optional)* |

### 1.3 Deploy

Click **Create Web Service**. Wait for the build to complete.

**Copy your Render URL** — it will look like: `https://nexus-chat.onrender.com`

Test it: visit `https://nexus-chat.onrender.com/api/health` — should return `{"status":"ok"}`

---

## Step 2: Deploy Frontend on Vercel

### 2.1 Create a Project on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import your GitHub repo: `yash2277-ctrl/nexus-`
3. Configure:

| Setting | Value |
|---------|-------|
| **Root Directory** | `client` |
| **Framework Preset** | `Vite` (auto-detected) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### 2.2 Set Environment Variables on Vercel

Go to **Settings** → **Environment Variables** and add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://nexus-chat.onrender.com` *(your Render URL, NO trailing slash)* |

> **Important**: `VITE_` prefix is required — Vite only exposes env vars starting with `VITE_` to the client.

### 2.3 Deploy

Click **Deploy**. Vercel will build and deploy the frontend.

**Copy your Vercel URL** — it will look like: `https://nexus-chat.vercel.app`

### 2.4 Update Render CORS

Go back to Render → Environment Variables → update `CORS_ORIGINS` to include your Vercel URL:
```
https://nexus-chat.vercel.app,https://yourdomain.com,https://www.yourdomain.com
```
Redeploy Render after changing this.

---

## Step 3: Hostinger DNS Setup

### 3.1 Point your domain to Vercel

Go to **Hostinger** → **DNS Zone Editor** for your domain.

**Delete** any existing A, AAAA, or CNAME records for `@` and `www` that point to Hostinger's default servers (parking page IPs like `185.185.x.x`).

**Add these records:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| **A** | `@` | `76.76.21.21` | 3600 |
| **CNAME** | `www` | `cname.vercel-dns.com` | 3600 |

### 3.2 Add Domain to Vercel

1. In Vercel → **Settings** → **Domains**
2. Add `yourdomain.com` and `www.yourdomain.com`
3. Vercel will auto-provision an SSL certificate

### 3.3 Update Render CORS (again)

Make sure `CORS_ORIGINS` on Render includes your custom domain:
```
https://nexus-chat.vercel.app,https://yourdomain.com,https://www.yourdomain.com
```

### 3.4 DNS Records to DELETE

Remove these if they exist (Hostinger default parking records):

| Type | Name | Value (example) |
|------|------|-----------------|
| A | @ | `185.185.x.x` (Hostinger default) |
| AAAA | @ | Any IPv6 address |
| CNAME | www | `yourdomain.com` or Hostinger parking |
| A | www | Any Hostinger IP |

---

## Step 4: Verify Everything Works

1. **Frontend loads**: Visit `https://yourdomain.com` → login page appears
2. **API health**: Visit `https://nexus-chat.onrender.com/api/health` → `{"status":"ok"}`
3. **ICE servers**: `https://nexus-chat.onrender.com/api/ice-servers` → STUN+TURN config
4. **Register & login**: Create account, log in
5. **Send messages**: Open two browsers, chat between accounts
6. **File uploads**: Send an image — it should display correctly
7. **Video/audio calls**: Call between two accounts (HTTPS + TURN = works!)

---

## Required Environment Variables Summary

### Render (Backend) — set in Render dashboard

| Variable | Required | Example |
|----------|----------|---------|
| `NODE_ENV` | ✅ | `production` |
| `JWT_SECRET` | ✅ | `a1b2c3d4...` (64+ chars) |
| `CORS_ORIGINS` | ✅ | `https://nexus-chat.vercel.app,https://yourdomain.com` |
| `PORT` | ❌ | Render sets automatically |
| `TURN_URL` | ❌ | `turn:your-server.com:3478` |
| `TURN_USERNAME` | ❌ | TURN credentials |
| `TURN_CREDENTIAL` | ❌ | TURN credentials |

### Vercel (Frontend) — set in Vercel dashboard

| Variable | Required | Example |
|----------|----------|---------|
| `VITE_API_URL` | ✅ | `https://nexus-chat.onrender.com` |

---

## Troubleshooting

### CORS errors in browser console?
- The `CORS_ORIGINS` env var on Render must include your exact Vercel/domain URL
- Include `https://` — e.g. `https://yourdomain.com`, NOT `yourdomain.com`
- After changing, **redeploy** Render

### Calls not working?
1. **Check HTTPS**: Both Vercel and Render use HTTPS by default ✅
2. **Check ICE servers**: Browser console → `fetch('https://YOUR-RENDER-URL/api/ice-servers').then(r=>r.json()).then(console.log)`
3. **TURN test**: Visit https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

### Images/avatars not loading?
- Open browser DevTools → Network tab → check if `/uploads/...` requests go to your Render URL
- If they return 404, the files don't exist on Render's disk (Render's free tier has ephemeral storage)
- **Solution**: Use a cloud storage service (S3, Cloudinary) for production file storage

### WebSocket won't connect?
- Check browser console for "Socket connection error" messages
- Verify `VITE_API_URL` in Vercel env vars points to correct Render URL
- Render supports WebSockets on all plans

### Render free tier "spinning down"?
- Free Render instances spin down after 15 min of inactivity
- First request after spin-down takes ~30 seconds
- **Solution**: Upgrade to Render paid plan ($7/mo) for always-on

### DNS not working?
- DNS changes can take up to 48 hours to propagate
- Use https://dnschecker.org to verify propagation
- Make sure you deleted old Hostinger parking records

| Feature | Status | Notes |
|---------|--------|-------|
| User registration/login | ✅ | JWT-based auth |
| 1-on-1 messaging | ✅ | Real-time via Socket.IO |
| Group chats | ✅ | Create, add/remove members |
| File/image sharing | ✅ | Drag & drop, paste |
| Voice messages | ✅ | MediaRecorder API |
| Video calls | ✅ | WebRTC with TURN fallback |
| Audio calls | ✅ | WebRTC with TURN fallback |
| Screen sharing | ✅ | During video calls |
| Stories/Status | ✅ | 24-hour stories |
| Profile management | ✅ | Avatar, bio, display name |
| Message reactions | ✅ | Emoji reactions |
| Message delete | ✅ | Delete for self/everyone |
| Bookmarks | ✅ | Save messages |
| Online status | ✅ | Real-time presence |
| Typing indicators | ✅ | Real-time |
| Read receipts | ✅ | Message status |

---

## Notes on TURN Servers

The app includes free public TURN servers from `openrelay.metered.ca`. These work for testing and low traffic but have limitations:

- **Bandwidth**: Limited (not suitable for high traffic)
- **Reliability**: Not guaranteed uptime

For production at scale, consider:
- **Metered.ca**: Free tier with 500 GB/month — https://www.metered.ca/stun-turn
- **Twilio TURN**: Pay-as-you-go — https://www.twilio.com/stun-turn
- **Self-hosted Coturn**: Free but requires a server — https://github.com/coturn/coturn

Set custom TURN servers in `.env`:
```env
TURN_URL=turn:your-server.com:3478
TURN_USERNAME=your_username
TURN_CREDENTIAL=your_password
```
