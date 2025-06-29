import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { productId, productName, reviews, AiRating } = await request.json();

    // Prepare prompt for Gemini with AI rating priority
    const prompt = `
      Analyze this product and generate a helpful AI response based on:
      1. The AI rating (${AiRating || 0} stars) - this should be the PRIMARY factor
      2. Customer reviews (${reviews.length} total reviews)
      
      Product: "${productName}"
      AI Rating: ${AiRating || 0} stars (most important)
      Customer Reviews:
      ${reviews.slice(0, 10).map((r: any, i: number) => 
        `${i + 1}. ${r.rating ? `${r.rating} stars: ` : ''}${r.comment}`
      ).join('\n')}
      ${reviews.length > 10 ? `\n(Showing 10 of ${reviews.length} reviews)` : ''}

      Generate a response with:
      1. A catchy title (max 10 words) that reflects the AI rating
      2. Use the AI rating (${AiRating}) as the final rating
      3. A balanced summary (max 150 words) that:
         - Starts by acknowledging the AI rating
         - Mentions key points from customer reviews
         - Provides an overall assessment
      
      Important rules:
      - The final rating MUST be exactly ${AiRating}
      - AI rating takes priority over customer reviews
      - Keep the tone professional but approachable
      
      Format as JSON: {title: string, rating: number, summary: string}
    `;

    // Generate content with Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    console.log('Gemini response:', result);
    const response = await result.response;
    const text = response.text();
    
    // Parse the response
    let aiResponse;
    try {
      aiResponse = JSON.parse(text.trim());
      aiResponse.rating = AiRating;
    } catch (e) {
      aiResponse = {
        title: `AI Rating: ${AiRating} Stars`,
        rating: AiRating,
        summary: `Based on our AI assessment (${AiRating} stars) and customer feedback, this product ${AiRating >= 3.5 ? 'performs well' : 'has some limitations'}. ${reviews.length > 0 ? 'Customers mention: ' + reviews.slice(0, 3).map(r => r.comment.substring(0, 50) + '...').join(' ') : ''}`
      };
    }

    return NextResponse.json({
      success: true,
      aiReview: {
        productId,
        isAI: true,
        aiTitle: aiResponse.title,
        rating: aiResponse.rating, 
        comment: aiResponse.summary,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating AI review:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate AI review',
       
      },
      { status: 500 }
    );
  }
}