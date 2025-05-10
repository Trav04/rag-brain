import { config } from "dotenv";
import { RAG } from "./rag"
import { VersionControl } from "./version-control"
import { VectorManager } from "./vector-manager"

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

  // Vault path
  const vaultPath = "C:\\Users\\tngra\\Downloads\\test"

  // Vector manager
  const vectorManager = await new VectorManager(vaultPath, apiKey, "text-embedding-004", "gemini-2.0-flash", "new-collection", 1000, 200).init();
  
  // Verison control
  const versionControl = await new VersionControl(vaultPath)
  
  // RAG Master - contains VectorManager and VersionControl
  const rag = await new RAG(apiKey, "gemini-1.5-flash", vectorManager, versionControl).init();

  // Initial index Vault
  // await vectorManager.indexVault();


  // // Update/Generate version control file
  // const {changedFiles, deletedFiles } = await versionControl.updateVersionControl()

  // rag.deleteDocument(deletedFiles);

  const answer = await rag.query("What is an FSM?");
  console.log(answer.answer);
  console.log(answer.sources)
}

main().catch(console.error);