import { NextResponse } from 'next/server';
import connectToDB from '@/lib/db';
import Review from '@/lib/models/Review';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import AIReviewService from '@/services/aiReviewService';

export async function POST(request: Request) {
  try {
    await connectToDB();
    const { productId, userId, rating, comment } = await request.json();

    // Fetch user info
    const user = await User.findById(userId).select('name');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // If rating not provided, analyze sentiment
    let finalRating = rating;
    let sentimentScore = 0;

    if (typeof rating !== 'number') {
      const sentiment = await AIReviewService.analyzeSentiment(comment);
      finalRating = sentiment.rating;
      sentimentScore = sentiment.score;
    }

    // Save user review
    const newReview = new Review({
      productId,
      userId,
      rating: finalRating,
      comment,
      isAI: false,
      aiTitle: '',
      sentimentScore
    });

    await newReview.save();

    // Get all reviews again (including the new one)
    const allReviews = await Review.find({ productId, isAI: false });

    // Recalculate average rating
    const averageRating =
      allReviews.length > 0
        ? parseFloat((allReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / allReviews.length).toFixed(1))
        : 0;

    await Product.findByIdAndUpdate(productId, { averageRating });

    // Delete old AI review(s)
    await Review.deleteMany({ productId, isAI: true });

    // Generate new AI review
    const comments = allReviews.map(r => r.comment);
    const { title: aiTitle, content: aiComment } = await AIReviewService.generateAIReview('Product', comments);
    const aiSentiment = await AIReviewService.analyzeSentiment(aiComment);
    const aiFlashComment = await AIReviewService.generateFlashCommentByScore(aiSentiment.score);

    const aiReview = new Review({
      productId,
      userId, 
      rating: aiSentiment.rating,
      comment: aiFlashComment,
      isAI: true,
      aiTitle,
      sentimentScore: aiSentiment.score
    });

    await aiReview.save();

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
      averageRating,
      aiReview: {
        _id: aiReview._id.toString(),
        title: aiTitle,
        content: aiFlashComment,
        rating: aiSentiment.rating,
        sentimentScore: aiSentiment.score
      }
    });

  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
