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
  const { data: userData } = useFetchMeQuery();
  const router = useRouter();

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/products/${params.id}`, {
          cache: "no-store",
        });

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
      // Submit user review
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

      // Generate AI review after successful submission
      const aiResponse = await fetch('/api/generate-ai-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: params.id,
          productName: product?.name,
          reviews: [...reviews.users, result.userReview],
          AiRating: reviews.ai?.rating || 0
        })
      });

      const aiResult = await aiResponse.json();

      // Update state with new reviews
      setReviews(prev => ({
        users: [result.userReview, ...prev.users], 
        ai: aiResult.success ? aiResult.aiReview : prev.ai
      }));

      // Update product rating if changed
      if (product && result.averageRating !== undefined) {
        setProduct({
          ...product,
          averageRating: result.averageRating
        });
      }
      setRating(0);
      setComment("");
      
      toast.success('Review submitted successfully!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

    } catch (err: any) {
      console.error("Review submission error:", err);
      setError(err.message || "Failed to submit review. Please try again.");
      toast.error(err.message || "Failed to submit review", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="mt-[5%] flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mt-[5%] flex h-screen items-center justify-center">
        <p className="text-red-500">{error || "Product not found"}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-[5%] px-4 py-8">
      {/* Product Display */}
      <div className="mb-8 flex flex-col gap-8 md:flex-row">
        <div className="md:w-1/2">
          <div className="overflow-hidden rounded-lg bg-white shadow-md">
            <img
              src={product.image || '/placeholder-product.png'}
              alt={product.name}
              className="h-auto w-full object-cover"
              width={600}
              height={400}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-product.png';
              }}
            />
          </div>
        </div>
        <div className="md:w-1/2">
          <h1 className="mb-4 text-3xl font-bold">{product.name}</h1>
          <div className="mb-4 flex items-center">
            <Rating value={product.averageRating} />
            <span className="ml-2 text-gray-600">
              ({reviews.users.length} {reviews.users.length === 1 ? "review" : "reviews"})
            </span>
          </div>
          <p className="mb-6 text-2xl font-bold text-gray-800">
            ${product.price.toFixed(2)}
          </p>
          <button 
            className="rounded-full bg-blue-600 px-6 py-2 font-bold text-white transition duration-300 hover:bg-blue-700"
            onClick={() => toast.info('Add to cart functionality coming soon!')}
          >
            Add to Cart
          </button>
        </div>
      </div>

      {/* Product Description */}
      <div className="mb-8">
        <h2 className="mb-4 text-2xl font-bold">Description</h2>
        <p className="text-gray-700">{product.description}</p>
      </div>

      {/* AI Response */}
      {reviews.ai && (
        <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <div className="flex flex-col items-center justify-center text-center mb-4">
            <h3 className="text-xl font-semibold text-blue-800">AI Response</h3>
            <p className="text-sm text-blue-600">
              Based on {reviews.users.length} user reviews and product analysis
            </p>
          </div>
          {/* {reviews.ai.aiTitle && (
            <h4 className="mb-3 text-lg font-medium text-center text-blue-700">
              {reviews.ai.aiTitle}
            </h4>
          )} */}
          <div className="flex justify-center mb-3">
            <Rating value={reviews.ai.rating} />
          </div>
          <p className="text-gray-700 text-center">{reviews.ai.comment}</p>
        </div>
      )}

      {/* Customer Reviews */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Customer Reviews</h2>
          {reviews.users.length > 0 && (
            <div className="flex items-center">
              <span className="mr-2 font-medium">Average:</span>
              <Rating value={product.averageRating} />
              <span className="ml-2 text-gray-600">
                ({product.averageRating.toFixed(1)})
              </span>
            </div>
          )}
        </div>
        
        {reviews.users.length > 0 ? (
          <div className="space-y-6">
            {reviews.users.map((review) => (
              <div key={review._id} className="border-b border-gray-200 pb-6">
                <div className="mb-3 flex justify-between">
                  <div>
                    <p className="font-medium">
                      {review.userId?.name || 'Anonymous'}
                    </p>
                    {review.rating && (
                      <div className="flex items-center">
                        <Rating value={review.rating} />
                        <span className="ml-1 text-sm text-gray-500">
                          ({review.rating}.0)
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
                <p className="text-gray-700">{review.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No reviews yet. Be the first to review!</p>
        )}
      </div>

      {/* Review Form */}
      {userData?.user ? (
        <div className="rounded-lg bg-gray-50 p-6">
          <h3 className="mb-4 text-xl font-semibold">Write a Review</h3>
          {error && (
            <div className="mb-4 rounded bg-red-100 p-3 text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="mb-2 block text-gray-700">Your Rating</label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                  >
                    <svg
                      className={`h-8 w-8 ${rating >= star ? "text-yellow-400" : "text-gray-300"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {rating ? `You selected ${rating} star${rating !== 1 ? 's' : ''}` : 'Select a rating'}
              </p>
            </div>
            <div className="mb-4">
              <label htmlFor="comment" className="mb-2 block text-gray-700">
                Your Review <span className="text-red-500">*</span> (minimum 10 characters)
              </label>
              <textarea
                id="comment"
                name="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
                minLength={10}
                maxLength={1000}
                placeholder="Share your thoughts about this product..."
              />
              <p className="mt-1 text-sm text-gray-500">
                {comment.length}/1000 characters
              </p>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || comment.trim().length < 10}
              className={`rounded-full px-6 py-2 font-bold text-white transition duration-300 ${
                isSubmitting || comment.trim().length < 10
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit Review"
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-6 text-center">
          <p className="text-gray-700">
            Please{" "}
            <a 
              href="/login" 
              className="text-blue-600 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                router.push('/signin');
              }}
            >
              sign in
            </a>{" "}
            to leave a review
          </p>
        </div>
      )}
    </div>
  );
}