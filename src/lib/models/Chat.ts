import mongoose, { Schema, model, models, Document, Model } from 'mongoose';

export interface IChat extends Document {
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

chatSchema.index({ userId: 1, updatedAt: -1 });

const Chat: Model<IChat> = models.Chat || model<IChat>('Chat', chatSchema);

export default Chat;