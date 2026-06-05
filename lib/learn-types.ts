export type LearnMode = "explain" | "summary" | "quiz" | "revision" | "assistant";

export type QuizQuestion = {
  question: string;
  options: [string, string, string, string];
  correctAnswerIndex: number;
};

export type LearnAttachment = {
  name: string;
  type?: string;
  mimeType?: string;
  size: number;
  base64: string;
};

export type LearnRequestBody = {
  mode: LearnMode;
  inputData: string;
  attachment?: LearnAttachment;
};

export type LearnSuccessResponse =
  | {
      mode: "quiz";
      result: QuizQuestion[];
    }
  | {
      mode: Exclude<LearnMode, "quiz">;
      result: string;
    };

export type LearnErrorResponse = {
  error: string;
};
