# Nexus Chat — Deployment Guide (Hostinger VPS / Node.js Hosting)

## Prerequisites

- Node.js 18+ on the server
- npm 9+
- A domain with SSL certificate (HTTPS is **mandatory** for video/audio calling)

---

## 1. Upload the Project

Upload your entire project folder to your Hostinger server (via SSH, Git, or File Manager).

Exclude these folders/files (they'll be regenerated):
- `node_modules/`
- `client/node_modules/`
- `client/dist/`
- `*.db` (database files — unless you want to keep existing data)

---

## 2. Install Dependencies

SSH into your server and navigate to the project folder:

```bash
cd /path/to/nexus-chat
npm run install:all
```

This installs dependencies for both the server and client.

---

## 3. Configure Environment

Edit the `.env` file in the project root:

```env
# REQUIRED — Change these for production!
NODE_ENV=production
PORT=3001
JWT_SECRET=your_very_long_random_secret_key_here_minimum_32_chars

# Your domain(s) — comma-separated if multiple
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Server binding
HOST=0.0.0.0

# Optional — Custom TURN server for better video call reliability
# The app already includes free TURN servers, but for production scale:
# TURN_URL=turn:your-turn-server.com:3478
# TURN_USERNAME=your_username
# TURN_CREDENTIAL=your_password
```

### Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 4. Build the Frontend

```bash
npm run build
```

This creates the `client/dist/` folder with the production-optimized React app.

---

## 5. Start the Server

### Option A: Direct start
```bash
npm start
```

### Option B: Using PM2 (recommended for production)
```bash
# Install PM2 globally
npm install -g pm2

# Start the app
pm2 start server/index.js --name nexus-chat --env production

# Auto-restart on server reboot
pm2 startup
pm2 save

# View logs
pm2 logs nexus-chat
```

---

## 6. Reverse Proxy Setup (Nginx)

If Hostinger uses Nginx (most VPS plans do), add this config:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificate (Hostinger usually auto-configures this)
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Proxy to Node.js
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeout
        proxy_read_timeout 86400;
    }

    # File upload size limit
    client_max_body_size 50M;
}
```

### Important Nginx notes:
- The `Upgrade` and `Connection` headers are **required** for WebSocket (Socket.IO)
- `proxy_read_timeout 86400` keeps WebSocket connections alive
- `client_max_body_size 50M` matches the Express body limit

---

## 7. Hostinger-Specific Setup

### If using Hostinger VPS:
1. SSH into your VPS
2. Install Node.js: `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs`
3. Upload project files
4. Follow steps 2-6 above
5. Enable SSL via Hostinger panel or Let's Encrypt

### If using Hostinger Node.js Hosting:
1. Upload files via File Manager or Git
2. Set the **entry point** to `server/index.js`
3. Set environment variables in Hostinger panel:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (your generated secret)
   - `CORS_ORIGINS` = `https://yourdomain.com`
   - `PORT` = (check Hostinger docs — they may assign a port)
4. Hostinger auto-provisions SSL, so HTTPS will work automatically
5. Click **Restart** in the Node.js panel

---

## 8. Verify Deployment

After deploying, check these:

1. **App loads**: Visit `https://yourdomain.com` — you should see the login page
2. **API works**: Visit `https://yourdomain.com/api/health` — should return `{"status":"ok"}`
3. **ICE servers**: Visit `https://yourdomain.com/api/ice-servers` — should return STUN+TURN config
4. **Register & Login**: Create an account and log in
5. **Messaging**: Send messages in a chat
6. **File uploads**: Send an image or file
7. **Video/Audio calls**: Make a call to another user — this is the critical test!

---

## 9. Troubleshooting

### Calls not working?

1. **Check HTTPS**: Open browser console → type `window.isSecureContext`. Must be `true`.
2. **Check ICE servers**: Open browser console → `fetch('/api/ice-servers').then(r=>r.json()).then(console.log)`. Should show STUN+TURN servers.
3. **Check WebSocket**: In browser console, you should NOT see "Socket connection error" messages.
4. **TURN server test**: Visit https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/ — add the TURN server credentials and test connectivity.

### WebSocket connection drops?
- Check Nginx has `proxy_read_timeout` set to a high value
- Ensure the `Upgrade` header is being passed through

### 502 Bad Gateway?
- Server isn't running. Check with `pm2 status` or `ps aux | grep node`
- Port mismatch between Nginx config and `.env` PORT

### File uploads fail?
- Check `uploads/` directory exists and has write permissions: `chmod -R 755 uploads/`
- If behind Nginx, check `client_max_body_size`

---

## 10. Architecture Summary

```
Browser (HTTPS)
    ↓
Nginx (SSL termination + reverse proxy)
    ↓
Node.js Express Server (port 3001)
    ├── Static files (client/dist/)
    ├── REST API (/api/*)
    ├── File uploads (/uploads/*)
    ├── Socket.IO (WebSocket for real-time messaging + call signaling)
    └── SQLite database (nexus_chat.db)

Video/Audio Calls:
    Browser A ←→ STUN/TURN servers ←→ Browser B
    (WebRTC peer-to-peer, signaling via Socket.IO)
```

---

## 11. Feature Checklist

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
