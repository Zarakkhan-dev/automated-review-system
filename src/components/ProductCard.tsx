"use client";

import React from 'react';
import Link from 'next/link';
import Rating from './Rating';

interface ProductCardProps {
  product: {
    _id: string;
    name: string;
    image: string;
    price: number;
    averageRating: number;
  };
  userId?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, userId }) => {

  return (
    <Link href={`/product/${product._id}`}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:scale-105 cursor-pointer">
        <div className="h-48 overflow-hidden">
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2 line-clamp-2">{product.name}</h3>
          <div className="flex justify-between items-center">
            <span className="text-gray-800 font-bold">${product.price.toFixed(2)}</span>
            <Rating value={product.averageRating} />
          </div>
          {userId && (
            <button 
              className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition duration-200"
              onClick={(e) => {
                e.preventDefault();
              }}
            >
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;