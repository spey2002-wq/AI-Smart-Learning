"use client";

import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { requestLearnContent } from "@/lib/learn-api";
import type {
  LearnAttachment,
  LearnMode,
  LearnRequestBody,
  QuizQuestion
} from "@/lib/learn-types";

type Flashcard = {
  question: string;
  answer: string;
};

const MODE_OPTIONS: Array<{
  value: LearnMode;
  label: string;
  hint: string;
}> = [
  { value: "explain", label: "Explain", hint: "Concept breakdowns" },
  { value: "summary", label: "Summary", hint: "Exam-focused recap" },
  { value: "quiz", label: "Quiz", hint: "5 MCQ comprehension test" },
  { value: "revision", label: "Revision", hint: "Fast flashcard review" },
  { value: "assistant", label: "AI Assistant", hint: "Study advice & guidance" }
];

const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "video/mp4",
  "video/webm"
] as const;

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });

  const [, base64 = ""] = dataUrl.split(",", 2);
  return base64;
}

function isQuizQuestion(item: unknown): item is QuizQuestion {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as { question?: unknown }).question === "string" &&
    Array.isArray((item as { options?: unknown }).options) &&
    (item as { options: unknown[] }).options.length === 4 &&
    (item as { options: unknown[] }).options.every((option) => typeof option === "string") &&
    typeof (item as { correctAnswerIndex?: unknown }).correctAnswerIndex === "number"
  );
}

function parseRevisionFlashcards(content: string): Flashcard[] {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const cards: Flashcard[] = [];
  let pendingQuestion: string | null = null;

  for (const line of lines) {
    if (line.toLowerCase().startsWith("q:")) {
      pendingQuestion = line.slice(2).trim();
      continue;
    }

    if (line.toLowerCase().startsWith("a:") && pendingQuestion) {
      cards.push({
        question: pendingQuestion,
        answer: line.slice(2).trim()
      });
      pendingQuestion = null;
    }
  }

  return cards;
}

function splitBoldSegments(text: string): Array<{ text: string; bold: boolean }> {
  const segments: Array<{ text: string; bold: boolean }> = [];
  const pattern = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match = pattern.exec(text);

  while (match) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = pattern.lastIndex;
    match = pattern.exec(text);
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false });
  }

  return segments;
}

