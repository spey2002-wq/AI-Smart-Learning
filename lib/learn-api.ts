import type {
  LearnErrorResponse,
  LearnRequestBody,
  LearnSuccessResponse
} from "@/lib/learn-types";

function isLearnSuccessResponse(value: unknown): value is LearnSuccessResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as { mode?: unknown; result?: unknown };

  if (
    candidate.mode !== "explain" &&
    candidate.mode !== "summary" &&
    candidate.mode !== "quiz" &&
    candidate.mode !== "revision" &&
    candidate.mode !== "assistant"
  ) {
    return false;
  }

  if (candidate.mode === "quiz") {
    return Array.isArray(candidate.result);
  }

  return typeof candidate.result === "string";
}

export async function requestLearnContent(
  payload: LearnRequestBody
): Promise<LearnSuccessResponse> {
  const response = await fetch("/api/learn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const responseData = (await response.json()) as unknown;

  if (!response.ok) {
    const errorData = responseData as LearnErrorResponse;
    throw new Error(errorData.error ?? "Failed to generate learning content.");
  }

  if (!isLearnSuccessResponse(responseData)) {
    throw new Error("API returned an unexpected response shape.");
  }

  return responseData;
}
