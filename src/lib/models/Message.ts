import mongoose, { Schema, model, models, Document, Model } from 'mongoose';

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  role: 'user' | 'model';
  content: string;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  role: { type: String, enum: ['user', 'model'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

messageSchema.index({ chatId: 1, createdAt: 1 });

const Message: Model<IMessage> = models.Message || model<IMessage>('Message', messageSchema);

export default Message;