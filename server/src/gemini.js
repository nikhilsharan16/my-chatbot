import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const embeddingModel = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
const chatModel = process.env.CHAT_MODEL || "gemini-2.5-flash";

export async function embedText(text) {
  const response = await ai.models.embedContent({
    model: embeddingModel,
    contents: text,
    config: {
      outputDimensionality: Number(process.env.EMBEDDING_DIMENSIONS) || 768,
    },
  });
  return response.embeddings[0].values;
}

export async function generateWithContext(question, contextChunks) {
  const context = contextChunks
    .map((c, i) => `[${i + 1}] ${c.content}`)
    .join("\n\n");

  const prompt = `You are a helpful assistant. Answer the question using ONLY the context below. If the context doesn't contain the answer, say you don't know.

Context:
${context}

Question: ${question}`;

const response = await ai.models.generateContent({
    model: chatModel,
    contents: prompt,
  });
  return response.text;
}