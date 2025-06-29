import mongoose from 'mongoose';

export interface PopulatedReview {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  userId?: {
    _id: mongoose.Types.ObjectId;
    name: string;
  } | null;
  rating?: number;
  comment: string;
  isAI: boolean;
  aiTitle?: string;
  sentimentScore?: number;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}