import { pipeline } from '@xenova/transformers';

class AIReviewService {
  private static sentimentAnalysis: any;
  private static textGeneration: any;

  static async initialize() {
    if (!this.sentimentAnalysis) {
      this.sentimentAnalysis = await pipeline(
        'text-classification',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
      );
    }
    if (!this.textGeneration) {
      this.textGeneration = await pipeline(
        'text-generation',
        'Xenova/distilgpt2'
      );
    }
  }

  static async analyzeSentiment(text: string): Promise<{score: number, rating: number}> {
    await this.initialize();
    
    try {
      const sentimentResult = await this.sentimentAnalysis(text);
      const baseScore = sentimentResult[0].label === 'POSITIVE' 
        ? sentimentResult[0].score 
        : -sentimentResult[0].score;
      
      const intensityWords = {
        strongPositive: ['excellent', 'amazing', 'perfect', 'love', 'fantastic', 'outstanding'],
        moderatePositive: ['good', 'great', 'nice', 'happy', 'satisfied'],
        weakPositive: ['okay', 'decent', 'acceptable', 'fine'],
        weakNegative: ['disappointing', 'mediocre', 'subpar', 'lacking'],
        moderateNegative: ['bad', 'poor', 'unhappy', 'frustrated'],
        strongNegative: ['terrible', 'awful', 'horrible', 'hate', 'waste']
      };

      let intensityScore = 0;
      const lowerText = text.toLowerCase();
      
      if (intensityWords.strongPositive.some(w => lowerText.includes(w))) intensityScore = 1;
      else if (intensityWords.moderatePositive.some(w => lowerText.includes(w))) intensityScore = 0.6;
      else if (intensityWords.weakPositive.some(w => lowerText.includes(w))) intensityScore = 0.3;
      else if (intensityWords.weakNegative.some(w => lowerText.includes(w))) intensityScore = -0.3;
      else if (intensityWords.moderateNegative.some(w => lowerText.includes(w))) intensityScore = -0.6;
      else if (intensityWords.strongNegative.some(w => lowerText.includes(w))) intensityScore = -1;

      const combinedScore = (baseScore * 0.7) + (intensityScore * 0.3);
      
      const ratingMap = [
        { min: -1, max: -0.6, rating: 1 },
        { min: -0.6, max: -0.2, rating: 2 },
        { min: -0.2, max: 0.2, rating: 3 },
        { min: 0.2, max: 0.6, rating: 4 },
        { min: 0.6, max: 1, rating: 5 }
      ];
      
      const finalRating = ratingMap.find(
        range => combinedScore >= range.min && combinedScore <= range.max
      )?.rating || 3;

      return { 
        score: combinedScore,
        rating: finalRating
      };
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return { score: 0, rating: 3 }; 
    }
  }

  static async generateAIReview(productName: string, reviews: string[] = []): Promise<{title: string, content: string}> {
    await this.initialize();
    
    try {
      let context = '';
      if (reviews.length > 0) {
        const sentiments = await Promise.all(reviews.map(r => this.analyzeSentiment(r)));
        const avgScore = sentiments.reduce((a, b) => a + b.score, 0) / sentiments.length;
        
        const sentimentDescription = avgScore > 0.6 ? 'overwhelmingly positive' :
                                   avgScore > 0.2 ? 'generally positive' :
                                   avgScore > -0.2 ? 'mixed' :
                                   avgScore > -0.6 ? 'somewhat negative' : 'very negative';
        
        context = `Based on customer feedback that is ${sentimentDescription}, `;
      }

      const prompt = `Product: ${productName}\n${context}Generate a concise, balanced product review that highlights key aspects:\n`;
      
      const output = await this.textGeneration(prompt, {
        max_new_tokens: 150,
        temperature: 0.7,
        repetition_penalty: 1.3,
        do_sample: true,
      });

      let content = output[0].generated_text.replace(prompt, '').trim();

      content = content.split('\n')[0]; 
      const title = content.split('.')[0].substring(0, 80) + (content.includes('.') ? '...' : '');

      return { 
        title: title || 'Product Review',
        content: content || 'This product has received positive feedback from customers.'
      };
    } catch (error) {
      console.error('AI review generation error:', error);
      return {
        title: 'Product Overview',
        content: 'Our AI analysis of this product is currently unavailable. Please check back later.'
      };
    }
  }
}

export default AIReviewService;