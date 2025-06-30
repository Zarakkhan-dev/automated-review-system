import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const GEMINI_MODEL_NAME = "gemini-2.0-flash";

class AIReviewService {
  private static geminiModel: any;

  static async initialize() {
    if (!this.geminiModel) {
      this.geminiModel = await genAI.getGenerativeModel({
        model: GEMINI_MODEL_NAME,
      });
    }
  }

  static async analyzeSentiment(
    text: string,
  ): Promise<{ score: number; rating: number }> {
    await this.initialize();

    try {
      const rating = await AIReviewService.getRatingFromGemini(text);
      const score = (rating - 1) / 4;
      
      return {
        score: parseFloat(score.toFixed(4)),
        rating: rating,
      };
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      return { score: 0.5, rating: 3 };
    }
  }

  static async generateAIReview(
    productName: string,
    reviews: string[] = [],
    score: number = 0,
  ): Promise<{ title: string; content: string }> {
    await this.initialize();

    try {
      const sentimentDescription =
        score >= 0.7
          ? "overwhelmingly positive"
          : score >= 0.4
            ? "generally positive"
            : score >= 0.1
              ? "mixed"
              : score >= -0.2
                ? "somewhat negative"
                : "very negative";

      const summarizedComments = reviews
        .slice(0, 5)
        .map((r) => `• ${r}`)
        .join("\n");

      const prompt = `
Product: "${productName}"
Average Sentiment Score: ${score.toFixed(2)} (${sentimentDescription})

Customer Comments:
${summarizedComments || "(No valid reviews provided)"}

Summary:
Write a clear, 3–4 line summary based only on the customer comments.
   - Do NOT use placeholders like [mention something].
   - If specific benefits are not mentioned, use more general, truthful phrasing.
   - Avoid generic buzzwords like "satisfactory" or "solid choice".

Title:
Write a 3-5 word title that fits the tone.
`.trim();

      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const titleMatch = text.match(/Title:\s*(.+)/i);
      const summaryMatch = text.match(/Summary:\s*([\s\S]+)/i);

      return {
        title: titleMatch?.[1]?.trim() || "AI Review Summary",
        content:
          summaryMatch?.[1]?.trim() || "This product received mixed feedback.",
      };
    } catch (error) {
      console.error("Gemini AI review generation error:", error);
      return {
        title: "Product Overview",
        content: "AI analysis currently unavailable. Please try again later.",
      };
    }
  }

  static async generateFlashCommentByScore(score: number): Promise<string> {
    await this.initialize();

    const mood =
      score >= 0.7
        ? "extremely positive"
        : score >= 0.4
          ? "generally positive"
          : score >= 0.1
            ? "mixed"
            : score >= -0.3
              ? "somewhat negative"
              : "strongly negative";

    const prompt = `
The overall customer sentiment is "${mood}".

Write a realistic and brief 2–3 line product summary that reflects this tone. Avoid exaggeration and remain factual.
`.trim();

    try {
      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      return text || "No comment available.";
    } catch (error) {
      console.error("Gemini flash comment error:", error);
      return "No comment available.";
    }
  }

  static async getRatingFromGemini(text: string): Promise<number> {
    await this.initialize();
    try {
      const prompt = `
Analyze the following customer review and determine the sentiment. 
Provide a rating between 1 to 5 where:
1 = Very negative
2 = Negative
3 = Neutral
4 = Positive
5 = Very positive

Review:
"${text}"

Return ONLY the number without any additional text or explanation.
`.trim();

      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      const raw = response.text().trim();

      const num = parseInt(raw, 10);
      return Number.isNaN(num) ? 3 : Math.min(5, Math.max(1, num));
    } catch (err) {
      console.error("Gemini rating error:", err);
      return 3;
    }
  }

  static async generateReplyForReview(reviewText: string, rating: number): Promise<string> {
    await this.initialize();
    
    try {
      const tone = rating >= 4 ? "positive and appreciative" 
                : rating >= 2 ? "professional and understanding" 
                : "apologetic and concerned";
      
      const prompt = `
A customer left this review with a rating of ${rating} stars:
"${reviewText}"

Generate a short (1-2 sentence) ${tone} reply from the business. 
For positive reviews, say thank you. 
For negative reviews, acknowledge the issue and thank them for feedback.
Keep it concise and professional.
`.trim();

      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error("Error generating reply:", error);
      return rating >= 3 ? "Thank you for your review!" : "Thank you for your feedback.";
    }
  }

}

export default AIReviewService;