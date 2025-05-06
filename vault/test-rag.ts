import { config } from "dotenv";
import { GeminiLoader } from "./loader.js"; // adjust path if needed
import { ObsidianVaultProcessor } from "./process-vault"
import { RAG } from "./rag"

config();

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const qdrantUrl = process.env.QDRANT_URL;
  const qdrantApiKey = process.env.QDRANT_API_KEY;

  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in environment");
    process.exit(1);
  }
  if (!qdrantUrl) {
    console.error("Missing QDRANT_URL in environment");
    process.exit(1);
  }
  if (!qdrantApiKey) {
    console.error("Missing QDRANT_API_KEY in environment");
    process.exit(1);
  }

  const processor = new ObsidianVaultProcessor("C:\\Users\\tngra\\Downloads\\test", apiKey, {url:  qdrantUrl, apiKey: qdrantApiKey, collectionName: "obsidian-rag"})
  
  // Index vault
  await processor.indexVault()

  // Query Vault
  const rag = new RAG(processor, apiKey)

  await rag.setup() // Create graph

  const answer = await rag.query("What is Very Good and what are the values?")
  console.log(answer.answer)
  console.log(answer.sources)
}

main().catch(console.error);