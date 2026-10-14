import mongoose from "mongoose";

const privateRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxLength: 24,
  },
  key: {
    type: String,
    required: true, // Hashed password
  },
  creator: {
    type: String,
    required: true,
  },
  isPrivate: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const PrivateRoom = mongoose.model("PrivateRoom", privateRoomSchema);

export default PrivateRoom;
