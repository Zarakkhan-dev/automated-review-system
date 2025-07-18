import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDB from "@/lib/db";
import Product from "@/lib/models/Product";
import Review from "@/lib/models/Review";
import AIReviewService from "@/services/aiReviewService";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

interface ReviewReply {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId; name: string };
  comment: string;
  createdAt: Date;
}

interface ReviewWithReplies extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId; name: string };
  rating?: number;
  comment: string;
  isAI?: boolean;
  aiTitle?: string;
  sentimentScore?: number;
  replies: ReviewReply[];
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await connectToDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid product ID format" },
        { status: 400 },
      );
    }

    const product = await Product.findById(id).lean();
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 },
      );
    }

    const allReviews = await Review.find({ productId: id })
      .sort({ createdAt: -1 })
      .populate("userId", "name")
      .populate("replies.userId", "name")
      .lean();

    const userReviews = allReviews.filter((r) => !r.isAI);
    const aiReview = allReviews.find((r) => r.isAI);

    // Calculate average rating from user reviews only
    const ratedReviews = userReviews.filter((r) => typeof r.rating === "number");
    const averageRating =
      ratedReviews.length > 0
        ? parseFloat(
            (
              ratedReviews.reduce((acc, r) => acc + (r.rating || 0), 0) /
              ratedReviews.length
            ).toFixed(1),
          )
        : 0;

    // Update product's average rating if it's different
    if (product.averageRating !== averageRating) {
      await Product.findByIdAndUpdate(id, { averageRating });
    }

    // Analyze sentiment for all user comments
    const allComments = userReviews.map((r) => r.comment).filter(Boolean);
    let avgScore = 0.5; // Default neutral score
    
    if (allComments.length > 0) {
      const sentiments = await Promise.all(
        allComments.map((comment) => AIReviewService.analyzeSentiment(comment)),
      );
      avgScore = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;
    }

    // Generate or update AI review if needed
    let updatedAIReview = aiReview;
    if (
      !aiReview ||
      !aiReview.comment ||
      aiReview.comment === "No comment available." ||
      // Regenerate AI review if there are new user reviews
      (userReviews.length > 0 && 
       (!aiReview.createdAt || 
        new Date(aiReview.createdAt) < new Date(userReviews[0].createdAt)))
    ) {
      const { title: aiTitle, content: aiComment } =
        await AIReviewService.generateAIReview(
          product.name,
          allComments,
          avgScore,
        );

      if (aiComment && aiComment !== "No comment available.") {
        const aiSentiment = await AIReviewService.analyzeSentiment(aiComment);

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

    // Format the response data
    const formatReview = (review: any) => ({
      _id: review._id.toString(),
      rating: review.rating,
      comment: review.comment,
      sentimentScore: review.sentimentScore,
      createdAt: new Date(review.createdAt).toISOString(),
      updatedAt: new Date(review.updatedAt).toISOString(),
      ...(review.aiTitle && { aiTitle: review.aiTitle }),
      ...(review.isAI !== undefined && { isAI: review.isAI }),
      ...(review.userId && {
        userId: {
          _id: 
            typeof review.userId === 'object' && '_id' in review.userId 
              ? review.userId._id.toString() 
              : review.userId.toString(),
          name: 
            typeof review.userId === 'object' && 'name' in review.userId 
              ? review.userId.name 
              : 'Unknown',
        },
      }),
      ...(review.replies && {
        replies: review.replies.map((reply: any) => ({
          _id: reply._id.toString(),
          comment: reply.comment,
          createdAt: new Date(reply.createdAt).toISOString(),
          userId: {
            _id: 
              typeof reply.userId === 'object' && '_id' in reply.userId 
                ? reply.userId._id.toString() 
                : reply.userId.toString(),
            name: 
              typeof reply.userId === 'object' && 'name' in reply.userId 
                ? reply.userId.name 
                : 'Unknown',
          },
        })),
      }),
    });

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
        ai: updatedAIReview ? formatReview(updatedAIReview) : null,
        users: userReviews.map(formatReview),
      },
      meta: {
        totalReviews: userReviews.length,
        averageRating,
        sentimentScore: parseFloat(avgScore.toFixed(4)),
      },
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Error fetching product",
      },
      { status: 500 },
    );
  }
}