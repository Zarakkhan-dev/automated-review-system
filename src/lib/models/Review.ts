import mongoose, { Schema, model, models, Document, Model } from 'mongoose';

export interface IReview extends Document {
  productId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  isAI: boolean;
  aiTitle: string;
  sentimentScore?: number; 
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: [0, 'Rating must be at least 0'],
      max: [5, 'Rating cannot exceed 5'],
      validate: {
        validator: Number.isFinite,
        message: 'Rating must be a number',
      },
    },
    comment: {
      type: String,
      default: '',
      trim: true,
    },
    isAI: {
      type: Boolean,
      default: false,
    },
    aiTitle: {
      type: String,
      default: '',
      trim: true,
    },
    sentimentScore: {
      type: Number,
      min: -1,
      max: 1,
    },
  },
  {
    timestamps: true,
  }
);

const Review: Model<IReview> = models.Review || model<IReview>('Review', reviewSchema);

export default Review;
