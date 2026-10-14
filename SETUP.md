# Quick Start Guide

## 5-Minute Setup

### Prerequisites
- Node.js installed
- MongoDB running (or MongoDB Atlas account)

### Step 1: Install Dependencies

**Backend:**
```bash
cd chat-app/server
npm install
```

**Frontend:**
```bash
cd chat-app/client
npm install
```

### Step 2: Configure Environment

Create `chat-app/server/.env`:
```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/pulse-chat
JWT_SECRET=dev-secret-key
NODE_ENV=development
```

### Step 3: Start MongoDB (if local)

**Windows:**
```bash
mongod
```

**macOS:**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

### Step 4: Start the Application

**Terminal 1 - Backend:**
```bash
cd chat-app/server
npm run dev
```

You should see:
```
✓ Connected to MongoDB
✓ Chat server listening on :4000
```

**Terminal 2 - Frontend:**
```bash
cd chat-app/client
npm run dev
```

You should see:
```
VITE v5.4.0 ready in 123 ms
➜  Local: http://localhost:5173/
```

### Step 5: Open in Browser

Go to `http://localhost:5173`

## Testing the Features

### 1. Login
- Username: `alice` (or any name)
- Password: `test123` (or any 3+ char password)

### 2. Join Public Room
- Click on "general" room
- Enter display name
- Click "Join chat"

### 3. Create Private Room
- Click "Create Private Room"
- Room name: `my-team`
- Room key: `secret123`
- Click "Create Room"

### 4. Join Private Room
- Select the private room (🔒 icon)
- Enter room key: `secret123`
- Click "Join chat"

### 5. Send Messages
- Type a message
- Press Enter or click Send
- See real-time delivery

### 6. Test Multiple Users
- Open another browser tab
- Login with different username
- Join same room
- Chat between them

## Using MongoDB Atlas (Cloud)

### 1. Create Account
- Go to [mongodb.com](https://mongodb.com)
- Sign up free

### 2. Create Cluster
- Click "Create a Deployment"
- Choose "Free" tier
- Select region and create

### 3. Get Connection String
- Click "Connect"
- Choose "Drivers"
- Copy connection string

### 4. Update .env
```env
MONGODB_URI=mongodb+srv://username:password@cluster-name.mongodb.net/pulse-chat
```

Replace:
- `username` - Your DB user
- `password` - Your DB password
- `cluster-name` - Your cluster name

### 5. Create Database
- In MongoDB Atlas, create database `pulse-chat`

## Common Commands

### Backend Development
```bash
cd chat-app/server

# Start with auto-reload
npm run dev

# Start production
npm start

# Run tests
npm test
```

### Frontend Development
```bash
cd chat-app/client

# Development server
npm run dev

# Build for production
npm run build

# Preview build
npm run preview
```

## Debugging

### Enable Debug Logs

Backend - Add to `.env`:
```env
DEBUG=*
```

### Check MongoDB Connection

```bash
mongosh
# or for older versions
mongo

# In MongoDB shell:
use pulse-chat
db.privaterooms.find()
db.sessions.find()
```

### Check Socket.IO Logs

Browser DevTools → Console tab shows Socket.IO events

## Port Forwarding (for sharing)

To share your local app with others:

```bash
# Install ngrok
npm install -g ngrok

# In new terminal
ngrok http 5173

# Share the forwarded URL
```

## Troubleshooting

**Can't connect to MongoDB**
- Ensure MongoDB is running
- Check MONGODB_URI is correct
- Verify network access (if using Atlas)

**Port 4000/5173 already in use**
- Change PORT in `.env` for backend
- Change port in `package.json` for frontend

**Login not working**
- Ensure backend is running on port 4000
- Check CORS origin matches frontend URL
- Check browser console for errors

**Messages not sending**
- Verify Socket.IO connection (look for "Live" status)
- Check network tab for errors
- Restart server if connection drops

**Private room key not working**
- Ensure correct spelling
- Keys are case-sensitive
- Try creating new room if corrupted

## Next Steps

1. Read the full [README.md](./README.md)
2. Explore the code structure
3. Customize styling in `styles.css`
4. Add features from enhancement list
5. Deploy to production

## Production Deployment

### Prepare for Production

1. **Set environment variables:**
```env
JWT_SECRET=generate-a-strong-random-secret
NODE_ENV=production
CLIENT_ORIGIN=https://yourdomain.com
```

2. **Build frontend:**
```bash
cd chat-app/client
npm run build
```

3. **Serve static files:**
```bash
# Backend index.js
app.use(express.static('../client/dist'));
```

4. **Use MongoDB Atlas** (don't run MongoDB locally)

5. **Set up HTTPS** (required for secure cookies)

### Deploy Options

- **Heroku:** `git push heroku main`
- **Vercel:** Frontend only (use separate backend)
- **Railway:** Full-stack deployment
- **Docker:** Container deployment

Enjoy your chat application! 🎉