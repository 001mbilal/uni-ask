import { config } from "./config";

export type InputType = "document" | "query";

function normalize(v: number[]): Float32Array {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum) || 1;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
  return out;
}

// Offline stand-in: hashed bag of words. Good enough to test the pipeline,
// not good enough for real search quality.
function mockEmbed(text: string): Float32Array {
  const dim = 256;
  const v = new Array<number>(dim).fill(0);
  for (const w of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
    let h = 2166136261;
    for (let i = 0; i < w.length; i++) {
      h ^= w.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    v[(h >>> 0) % dim] += 1;
  }
  return normalize(v);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function voyageBatch(
  texts: string[],
  inputType: InputType
): Promise<Float32Array[]> {
  if (!config.voyageKey) throw new Error("VOYAGE_API_KEY is not set");
  let last = "";
  for (let attempt = 0; attempt < 8; attempt++) {
    let status = 0;
    let retryAfter = 0;
    let body = "";
    try {
      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.voyageKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: texts,
          model: config.embeddingModel,
          input_type: inputType,
        }),
        signal: AbortSignal.timeout(60000),
      });
      status = res.status;
      retryAfter = Number(res.headers.get("retry-after"));
      // the timeout also covers reading the body, so read it inside the try
      body = await res.text();
    } catch (err) {
      // timeouts and dropped connections are retried like a 5xx
      last = (err as Error).message;
      await sleep(Math.min(60000, 1000 * 2 ** attempt));
      continue;
    }
    if (status === 429 || status >= 500) {
      last = `${status} ${body.slice(0, 200)}`;
      await sleep(Math.min(60000, retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt));
      continue;
    }
    if (status < 200 || status >= 300) {
      throw new Error(`Voyage error ${status}: ${body.slice(0, 300)}`);
    }
    const json = JSON.parse(body) as {
      data: { embedding: number[]; index: number }[];
    };
    return json.data
      .sort((a, b) => a.index - b.index)
      .map((d) => normalize(d.embedding));
  }
  throw new Error(`Voyage: too many retries (last: ${last})`);
}

export async function embedTexts(
  texts: string[],
  inputType: InputType
): Promise<Float32Array[]> {
  if (config.embeddingsProvider === "mock") return texts.map(mockEmbed);
  const out: Float32Array[] = [];
  const BATCH = 32;
  for (let i = 0; i < texts.length; i += BATCH) {
    out.push(...(await voyageBatch(texts.slice(i, i + BATCH), inputType)));
  }
  return out;
}
