
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDB from '@/lib/db';
import Product from '@/lib/models/Product';
import Review from '@/lib/models/Review';
import User from '@/lib/models/User'; 

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID format' },
        { status: 400 }
      );
    }

    const product = await Product.findById(id).lean();
    const reviews = await Review.find({ productId: id })
      .populate('userId', 'name')
      .lean();

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const aiReview = reviews.find(review => review.isAI);
    const userReviews = reviews.filter(review => !review.isAI);

    const ratedReviews = userReviews.filter(review => typeof review.rating === 'number');
    const averageRating = ratedReviews.length > 0 
      ? parseFloat((ratedReviews.reduce((acc, curr) => acc + (curr.rating || 0), 0) / ratedReviews.length).toFixed(1))
      : 0;

    const responseData = {
      success: true,
      product: {
        ...product,
        _id: product._id.toString(),
        averageRating,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt?.toISOString() || null
      },
      reviews: {
        ai: aiReview ? {
          ...aiReview,
          _id: aiReview._id.toString(),
          createdAt: aiReview.createdAt.toISOString(),
          updatedAt: aiReview.updatedAt?.toISOString() || null
        } : null,
        users: userReviews.map(review => {
          const user = (typeof review.userId === 'object' && 'name' in review.userId)
            ? {
                _id: (review.userId as any)._id?.toString?.() || '',
                name: (review.userId as any).name || 'Unknown'
              }
            : undefined;

          return {
            ...review,
            _id: review._id.toString(),
            userId: user,
            createdAt: review.createdAt.toISOString(),
            updatedAt: review.updatedAt?.toISOString() || null
          };
        })
      },
      meta: {
        totalReviews: userReviews.length,
        averageRating
      }
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error fetching product' 
      },
      { status: 500 }
    );
  }
}
