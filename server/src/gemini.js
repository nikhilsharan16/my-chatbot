import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const embeddingModel = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
const chatModel = process.env.CHAT_MODEL || "gemini-2.5-flash";

// Turns a chunk of text into a vector. Used both when ingesting documents
// and when embedding the user's query at retrieval time.
export async function embedText(text) {
  const response = await ai.models.embedContent({
    model: embeddingModel,
    contents: text,
    config: {
      outputDimensionality: Number(process.env.EMBEDDING_DIMENSIONS) || 768,
    },
  });
  return response.embeddings[0].values; // array of floats
}

// Generates a reply, grounded in the retrieved context chunks.
// Generates a reply, grounded in the retrieved context chunks.
export async function generateWithContext(question, contextChunks) {
  const context = contextChunks
    .map((c, i) => `[${i + 1}] ${c.content}`)
    .join("\n\n");

  const prompt = `You are a helpful assistant. Answer the question using ONLY the context below.

The context below contains several data points, each about a specific opening variation. If the question asks about a broader category, combine the relevant individual entries: sum up game counts and compute a weighted average where percentages are involved, and show your reasoning briefly. If the context doesn't contain anything relevant to the question, say you don't know.

Context:
${context}

Question: ${question}`;

  const response = await ai.models.generateContent({
    model: chatModel,
    contents: prompt,
  });
  return response.text;
}

// Generates a reply grounded in exact facts pulled from a SQL aggregate,
// used for "most/least/best/worst" questions instead of retrieved chunks.
export async function generateFromFacts(question, facts) {
  const prompt = `You are a helpful assistant. Answer the question using ONLY the context below. If multiple context items are relevant, synthesize across them (e.g. sum games, combine stats) rather than requiring one single chunk to have the full answer. If the context doesn't contain the answer, say you don't know.
Facts:
${facts}

Question: ${question}`;

  const response = await ai.models.generateContent({
    model: chatModel,
    contents: prompt,
  });
  return response.text;
}