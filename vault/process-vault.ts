import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import { GeminiLoader } from "./loader";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { QdrantClient } from "@qdrant/js-client-rest";

export class ObsidianVaultProcessor {
    private loader: GeminiLoader;
    private vectorStore: QdrantVectorStore;
    private splitter: RecursiveCharacterTextSplitter;
    private embeddings: GoogleGenerativeAIEmbeddings;
    private qdrantClient: QdrantClient;

    constructor(
      private vaultPath: string,
      private geminiApiKey: string,
      private qdrantConfig: {
          url: string;
          apiKey?: string;
          collectionName: string;
      },
      private chunkSize: number = 1000
    ) {
      this.loader = new GeminiLoader(this.vaultPath, this.geminiApiKey);
      this.splitter = new RecursiveCharacterTextSplitter({
          chunkSize: this.chunkSize,
          chunkOverlap: 200
      });
      this.qdrantClient = new QdrantClient({
          url: qdrantConfig.url,
          apiKey: qdrantConfig.apiKey
      });
      this.embeddings = new GoogleGenerativeAIEmbeddings({
        model: "text-embedding-004", // 768 dimensions
        taskType: TaskType.RETRIEVAL_DOCUMENT,
      });
    }

    public async initializeVectorStore(): Promise<void> { // Process documents and store all intial docs into qdrant
        const documents = await this.loadDocuments();
        const splitDocs = await this.splitter.splitDocuments(documents);
        
        // Initialize Qdrant collection if it doesn't exist
        try {
          await this.qdrantClient.getCollection(this.qdrantConfig.collectionName);
        } catch (e) {
          await this.qdrantClient.createCollection(this.qdrantConfig.collectionName, {
              vectors: {
                  size: 768, // Gemini embedding size
                  distance: "Cosine"
              }
          });
        }
        // Create vector store
        this.vectorStore = await QdrantVectorStore.fromDocuments(
          splitDocs,
          this.embeddings,
          {
              client: this.qdrantClient,
              collectionName: this.qdrantConfig.collectionName
          }
      );
    }

    private async loadDocuments(): Promise<Document[]> {
        const documents: Document[] = [];
        for await (const doc of this.loader.loadDocuments()) {
            documents.push(doc);
        }
        return documents;
    }
    // TODO Add ability to add documents rather than parsing the whole library
    // public async search(query: string, k:5): Promise<Document[]> {
    //   if (!this.vectorStore) {
    //       throw new Error("Vector store not initialized. Call initializeVectorStore() first.");
    //   }
    //   return this.vectorStore.similaritySearch(query, k);
    // }

    public async clearCollection(): Promise<void> {
        await this.qdrantClient.deleteCollection(this.qdrantConfig.collectionName);
    }
}