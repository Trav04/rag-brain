import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import { GeminiLoader } from "./loader";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { TaskType } from "@google/generative-ai";


export class VectorManager {
    private vaultPath: string;
    private documentLoader: GeminiLoader;
    private vectorStore: QdrantVectorStore;
    private embeddings: GoogleGenerativeAIEmbeddings;
    private chunkSize: number;
    private chunkOverlap: number;

    constructor(
      vaultPath: string,
      geminiApiKey: string,
      embeddingsModelName: "text-embedding-004",
      ocrModelName: "gemini-2.0-flash",  // default model used
      private qdrantCollectionName: string,
      chunkSize: 1000,
      chunkOverlap: 200
    ) {
      this.vaultPath = vaultPath;
      this.chunkOverlap = chunkOverlap;
      this.chunkSize = chunkSize;
      // Instantiate embeddings model
      this.embeddings = new GoogleGenerativeAIEmbeddings({
        model: embeddingsModelName,
        taskType: TaskType.RETRIEVAL_DOCUMENT
      });
      // Instantiate custom document loader
      this.documentLoader = new GeminiLoader(
        this.vaultPath, ocrModelName, geminiApiKey);
    }

    public async init() {
      // Initialise the vectorstore in qdrant server
      this.vectorStore = await QdrantVectorStore.fromExistingCollection( 
        this.embeddings, {
        url: process.env.QDRANT_URL,
        collectionName: this.qdrantCollectionName,
      });
      return this;
    }

    /**
     * Indexes every file in the vault from the class vault path. 
     */
    public async indexVault(): Promise<void> { 
      // Define a splitting object to process documents
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: this.chunkSize,
        chunkOverlap: this.chunkOverlap
      });
        // Use Gemini custom loader to process all document types
        const documents = await this.loadDocuments();
        // Split the document into the chunks specified in the class
        const splitDocs = await splitter.splitDocuments(documents);
        // Add the documents using the embeddings instance of the vector store
        await this.vectorStore.addDocuments(splitDocs);
    }

    /**
     * Using the Gemini Custom Loader, all file types are parsed into a langchain
     * document type. Gemini Custom Loader can handle, .md, images and .pdf.
     * An array of langchain document types is returned.
     * 
     * @returns Promise<Document[]>
     */
    private async loadDocuments(): Promise<Document[]> {
        const documents: Document[] = [];
        for await (const doc of this.documentLoader.loadDocuments()) {
            documents.push(doc);
        }
        return documents;
    }

    public getVectorStore(): QdrantVectorStore {
      return this.vectorStore;
    }

    public async deleteDocument(filePaths: string[]): Promise<void> {
      // Create a filter for metadata.source
      const filter = {
        should: filePaths.map(path => ({
          key: "metadata.source",
          match: { value: path }
        }))
      };

      // First get document IDs using the filter
      const results = await this.vectorStore.similaritySearch("", Infinity, filter);
      
      // Extract IDs from results
      const idsToDelete = results.map(doc => doc.metadata.id);

      // Delete using LangChain's API
      if (idsToDelete.length > 0) {
        await this.vectorStore.delete({ ids: idsToDelete });
      }
    }
}