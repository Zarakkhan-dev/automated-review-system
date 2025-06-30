import { NextResponse } from 'next/server';
import connectToDB from '@/lib/db';
import Review from '@/lib/models/Review';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import AIReviewService from '@/services/aiReviewService';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  try {
    await connectToDB();
    const { productId, userId, rating, comment } = await request.json();

    // Validate input
    if (!productId || !userId || !comment) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch user info
    const user = await User.findById(userId).select('name');
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // If rating not provided, analyze sentiment
    let finalRating = rating;
    let sentimentScore = 0;

    if (typeof rating !== 'number') {
      const sentiment = await AIReviewService.analyzeSentiment(comment);
      finalRating = sentiment.rating;
      sentimentScore = sentiment.score;
    }

    // Check if this is the first review for this product
    const existingReviewsCount = await Review.countDocuments({ 
      productId, 
      isAI: false 
    });
    const isFirstReview = existingReviewsCount === 0;

    // Create and save user review
    const newReview = new Review({
      productId: new mongoose.Types.ObjectId(productId),
      userId: new mongoose.Types.ObjectId(userId),
      rating: finalRating,
      comment,
      isAI: false,
      aiTitle: '',
      sentimentScore,
      replies: []
    });

    await newReview.save();

    // Get all reviews again (including the new one)
    const allReviews = await Review.find({ productId, isAI: false });

    // Recalculate average rating
    const averageRating = allReviews.length > 0
      ? parseFloat((allReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / allReviews.length).toFixed(1))
      : 0;

    await Product.findByIdAndUpdate(productId, { averageRating });

    // Delete old AI review(s)
    await Review.deleteMany({ productId, isAI: true });

    // Generate new AI review summary
    const comments = allReviews.map(r => r.comment);
    const { title: aiTitle, content: aiComment } = await AIReviewService.generateAIReview(
      'Product', 
      comments
    );
    const aiSentiment = await AIReviewService.analyzeSentiment(aiComment);
    const aiFlashComment = await AIReviewService.generateFlashCommentByScore(aiSentiment.score);

    const aiReview = new Review({
      productId: new mongoose.Types.ObjectId(productId),
      userId: new mongoose.Types.ObjectId(process.env.AI_USER_ID || '000000000000000000000000'),
      rating: aiSentiment.rating,
      comment: aiFlashComment,
      isAI: true,
      aiTitle,
      sentimentScore: aiSentiment.score
    });

    await aiReview.save();

    // If this is the first review, generate an AI reply
    let aiReply = null;
    console.log("isFirstReview", isFirstReview)
      const replyComment = await AIReviewService.generateReplyForReview(
        comment,
        finalRating
      );
      
      // Create a properly typed reply object
      const replyDoc = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(process.env.AI_USER_ID || '000000000000000000000000'),
        comment: replyComment,
        createdAt: new Date()
      };

      // Add the reply to the review
      newReview.replies.push(replyDoc);
      await newReview.save();

      // Format the reply for the response
      aiReply = {
        _id: replyDoc._id.toString(),
        userId: {
          _id: process.env.AI_USER_ID || '000000000000000000000000',
          name: 'AI Assistant'
        },
        comment: replyComment,
        createdAt: replyDoc.createdAt.toISOString()
      };


    // Format the response
    return NextResponse.json({
      success: true,
      userReview: {
        _id: newReview._id.toString(),
        productId: newReview.productId.toString(),
        userId: {
          _id: newReview.userId.toString(),
          name: user.name
        },
        rating: newReview.rating,
        comment: newReview.comment,
        isAI: newReview.isAI,
        sentimentScore: newReview.sentimentScore,
        createdAt: newReview.createdAt.toISOString(),
        updatedAt: newReview.updatedAt.toISOString(),
        ...(isFirstReview && aiReply && { replies: [aiReply] })
      },
      averageRating,
      aiReview: {
        _id: aiReview._id.toString(),
        title: aiTitle,
        content: aiFlashComment,
        rating: aiSentiment.rating,
        sentimentScore: aiSentiment.score
      },
      ...(isFirstReview && { aiReply })
    });

  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}