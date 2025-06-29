import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const jwt = (await cookies()).get('jwt')?.value;
    if (!jwt) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, history } = await req.json();
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const formattedHistory = Array.isArray(history)
      ? history.map((msg: string) => ({
          role: 'user',
          parts: [{ text: msg }],
        }))
      : [];

    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const rawText = response.text();

    // Clean and format AI response
    const formattedText = cleanAndFormatResponse(rawText);

    return NextResponse.json({ text: formattedText });
  } catch (error: any) {
    console.error("Error generating response:", error.message || error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}

function cleanAndFormatResponse(text: string): string {
  text = text.replace(/^\*\*(\d+\..+?)\*\*/gm, '<h2>$1</h2>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  const lines = text.split('\n');
  const result: string[] = [];

  let inList = false;
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Handle code block start and end
    if (trimmed.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        const codeContent = codeBuffer.join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        result.push(`<pre class="code-block"><code>${codeContent}</code></pre>`);
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (trimmed.startsWith("*")) {
      if (!inList) {
        inList = true;
        result.push("<ul>");
      }
      result.push(`<li>${trimmed.slice(1).trim()}</li>`);
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      result.push(`<p>${line}</p>`);
    }
  }

  if (inList) result.push("</ul>");
  return result.join("\n");
}
