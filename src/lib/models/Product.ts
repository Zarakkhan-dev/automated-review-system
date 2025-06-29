import mongoose, { Schema, model, models, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  image: string;
  price: number;
  averageRating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReview extends Document {
  productId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  isAI?: boolean;
  aiTitle?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    averageRating: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Product: Model<IProduct> = models.Product || model<IProduct>('Product', productSchema);

export default Product;