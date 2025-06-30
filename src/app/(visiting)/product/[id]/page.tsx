'use client';

import { useFetchMeQuery } from "@/app/store/authApi";
import Rating from "@/components/Rating";
import { notFound, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { toast } from 'react-toastify';

interface Product {
  _id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  averageRating: number;
  createdAt: string;
  updatedAt?: string;
}

interface ReviewReply {
  _id: string;
  userId: {
    _id: string;
    name: string;
  };
  comment: string;
  createdAt: string;
}

interface Review {
  _id: string;
  productId: string;
  userId?: {
    _id: string;
    name: string;
  };
  rating?: number;
  comment: string;
  isAI?: boolean;
  aiTitle?: string;
  createdAt: string;
  replies?: ReviewReply[];
}

interface ReviewsResponse {
  ai: Review | null;
  users: Review[];
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState<ReviewsResponse>({ ai: null, users: [] });
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const { data: userData } = useFetchMeQuery();
  const router = useRouter();

  const fetchProductData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/products/${params.id}`, { cache: "no-store" });

      if (!res.ok) {
        if (res.status === 404) notFound();
        throw new Error("Failed to fetch product");
      }

      const data = await res.json();

      if (!data.success || !data.product) {
        throw new Error(data.error || 'Product data not found');
      }

      setProduct(data.product);
      setReviews({
        ai: data.reviews?.ai || null,
        users: data.reviews?.users || []
      });
    } catch (err) {
      console.error("Error loading product:", err);
      setError(err instanceof Error ? err.message : "Failed to load product");
      notFound();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductData();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!comment.trim() || comment.trim().length < 10) {
      return setError("Please write a review with at least 10 characters");
    }

    if (!userData?.user?.userId) {
      return setError("You must be logged in to submit a review");
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: params.id,
          userId: userData.user.userId,
          rating: rating > 0 ? rating : undefined,
          comment,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to submit review");
      }

      await fetchProductData(); 

      setRating(0);
      setComment("");
      toast.success('Review submitted successfully!', { position: "top-right", autoClose: 3000 });
    } catch (err: any) {
      console.error("Review submission error:", err);
      setError(err.message || "Failed to submit review. Please try again.");
      toast.error(err.message || "Failed to submit review", { position: "top-right", autoClose: 3000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (reviewId: string) => {
    if (!replyText.trim() || !userData?.user?.userId) return;

    try {
      const response = await fetch('/api/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          userId: userData.user.userId,
          comment: replyText,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit reply');
      }

      // Refresh the reviews
      await fetchProductData();
      setReplyingTo(null);
      setReplyText('');
      toast.success('Reply submitted successfully!');
    } catch (error: any) {
      console.error('Reply submission error:', error);
      toast.error(error.message || 'Failed to submit reply');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch (e) {
      return '';
    }
  };

  if (isLoading) return <div className="mt-[5%] flex h-screen items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;
  if (!product) return <div className="mt-[5%] flex h-screen items-center justify-center"><p className="text-red-500">{error || "Product not found"}</p></div>;

  return (
    <div className="container mx-auto mt-[5%] px-4 py-8">
      <div className="mb-8 flex flex-col gap-8 md:flex-row">
        <div className="md:w-1/2">
          <div className="overflow-hidden rounded-lg bg-white shadow-md">
            <img src={product.image || '/placeholder-product.png'} alt={product.name} className="h-auto w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).src = '/placeholder-product.png')} />
          </div>
        </div>
        <div className="md:w-1/2">
          <h1 className="mb-4 text-3xl font-bold">{product.name}</h1>
          <div className="mb-4 flex items-center">
            <Rating value={product.averageRating} />
            <span className="ml-2 text-gray-600">({reviews.users.length} review{reviews.users.length !== 1 ? 's' : ''})</span>
          </div>
          <p className="mb-6 text-2xl font-bold text-gray-800">${product.price.toFixed(2)}</p>
          <button className="rounded-full bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700" onClick={() => toast.info('Add to cart functionality coming soon!')}>Add to Cart</button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-2xl font-bold">Description</h2>
        <p className="text-gray-700">{product.description}</p>
      </div>

      {reviews.ai && (
        <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <div className="mb-4 text-center">
            <h3 className="text-xl font-semibold text-blue-800">AI Review Summary</h3>
            <p className="text-sm text-blue-600">Based on {reviews.users.length} user reviews</p>
          </div>
          <div className="flex justify-center mb-3">
            <Rating value={reviews.ai.rating} />
          </div>
          <p className="text-center text-gray-700">{reviews.ai.comment}</p>
        </div>
      )}

      <div className="mb-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Customer Reviews</h2>
          {reviews.users.length > 0 && (
            <div className="flex items-center">
              <span className="mr-2 font-medium">Average:</span>
              <Rating value={product.averageRating} />
              <span className="ml-2 text-gray-600">({product.averageRating.toFixed(1)})</span>
            </div>
          )}
        </div>

        {reviews.users.length > 0 ? (
          <div className="space-y-6">
            {reviews.users.map((review) => (
              <div key={review._id} className="border-b border-gray-200 pb-6">
                <div className="mb-3 flex justify-between">
                  <div>
                    <p className="font-medium">{review.userId?.name || 'Anonymous'}</p>
                    {review.rating && (
                      <div className="flex items-center">
                        <Rating value={review.rating} />
                        <span className="ml-1 text-sm text-gray-500">({review.rating}.0)</span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{formatDate(review.createdAt)}</span>
                </div>
                <p className="text-gray-700">{review.comment}</p>
                
                {/* Replies section */}
                {review.replies?.length > 0 && (
                  <div className="mt-4 pl-6 border-l-2 border-gray-200">
                    {review.replies.map((reply) => (
                      <div key={reply._id} className="mb-3">
                        <div className="flex justify-between">
                          <p className="font-medium text-sm">{reply.userId.name}</p>
                          <span className="text-xs text-gray-500">{formatDate(reply.createdAt)}</span>
                        </div>
                        <p className="text-gray-600 text-sm">{reply.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Reply form */}
                {userData?.user && (
                  <div className="mt-4">
                    {replyingTo === review._id ? (
                      <div className="flex flex-col">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write your reply..."
                          className="w-full rounded-md border border-gray-300 p-2 text-sm"
                          rows={2}
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => handleReplySubmit(review._id)}
                            className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
                          >
                            Submit
                          </button>
                          <button
                            onClick={() => setReplyingTo(null)}
                            className="rounded bg-gray-200 px-3 py-1 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReplyingTo(review._id)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : <p className="text-gray-500">No reviews yet. Be the first to review!</p>}
      </div>

      {userData?.user ? (
        <div className="rounded-lg bg-gray-50 p-6">
          <h3 className="mb-4 text-xl font-semibold">Write a Review</h3>
          {error && <div className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="comment" className="mb-2 block text-gray-700">Your Review <span className="text-red-500">*</span></label>
              <textarea id="comment" name="comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={4} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" required minLength={10} maxLength={1000} placeholder="Share your thoughts..." />
              <p className="mt-1 text-sm text-gray-500">{comment.length}/1000 characters</p>
            </div>
            <button type="submit" disabled={isSubmitting || comment.trim().length < 10} className={`rounded-full px-6 py-2 font-bold text-white ${isSubmitting || comment.trim().length < 10 ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>{isSubmitting ? "Submitting..." : "Submit Review"}</button>
          </form>
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-6 text-center">
          <p className="text-gray-700">Please <a href="/login" className="text-blue-600 hover:underline" onClick={(e) => { e.preventDefault(); router.push('/signin'); }}>sign in</a> to leave a review</p>
        </div>
      )}
    </div>
  );
}