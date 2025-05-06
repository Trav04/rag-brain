import { config } from "dotenv";
import { GeminiLoader } from "./loader.js"; // adjust path if needed
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

// Load environment variables
config();

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: node test-gemini-loader.js <directory_path>");
    process.exit(1);
  }

  const dirPath = args[0];
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in environment");
    process.exit(1);
  }

  const loader = new GeminiLoader(dirPath, apiKey);

  console.log(`🔍 Scanning files in: ${dirPath}`);
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 100 });

  for await (const doc of loader.loadDocuments()) {
    console.log(`\nLoaded: ${doc.metadata.source}`);
    const chunks = await splitter.splitDocuments([doc]);

    for (const [i, chunk] of chunks.entries()) {
      console.log(`\n🔹 Chunk ${i + 1}:`);
      console.log(chunk.pageContent.slice(0, 300)); // preview first 300 chars
    }
  }
}

main().catch(console.error);
