import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import type { Schemas as QdrantSchemas } from "@qdrant/js-client-rest";
import { GeminiLoader } from "./loader";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { TaskType } from "@google/generative-ai";
import * as path from 'path';


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
      this.vectorStore.client.createPayloadIndex(this.qdrantCollectionName, {
          field_name: "id",
          field_schema: "keyword"
        })
      this.vectorStore.client.createPayloadIndex(this.qdrantCollectionName, {
          field_name: "metadata.source",
          field_schema: "keyword"
      })
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

     * @returns Promise<Document[]>
     */
    private async loadDocuments(): Promise<Document[]> {
        const documents: Document[] = [];
        for await (const doc of this.documentLoader.loadDocuments()) {
            documents.push(doc);
        }
        return documents;
    }

    /**
     * Getter for the vector store instance
     * @returns QdrantVectorStore - the vector store instance
     */
    public getVectorStore(): QdrantVectorStore {
      return this.vectorStore;
    }

    public async deleteDocuments(filePaths: string[]): Promise<void> {
      // Create a filter for metadata.source
      const fileFilter = {
      should: filePaths.map(filepath => ({
          key: "metadata.source",
          match: { 
            value: filepath
          }
        }))
      };
    
      // Use a large finite number instead of Infinity
      const results = await this.vectorStore.client.scroll(this.qdrantCollectionName, {filter: fileFilter});
      console.log("Filter result:", results);
      try {
        await this.vectorStore.client.delete(this.qdrantCollectionName, {
          filter: fileFilter,
          wait: true
        });
      } catch (error) {
        console.error("Failed to delete documents by ID:", error);
        throw new Error(`Document deletion by ID failed: ${error.message}`);
      }

    }
    
}