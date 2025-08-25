import { pipeline } from "@xenova/transformers";

let embedder: any;

export async function loadEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (!embedder) {
    throw new Error("Embedder not initialized yet. Call loadEmbedder() first.");
  }
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}