function MarkdownOutput({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: Array<{ type: "heading" | "paragraph" | "list"; items: string[] }> = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push({ type: "heading", items: [line.replace(/^###\s+/, "")] });
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "heading", items: [line.replace(/^##\s+/, "")] });
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "heading", items: [line.replace(/^#\s+/, "")] });
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      const bulletItem = bulletMatch[1];
      const previous = blocks[blocks.length - 1];
      if (previous?.type === "list") {
        previous.items.push(bulletItem);
      } else {
        blocks.push({ type: "list", items: [bulletItem] });
      }
      continue;
    }

    blocks.push({ type: "paragraph", items: [line] });
  }

  return (
    <article className="prose prose-invert max-w-none tracking-wide">
      {blocks.map((block, blockIndex) => {
        if (block.type === "heading") {
          return (
            <h3 key={`heading-${blockIndex}`} className="mb-3 mt-6 text-xl font-semibold text-white">
              {block.items[0]}
            </h3>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`list-${blockIndex}`} className="my-4 list-disc space-y-2 pl-6 text-slate-200">
              {block.items.map((item, itemIndex) => (
                <li key={`list-item-${blockIndex}-${itemIndex}`} className="leading-relaxed">
                  {splitBoldSegments(item).map((segment, segmentIndex) => (
                    <span
                      key={`segment-${blockIndex}-${itemIndex}-${segmentIndex}`}
                      className={segment.bold ? "font-semibold text-white" : "text-slate-200"}
                    >
                      {segment.text}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`paragraph-${blockIndex}`} className="mb-3 leading-relaxed text-slate-200">
            {splitBoldSegments(block.items[0]).map((segment, segmentIndex) => (
              <span
                key={`paragraph-segment-${blockIndex}-${segmentIndex}`}
                className={segment.bold ? "font-semibold text-white" : "text-slate-200"}
              >
                {segment.text}
              </span>
            ))}
          </p>
        );
      })}
    </article>
  );
}

export default function DashboardPage() {
  const [mode, setMode] = useState<LearnMode>("explain");
  const [inputData, setInputData] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textResult, setTextResult] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<QuizQuestion[] | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canGenerate = inputData.trim().length > 0 && !isLoading;
  const characterCount = inputData.length;
  const wordCount = useMemo(() => {
    const trimmed = inputData.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [inputData]);
  const answeredCount = useMemo(() => Object.keys(selectedAnswers).length, [selectedAnswers]);

  const flashcards = useMemo(
    () => (textResult && mode === "revision" ? parseRevisionFlashcards(textResult) : []),
    [mode, textResult]
  );

  const scorePercentage =
    quizScore !== null && quizResult ? Math.round((quizScore / quizResult.length) * 100) : 0;

  const processSelectedFile = (selectedFile: File) => {
    if (!ACCEPTED_FILE_TYPES.includes(selectedFile.type as (typeof ACCEPTED_FILE_TYPES)[number])) {
      setError(
        "Unsupported file format. Use .jpg, .png, .webp, .pdf, .txt, .mp4, or .webm files."
      );
      return;
    }

    setError(null);
    setFile(selectedFile);
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }
    processSelectedFile(selectedFile);
  };

  const handleFileDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const selectedFile = event.dataTransfer.files?.[0];
    if (!selectedFile) {
      return;
    }
    processSelectedFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setTextResult(null);
    setQuizResult(null);
    setSelectedAnswers({});
    setQuizScore(null);
    setFlashcardIndex(0);
    setFlipped(false);

    try {
      let attachment: LearnAttachment | undefined;

      if (file) {
        const base64 = await fileToBase64(file);
        attachment = {
          name: file.name,
          type: file.type,
          size: file.size,
          base64
        };
      }

      const payload: LearnRequestBody = {
        mode,
        inputData: inputData.trim(),
        attachment
      };

      const response = await requestLearnContent(payload);

      if (response.mode === "quiz") {
        const validQuiz = Array.isArray(response.result) && response.result.every(isQuizQuestion);
        if (!validQuiz) {
          throw new Error("Invalid quiz data returned by API.");
        }
        setQuizResult(response.result);
        return;
      }

      setTextResult(response.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitQuiz = () => {
    if (!quizResult || quizScore !== null) {
      return;
    }

    const score = quizResult.reduce((total, question, index) => {
      return total + (selectedAnswers[index] === question.correctAnswerIndex ? 1 : 0);
    }, 0);

    setQuizScore(score);
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setQuizScore(null);
  };

  const handleClear = () => {
    setInputData("");
  };

  const currentCard = flashcards[flashcardIndex];

  return (
    <div className="min-h-screen bg-slate-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            AI Smart Learning Assistant
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400 sm:text-base">
            Premium AI study workspace for concept clarity, summaries, quizzes, revision, and guided
            academic mentorship.
          </p>
        </header>

        <main className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 shadow-xl shadow-black/20 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Input Workspace</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Paste notes or questions, choose a mode, and generate tailored learning content.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClear}
                disabled={!inputData}
                className="rounded-lg border border-slate-600/70 bg-slate-700/40 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700/70 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            </div>

            <textarea
              value={inputData}
              onChange={(event) => setInputData(event.target.value)}
              placeholder="Paste your notes, concepts, formulas, or questions here..."
              className="mt-5 h-72 w-full rounded-xl border border-slate-700/80 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".jpg,.png,.webp,.pdf,.txt,.mp4,.webm"
              onChange={handleFileInputChange}
            />

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              className={`mt-4 rounded-xl border-2 border-dashed p-4 transition-all ${
                isDragOver
                  ? "border-indigo-400 bg-indigo-500/10"
                  : "border-slate-600/70 bg-slate-900/40 hover:border-indigo-400/50 hover:bg-slate-800/50"
              }`}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                    📎
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Upload study file</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Drag and drop, or click to upload images, PDFs, text files, or videos.
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Supported: .jpg, .png, .webp, .pdf, .txt, .mp4, .webm
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {file ? (
              <div className="mt-3 rounded-lg border border-slate-600/70 bg-slate-900/70 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      {formatFileSize(file.size)} • {file.type || "unknown type"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="rounded-md border border-slate-500/80 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:bg-slate-700/70"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>{characterCount.toLocaleString()} characters</span>
              <span>{wordCount.toLocaleString()} words</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-3">
              {MODE_OPTIONS.map((option) => {
                const active = mode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    className={`group rounded-xl border p-3 text-left transition-all duration-300 ${
                      active
                        ? "scale-105 border-indigo-400/80 bg-indigo-600/20 shadow-[0_0_0_1px_rgba(99,102,241,0.5),0_8px_24px_rgba(79,70,229,0.25)]"
                        : "border-slate-700/70 bg-slate-800/40 hover:border-indigo-400/50 hover:bg-slate-700/50"
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        active ? "text-white" : "text-slate-300 group-hover:text-white"
                      }`}
                    >
                      {option.label}
                    </p>
                    <p className={`mt-1 text-xs ${active ? "text-indigo-200" : "text-slate-400"}`}>
                      {option.hint}
                    </p>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:from-indigo-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Generating..." : "Generate Content"}
            </button>
          </section>

          <section className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 shadow-xl shadow-black/20 backdrop-blur-md">
            <h2 className="text-xl font-semibold text-white">Output Workspace</h2>
            <p className="mt-1 text-sm text-slate-400">
              {mode === "quiz"
                ? "Take the quiz and review correct answers instantly."
                : mode === "revision"
                  ? "Flip cards to rehearse key concepts quickly."
                  : "Review polished AI-generated study output with readable formatting."}
            </p>

            <div className="mt-5 min-h-[34rem] rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
              {isLoading ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                    <p className="text-sm text-slate-300">Crafting your learning content...</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-full animate-pulse rounded bg-slate-700/80" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-slate-700/80" />
                    <div className="h-4 w-3/5 animate-pulse rounded bg-slate-700/80" />
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                  {error}
                </div>
              ) : mode === "quiz" && quizResult ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-slate-300">
                      Answered: {answeredCount}/{quizResult.length}
                    </p>
                    {quizScore !== null ? (
                      <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-200">
                        Score: {quizScore}/{quizResult.length} ({scorePercentage}%)
                      </div>
                    ) : null}
                  </div>

                  {quizResult.map((question, questionIndex) => (
                    <article
                      key={`${question.question}-${questionIndex}`}
                      className="rounded-xl border border-slate-700/70 bg-slate-800/40 p-4"
                    >
                      <p className="mb-3 text-sm font-semibold text-white">
                        {questionIndex + 1}. {question.question}
                      </p>
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => {
                          const isSelected = selectedAnswers[questionIndex] === optionIndex;
                          const isCorrect = optionIndex === question.correctAnswerIndex;
                          const isSubmitted = quizScore !== null;

                          let optionClasses =
                            "w-full rounded-lg border px-3 py-2 text-left text-sm transition-all duration-200";

                          if (!isSubmitted) {
                            optionClasses += isSelected
                              ? " border-indigo-400/80 bg-indigo-600/20 text-indigo-100"
                              : " border-slate-700/70 bg-slate-900/60 text-slate-200 hover:border-indigo-400/60 hover:bg-slate-800/80";
                          } else if (isCorrect) {
                            optionClasses +=
                              " border-emerald-400/80 bg-emerald-500/15 text-emerald-100";
                          } else if (isSelected) {
                            optionClasses += " border-red-400/80 bg-red-500/15 text-red-100";
                          } else {
                            optionClasses += " border-slate-700/70 bg-slate-900/50 text-slate-400";
                          }

                          return (
                            <button
                              key={`${questionIndex}-${optionIndex}`}
                              type="button"
                              onClick={() => {
                                if (isSubmitted) {
                                  return;
                                }
                                setSelectedAnswers((prev) => ({
                                  ...prev,
                                  [questionIndex]: optionIndex
                                }));
                              }}
                              className={optionClasses}
                            >
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                                    isSubmitted && isCorrect
                                      ? "border-emerald-300 bg-emerald-400/30 text-emerald-100"
                                      : "border-slate-500 text-slate-300"
                                  }`}
                                >
                                  {isSubmitted && isCorrect ? "✓" : ""}
                                </span>
                                {option}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </article>
                  ))}

                  {quizScore === null ? (
                    <button
                      type="button"
                      onClick={handleSubmitQuiz}
                      disabled={answeredCount !== quizResult.length}
                      className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:from-emerald-600 hover:to-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Submit Quiz
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResetQuiz}
                      className="w-full rounded-xl border border-slate-600 bg-slate-800/50 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700/60"
                    >
                      Reset Quiz
                    </button>
                  )}
                </div>
              ) : mode === "revision" && textResult ? (
                flashcards.length > 0 && currentCard ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <p>
                        Card {flashcardIndex + 1}/{flashcards.length}
                      </p>
                      <button
                        type="button"
                        onClick={() => setFlipped((prev) => !prev)}
                        className="rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700/70"
                      >
                        {flipped ? "Show Question" : "Flip Card"}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFlipped((prev) => !prev)}
                      className="[transform-style:preserve-3d] relative h-64 w-full rounded-2xl border border-indigo-400/40 bg-gradient-to-br from-indigo-700/30 to-purple-700/20 p-6 text-left transition-transform duration-500 hover:scale-[1.01]"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">
                        {flipped ? "Answer" : "Question"}
                      </p>
                      <p className="mt-4 text-lg font-semibold leading-relaxed text-white">
                        {flipped ? currentCard.answer : currentCard.question}
                      </p>
                    </button>

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setFlashcardIndex((prev) => Math.max(prev - 1, 0));
                          setFlipped(false);
                        }}
                        disabled={flashcardIndex === 0}
                        className="rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700/70 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFlashcardIndex((prev) => Math.min(prev + 1, flashcards.length - 1));
                          setFlipped(false);
                        }}
                        disabled={flashcardIndex >= flashcards.length - 1}
                        className="rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700/70 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : (
                  <MarkdownOutput content={textResult} />
                )
              ) : textResult ? (
                <MarkdownOutput content={textResult} />
              ) : (
                <div className="flex min-h-[30rem] items-center justify-center rounded-xl border border-dashed border-slate-700/70 bg-slate-800/20 p-4 text-center">
                  <p className="max-w-md text-sm leading-relaxed text-slate-400">
                    Your generated output appears here. Select a mode, paste your material, and click
                    <span className="mx-1 font-semibold text-white">Generate Content</span>
                    to begin.
                  </p>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
