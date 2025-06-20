# StreamSync

Access backend code at: https://github.com/HarshitBamotra/StreamSync-Backend

Backend Deployment: https://streamsync-backend-54oq.onrender.com

Frontend Deployment: https://stream-sync-frontend.onrender.com

## Overview

This is the frontend for a real-time streaming application that allows users to create rooms and share audio, video, and screen with other participants using WebRTC and Socket.IO.

1. Create and manage streaming rooms.
2. Share audio, video, and screen in real time.
3. Support for multiple participants per room.
4. REST API for room operations.
5. Socket.IO-based signaling for WebRTC connections.
---

## Installation and Setup

### 1. Clone the repository:
```bash
git clone https://github.com/HarshitBamotra/Stream-Sync-Frontend.git
```

### 2. Change directory
```bash
cd Stream-Sync-Frontend
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Set up environment variables
**Sample `.env` file**
```env
VITE_API_URL="http://localhost:3000"
```

### 5. Build Application
```bash
npm run build
```

### 6. Run Application
```bash
npm run preview
```
