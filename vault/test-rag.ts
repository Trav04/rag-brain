import { config } from "dotenv";
import { RAG } from "./rag"
import { VersionControl } from "./version-control"

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

  
  const vaultPath = "C:\\Users\\tngra\\Downloads\\test"
  


  // Query Vault
  const rag = await new RAG(apiKey, "new-collection", "gemini-1.5-flash", "gemini-2.0-flash", "text-embedding-004").init();

  // Index Vault
  // await rag.indexVault("C:\\Users\\tngra\\Downloads\\test", apiKey);

  // Init version control
  const versionControl = await new VersionControl(vaultPath)
  // Update/Generate version control file
  versionControl.updateVersionControl()
  
  const answer = await rag.query("What is an FSM?");
  console.log(answer.answer);
  console.log(answer.sources)
}

main().catch(console.error);