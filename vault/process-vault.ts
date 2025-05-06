import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import { GeminiLoader } from "./loader";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";

export class ObsidianVaultProcessor {
    private vaultPath: string;
    private loader: GeminiLoader;
    private vectorStore: QdrantVectorStore;
    private embeddings: GoogleGenerativeAIEmbeddings;
    private chunkSize: number;
    private chunkOverlap: number;


    constructor(
      vaultPath: string,
      geminiApiKey: string,
      vectorStore: QdrantVectorStore,
      embeddings: GoogleGenerativeAIEmbeddings,
      chunkSize: 1000,
      chunkOverlap: 200
    ) {
      this.embeddings = embeddings;
      this.chunkOverlap = chunkOverlap;
      this.chunkSize = chunkSize;
      this.vectorStore = vectorStore;
      this.vaultPath = vaultPath;
      this.loader = new GeminiLoader(vaultPath, geminiApiKey);
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
        for await (const doc of this.loader.loadDocuments()) {
            documents.push(doc);
        }
        return documents;
    }
}