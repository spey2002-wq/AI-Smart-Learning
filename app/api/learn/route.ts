import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import type {
  LearnAttachment,
  LearnErrorResponse,
  LearnMode,
  LearnRequestBody,
  LearnSuccessResponse,
  QuizQuestion
} from "@/lib/learn-types";

const MODEL = "gemini-2.5-flash";

const MODE_SYSTEM_INSTRUCTIONS: Record<LearnMode, string> = {
  explain:
    "You are an interactive, beginner-friendly learning assistant. Explain the user input in clear Markdown using concise bullet points, intuitive analogies, and step-by-step conceptual breakdowns.",
  summary:
    "You are a concise study summarizer. Convert the user input into an efficient, high-signal bulleted summary emphasizing key vocabulary, core formulas, and primary concepts for rapid review.",
  quiz:
    "You are a quiz generator. Produce exactly 5 multiple-choice questions based on the input content.",
  revision:
    "You are a revision coach. Convert the input into brief flashcard blocks in this exact text style: 'Q: ...' on one line and 'A: ...' on the next line, repeating for each flashcard.",
  assistant:
    "You are an elite Academic Teacher and Mentor. Do not provide only direct answers. First, clarify the core concept in simple terms, then guide the student with an actionable study approach (for example active recall, spaced repetition, study scheduling, and practice sequencing). Include a short, realistic next-step study plan the student can execute today. End with one encouraging reflective question that keeps the student engaged."
};

const quizResponseSchema = {
  type: Type.ARRAY,
  minItems: 5,
  maxItems: 5,
  items: {
    type: Type.OBJECT,
    required: ["question", "options", "correctAnswerIndex"],
    properties: {
      question: {
        type: Type.STRING
      },
      options: {
        type: Type.ARRAY,
        minItems: 4,
        maxItems: 4,
        items: {
          type: Type.STRING
        }
      },
      correctAnswerIndex: {
        type: Type.INTEGER,
        minimum: 0,
        maximum: 3
      }
    }
  }
} as const;

function isLearnMode(value: string): value is LearnMode {
  return (
    value === "explain" ||
    value === "summary" ||
    value === "quiz" ||
    value === "revision" ||
    value === "assistant"
  );
}

function normalizeQuizPayload(payload: unknown): QuizQuestion[] {
  if (!Array.isArray(payload)) {
    throw new Error("Quiz response must be an array.");
  }

  if (payload.length !== 5) {
    throw new Error("Quiz response must contain exactly 5 questions.");
  }

  return payload.map((item, index) => {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as { question?: unknown }).question !== "string" ||
      !Array.isArray((item as { options?: unknown }).options) ||
      (item as { options: unknown[] }).options.length !== 4 ||
      !(item as { options: unknown[] }).options.every((option) => typeof option === "string") ||
      typeof (item as { correctAnswerIndex?: unknown }).correctAnswerIndex !== "number"
    ) {
      throw new Error(`Invalid quiz object at index ${index}.`);
    }

    const candidate = item as {
      question: string;
      options: string[];
      correctAnswerIndex: number;
    };

    if (
      !Number.isInteger(candidate.correctAnswerIndex) ||
      candidate.correctAnswerIndex < 0 ||
      candidate.correctAnswerIndex > 3
    ) {
      throw new Error(`Invalid correctAnswerIndex at index ${index}.`);
    }

    return {
      question: candidate.question,
      options: [
        candidate.options[0],
        candidate.options[1],
        candidate.options[2],
        candidate.options[3]
      ],
      correctAnswerIndex: candidate.correctAnswerIndex
    };
  });
}

function buildGeminiContents(inputData: string, attachment?: LearnAttachment) {
  if (!attachment) {
    return inputData;
  }

  const base64DataString = attachment.base64?.trim();
  const mimeTypeString = (attachment.mimeType ?? attachment.type ?? "").trim();

  if (!base64DataString || !mimeTypeString) {
    throw new Error("Invalid attachment payload.");
  }

  const filePart = {
    inlineData: {
      data: base64DataString,
      mimeType: mimeTypeString
    }
  };

  return [
    {
      role: "user",
      parts: [{ text: inputData }, filePart]
    }
  ];
}

export async function POST(request: Request) {
  try {
    const requestBody = (await request.json()) as Partial<LearnRequestBody>;

    const mode = typeof requestBody.mode === "string" ? requestBody.mode.trim() : "";
    const inputData =
      typeof requestBody.inputData === "string" ? requestBody.inputData.trim() : "";
    const attachment = requestBody.attachment;

    if (!mode || !inputData) {
      return NextResponse.json(
        {
          error: "Missing required fields: both 'mode' and 'inputData' are required."
        },
        { status: 400 }
      );
    }

    if (!isLearnMode(mode)) {
      return NextResponse.json(
        {
          error:
            "Invalid mode. Supported modes are: 'explain', 'summary', 'quiz', 'revision', and 'assistant'."
        },
        { status: 400 }
      );
    }

    if (
      attachment &&
      (typeof attachment !== "object" ||
        typeof attachment.base64 !== "string" ||
        !attachment.base64.trim() ||
        (typeof attachment.type !== "string" && typeof attachment.mimeType !== "string") ||
        !`${attachment.mimeType ?? attachment.type ?? ""}`.trim())
    ) {
      return NextResponse.json(
        {
          error: "Invalid attachment. Provide base64 and mimeType (or type) when a file is attached."
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API key is missing. Set GEMINI_API_KEY in root .env.local and restart the dev server."
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = MODE_SYSTEM_INSTRUCTIONS[mode];
    const contents = buildGeminiContents(inputData, attachment);

    if (mode === "quiz") {
      const quizResponse = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: quizResponseSchema
        }
      });

      const rawQuizText = quizResponse.text?.trim();

      if (!rawQuizText) {
        throw new Error("Empty quiz response from Gemini API.");
      }

      const parsedQuiz = normalizeQuizPayload(JSON.parse(rawQuizText));

      const responseBody: LearnSuccessResponse = {
        mode,
        result: parsedQuiz
      };
      return NextResponse.json(responseBody, { status: 200 });
    }

    const contentResponse = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction
      }
    });

    const outputText = contentResponse.text?.trim();

    if (!outputText) {
      throw new Error("Empty text response from Gemini API.");
    }

    const responseBody: LearnSuccessResponse = {
      mode,
      result: outputText
    };

    return NextResponse.json(responseBody, { status: 200 });
  } catch (error) {
    console.error("POST /api/learn failed:", error);

    const responseBody: LearnErrorResponse = {
      error: "Failed to process learning request. Please try again later."
    };

    return NextResponse.json(responseBody, { status: 500 });
  }
}
