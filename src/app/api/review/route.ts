import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDB from '@/lib/db';
import Review from '@/lib/models/Review';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User'; 

export async function POST(request: Request) {
  try {
    await connectToDB();
    const { productId, userId, rating, comment } = await request.json();

    // First, get the user's name
    const user = await User.findById(userId).select('name');
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Create new review
    const newReview = new Review({
      productId,
      userId,
      rating,
      comment
    });

    await newReview.save();

    // Calculate new average rating
    const reviews = await Review.find({ productId });
    const ratedReviews = reviews.filter(r => r.rating);
    const averageRating = ratedReviews.length > 0 
      ? parseFloat((ratedReviews.reduce((acc, curr) => acc + (curr.rating || 0), 0) / ratedReviews.length).toFixed(1))
      : 0;

    await Product.findByIdAndUpdate(productId, { averageRating });

    return NextResponse.json({
      success: true,
      userReview: {
        ...newReview.toObject(),
        _id: newReview._id.toString(),
        userId: {
          _id: userId,
          name: user.name 
        }
      },
      averageRating
    });

  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}