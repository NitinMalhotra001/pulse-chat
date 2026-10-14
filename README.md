# Pulse Chat - Enhanced Version with Authentication & Private Rooms



## Features

✨ **New Features:**
- 🔐 Session-based authentication (login with username/password)
- 🔒 Private rooms with password protection
- 👥 Real-time presence and typing indicators
- 💬 Message history with infinite scroll
- 🌐 Public and private rooms
- 📱 Responsive design with dark theme

## Project Structure

```
chat-app/
├── server/                    # Node.js backend
│   ├── models/
│   │   ├── PrivateRoom.js    # MongoDB schema for private rooms
│   │   └── Session.js        # MongoDB schema for sessions
│   ├── middleware/
│   │   └── auth.js           # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js           # Login, logout, verify endpoints
│   │   └── rooms.js          # Private room management
│   ├── index.js              # Main server with Socket.IO
│   ├── .env                  # Environment variables
│   └── package.json
│
└── client/                    # React frontend
    ├── src/
    │   ├── components/
    │   │   ├── LoginScreen.jsx      # Authentication UI
    │   │   ├── JoinScreen.jsx       # Room selection with key input
    │   │   ├── CreateRoomModal.jsx  # Private room creation
    │   │   ├── Sidebar.jsx          # Room list and users
    │   │   ├── MessageList.jsx      # Chat messages
    │   │   └── Composer.jsx         # Message input
    │   ├── useChat.js        # Socket.IO & authentication hook
    │   ├── App.jsx           # Main app with auth flow
    │   ├── styles.css        # Styling
    │   └── main.jsx
    └── package.json
```

## Prerequisites

- **Node.js** 16+ 
- **MongoDB** 4.4+ (running locally on port 27017 or via connection URI)
- **npm** or **yarn**

## Installation & Setup

### 1. Install MongoDB

**Option A: Local Installation**
- Windows: [MongoDB Community Edition](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/)
- macOS: `brew install mongodb-community`
- Linux: [MongoDB installation guide](https://docs.mongodb.com/manual/administration/install-on-linux/)

**Option B: MongoDB Atlas (Cloud)**
- Create a free account at [mongodb.com](https://mongodb.com)
- Create a cluster and get connection string
- Update `.env` file with your `MONGODB_URI`

### 2. Setup Backend

```bash
cd chat-app/server

# Install dependencies
npm install

# Start MongoDB (if running locally)
# Windows: mongod
# macOS/Linux: brew services start mongodb-community

# Start development server
npm run dev
```

The server will connect to MongoDB and listen on `http://localhost:4000`

### 3. Setup Frontend

```bash
cd chat-app/client

# Install dependencies
npm install

# Start development server
npm run dev
```

The client will run on `http://localhost:5173`

## Usage

### Authentication Flow

1. **Login Screen** - Opens first
   - Enter any username (3-24 characters)
   - Enter any password (3+ characters)
   - Creates a session and JWT token

2. **Join Screen** - After successful login
   - Choose display name (different from username)
   - Select public room or create private room
   - For private rooms, enter the room key

### Public Rooms

- Default rooms: `general`, `random`, `react-help`
- Anyone can join without password
- No authentication required

### Private Rooms

1. **Create Private Room**
   - Click "Create Private Room" button
   - Enter room name and password key
   - Room is created and accessible only with correct key

2. **Join Private Room**
   - Select private room from list (🔒 icon)
   - Enter the room key
   - Join the room and start chatting

### Chat Features

- **Real-time messaging** - Messages appear instantly
- **Typing indicators** - See who's typing
- **User presence** - See who's online
- **Message history** - Scroll up to load older messages
- **Room switching** - Switch between rooms easily
- **Logout** - Exit and return to login

## Environment Variables

Create `.env` file in `chat-app/server/`:

```env
# Server
PORT=4000
CLIENT_ORIGIN=*

# Database (local MongoDB)
MONGODB_URI=mongodb://localhost:27017/pulse-chat

# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pulse-chat

# JWT Secret (change in production!)
JWT_SECRET=your-super-secret-key-change-this

# Environment
NODE_ENV=development
```

## API Endpoints

### Authentication

**POST /api/auth/login**
```json
{
  "username": "john_doe",
  "password": "password123"
}
```
Response:
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "username": "john_doe", "sessionId": "uuid" }
}
```

**POST /api/auth/logout**
- Requires: Authorization header with Bearer token
- Destroys session

**GET /api/auth/verify**
- Requires: Authorization header with Bearer token
- Validates token and session

### Rooms

**POST /api/rooms/create**
- Requires: Authorization header
- Creates private room with encrypted key

**GET /api/rooms/list**
- Requires: Authorization header
- Returns list of accessible private rooms

**POST /api/rooms/verify-key**
- Requires: Authorization header
- Verifies room key for access

## Socket.IO Events

### Client → Server

**join**
```javascript
socket.emit('join', {
  name: "Display Name",
  room: "room-name",
  token: "jwt-token",        // Optional, for private rooms
  roomKey: "password"         // Required for private rooms
}, callback)
```

**message**
```javascript
socket.emit('message', {
  text: "Hello!",
  clientId: "uuid"
}, callback)
```

**typing**
```javascript
socket.emit('typing', true/false)
```

**history**
```javascript
socket.emit('history', {
  room: "room-name",
  before: "message-id"
}, callback)
```

### Server → Client

**rooms** - Updated list of all rooms
**presence** - Users in current room
**message** - New message received
**typing** - User typing indicator

## Troubleshooting

### MongoDB Connection Error
```
✗ MongoDB connection error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Start MongoDB service or update `MONGODB_URI` in `.env`

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::4000
```
**Solution:** Change PORT in `.env` or kill process using port 4000

### CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:** Ensure `CLIENT_ORIGIN` in `.env` matches your frontend URL

### Token Expired
**Solution:** Logout and login again to get new token

## Security Notes

⚠️ **Development Only**
- Default JWT secret should be changed in production
- Room keys are hashed with bcrypt but sent over HTTPS in production
- Implement rate limiting for auth endpoints in production
- Add CSRF protection for production deployment

## Performance Tips

- Messages are stored in-memory per room (max 200 messages)
- Private room metadata stored in MongoDB
- Session tokens expire after 24 hours
- Optimize message load with pagination

## Future Enhancements

- [ ] User avatars
- [ ] Message reactions
- [ ] Room permissions (admin/moderator)
- [ ] Message search
- [ ] Voice/video chat integration
- [ ] Message encryption
- [ ] Read receipts
- [ ] User profiles
- [ ] Room categories

## License

MIT

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review console logs for error messages
3. Ensure all dependencies are installed
4. Verify MongoDB connection

---

**Happy Chatting! 🚀**