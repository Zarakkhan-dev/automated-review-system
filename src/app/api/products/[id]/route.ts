import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDB from '@/lib/db';
import Product from '@/lib/models/Product';
import Review from '@/lib/models/Review';
import AIReviewService from '@/services/aiReviewService';
import User from '@/lib/models/User';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid product ID format' }, { status: 400 });
    }

    const product = await Product.findById(id).lean();
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const allReviews = await Review.find({ productId: id }).sort({ createdAt: -1 }).populate('userId', 'name').lean();
    const userReviews = allReviews.filter(r => !r.isAI);
    const aiReview = allReviews.find(r => r.isAI);

    const ratedReviews = userReviews.filter(r => typeof r.rating === 'number');
    const averageRating = ratedReviews.length > 0
      ? parseFloat((ratedReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / ratedReviews.length).toFixed(1))
      : 0;

    const allComments = userReviews.map(r => r.comment).filter(Boolean);
    const sentiments = await Promise.all(allComments.map(comment => AIReviewService.analyzeSentiment(comment)));
    const avgScore = sentiments.length ? sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length : 0;

    let updatedAIReview = aiReview;
    if (!aiReview || !aiReview.comment || aiReview.comment === 'No comment available.') {
      const { title: aiTitle, content: aiComment } = await AIReviewService.generateAIReview(product.name, allComments, avgScore);

      if (aiComment && aiComment !== 'No comment available.') {
        const aiSentiment = {
          score: avgScore,
          rating: avgScore >= 0.7 ? 5 : avgScore >= 0.4 ? 4 : avgScore >= 0.1 ? 3 : avgScore >= -0.2 ? 2 : 1,
        };

        await Review.deleteMany({ productId: id, isAI: true });

        const newAIReview = await Review.create({
          productId: id,
          rating: aiSentiment.rating,
          comment: aiComment,
          isAI: true,
          aiTitle,
          sentimentScore: aiSentiment.score,
        });

        updatedAIReview = newAIReview.toObject();
      }
    }

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        _id: product._id.toString(),
        averageRating,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt?.toISOString() || null,
      },
      reviews: {
        ai: updatedAIReview ? {
          _id: updatedAIReview._id.toString(),
          rating: updatedAIReview.rating,
          aiTitle: updatedAIReview.aiTitle,
          comment: updatedAIReview.comment,
          sentimentScore: updatedAIReview.sentimentScore,
          createdAt: new Date(updatedAIReview.createdAt).toISOString(),
          updatedAt: new Date(updatedAIReview.updatedAt).toISOString(),
        } : null,
        users: userReviews.map(r => ({
          _id: r._id.toString(),
          rating: r.rating,
          comment: r.comment,
          sentimentScore: r.sentimentScore,
          createdAt: new Date(r.createdAt).toISOString(),
          updatedAt: new Date(r.updatedAt).toISOString(),
          userId: typeof r.userId === 'object' && 'name' in r.userId ? {
            _id: r.userId._id?.toString() || '',
            name: r.userId.name || 'Unknown',
          } : undefined,
        })),
      },
      meta: {
        totalReviews: userReviews.length,
        averageRating,
      },
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching product',
    }, { status: 500 });
  }
}
