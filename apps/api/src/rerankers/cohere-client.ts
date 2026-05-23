import { CohereClient } from "cohere-ai";

const COHERE_RERANK_MODEL = "rerank-multilingual-v3.0";
const COHERE_RERANK_TIMEOUT_MS = 800;

export interface RerankResult {
  index: number;
  document: string;
  relevanceScore: number;
}

export class CohereRerankError extends Error {
  readonly code: "config_missing" | "cohere_error" | "timeout";

  constructor(
    message: string,
    options: {
      code: CohereRerankError["code"];
      cause?: unknown;
    }
  ) {
    super(message, { cause: options.cause });
    this.name = "CohereRerankError";
    this.code = options.code;
  }
}

function createCohereClient(): CohereClient {
  const token = process.env.COHERE_API_KEY;
  if (!token) {
    throw new CohereRerankError("COHERE_API_KEY is required for Cohere reranking", {
      code: "config_missing",
    });
  }
  return new CohereClient({ token });
}

export async function cohereRerank(query: string, documents: string[], topK: number): Promise<RerankResult[]> {
  const client = createCohereClient();
  const abortController = new AbortController();
  let timeoutId: NodeJS.Timeout | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      abortController.abort();
      reject(
        new CohereRerankError(`Cohere rerank timed out after ${COHERE_RERANK_TIMEOUT_MS}ms`, {
          code: "timeout",
        })
      );
    }, COHERE_RERANK_TIMEOUT_MS);
  });

  try {
    const response = await Promise.race([
      client.rerank(
        {
          model: COHERE_RERANK_MODEL,
          query,
          documents,
          topN: topK,
          returnDocuments: true,
        },
        {
          abortSignal: abortController.signal,
          maxRetries: 0,
          timeoutInSeconds: COHERE_RERANK_TIMEOUT_MS / 1000,
        }
      ),
      timeout,
    ]);

    return response.results.map((result) => ({
      index: result.index,
      document: result.document?.text ?? documents[result.index] ?? "",
      relevanceScore: result.relevanceScore,
    }));
  } catch (err) {
    if (err instanceof CohereRerankError) {
      throw err;
    }

    throw new CohereRerankError("Cohere rerank request failed", {
      code: "cohere_error",
      cause: err,
    });
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
