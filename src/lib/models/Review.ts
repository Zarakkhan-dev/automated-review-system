import mongoose, { Schema, model, models, Document, Model } from 'mongoose';

export interface ReviewReplyBase {
   _id?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  comment: string;
  createdAt: Date;
}

export interface IReviewReply extends ReviewReplyBase, Document {
    _id: mongoose.Types.ObjectId;
}

export interface IReview extends Document {
  productId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  isAI: boolean;
  aiTitle: string;
  sentimentScore?: number;
  replies: ReviewReplyBase[];
  createdAt: Date;
  updatedAt: Date;
}

const reviewReplySchema = new Schema<IReviewReply>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 500,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, { _id: true });

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
      required: function () {
        return !this.isAI; 
      },
    },
    rating: {
      type: Number,
      required: true,
      min: [0, 'Rating must be at least 0'],
      max: [5, 'Rating cannot exceed 5'],
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
    replies: [reviewReplySchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add virtual population for better performance
reviewSchema.virtual('populatedUserId', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

reviewSchema.virtual('populatedReplies', {
  ref: 'User',
  localField: 'replies.userId',
  foreignField: '_id',
  justOne: false
});

let Review: Model<IReview> =  models.Review ||  model<IReview>('Review', reviewSchema);

export default Review;