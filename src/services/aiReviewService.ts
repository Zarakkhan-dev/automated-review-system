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
      // First try to get rating directly from Gemini
      const rating = await AIReviewService.getRatingFromGemini(text);
      
      // Convert rating to score (0-1 scale)
      const score = (rating - 1) / 4; // Maps 1-5 to 0-1
      
      return {
        score: parseFloat(score.toFixed(4)),
        rating: rating,
      };
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      return { score: 0.5, rating: 3 }; // Return neutral if error occurs
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
Write a 3-4 line honest review summary based ONLY on the comments above. Highlight the overall experience. No fiction or exaggeration.

Title:
Write a 3-5 word title that fits the tone.
`.trim();

      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract title and summary
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
}

export default AIReviewService;