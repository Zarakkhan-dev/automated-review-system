import { NextResponse } from 'next/server';
import connectToDB from '@/lib/db';
import Review from '@/lib/models/Review';
import User from '@/lib/models/User';
import AIReviewService from '@/services/aiReviewService';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  try {
    await connectToDB();
    const { reviewId, userId, comment, isAI = false } = await request.json();

    if (!reviewId || !userId || !comment) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid review ID format' },
        { status: 400 }
      );
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    let replyComment = comment;
    let sentimentScore = 0.5;

    if (isAI) {
      const sentiment = await AIReviewService.analyzeSentiment(comment);
      sentimentScore = sentiment.score;
      replyComment = await AIReviewService.generateReplyForReview(
        review.comment,
        review.rating || 3
      );
    }

    const newReply = {
      userId: new mongoose.Types.ObjectId(userId),
      comment: replyComment,
      createdAt: new Date(),
    };

    review.replies.push(newReply as any); 
    const savedReview = await review.save();

    const addedReply = savedReview.replies[savedReview.replies.length - 1];

    return NextResponse.json({
      success: true,
      reply: {
        _id: addedReply._id.toString(),
        userId: {
          _id: user._id.toString(),
          name: user.name,
        },
        comment: addedReply.comment,
        createdAt: addedReply.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error adding reply:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add reply' },
      { status: 500 }
    );
  }
}