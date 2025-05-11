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
    private ocrOn: boolean;
    private chunkSize: number;
    private chunkOverlap: number;
    private splitter: RecursiveCharacterTextSplitter;

    constructor(
      vaultPath: string,
      geminiApiKey: string,
      private qdrantUrl: string,
      private qdrantApiKey: string,
      embeddingsModelName: string,
      ocrOn: boolean,
      ocrModelName: string,  // default model used
      private qdrantCollectionName: string,
      chunkSize: 1000,
      chunkOverlap: 200
    ) {
      this.vaultPath = vaultPath;
      this.chunkOverlap = chunkOverlap;
      this.chunkSize = chunkSize;
      this.ocrOn = ocrOn;
      // Instantiate embeddings model
      this.embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: geminiApiKey,
        model: embeddingsModelName,
        taskType: TaskType.RETRIEVAL_DOCUMENT
      });
      // Instantiate custom document loader
      this.documentLoader = new GeminiLoader(
        this.vaultPath, this.ocrOn, ocrModelName, geminiApiKey);
    }

    public async init() {
      // Initialise the vectorstore in qdrant server
      this.vectorStore = await QdrantVectorStore.fromExistingCollection( 
        this.embeddings, {
        url: this.qdrantUrl,
        collectionName: this.qdrantCollectionName,
      });
      // Create filtrable index for id and source
      this.vectorStore.client.createPayloadIndex(this.qdrantCollectionName, {
          field_name: "metadata.id",
          field_schema: "keyword"
        })
      this.vectorStore.client.createPayloadIndex(this.qdrantCollectionName, {
          field_name: "metadata.source",  // filepath source
          field_schema: "keyword"
      })
      // Define a splitting object to process documents
      this.splitter = new RecursiveCharacterTextSplitter({
        chunkSize: this.chunkSize,
        chunkOverlap: this.chunkOverlap
      });
      return this;
    }

    /**
     * Indexes every file in the vault from the class vault path. 
     */
    public async indexVault(): Promise<void> { 
        // Use Gemini custom loader to process all document types
        const documents = await this.loadDocuments();
        // Split the document into the chunks specified in the class
        const splitDocs = await this.splitter.splitDocuments(documents);
        // Add the documents using the embeddings instance of the vector store
        // Push docs individually to avoid crashing out on single failure 
        const successfulDocs: typeof splitDocs = [];
        for (const doc of splitDocs) {
            try {
                await this.vectorStore.addDocuments([doc]); // use one at a time
                successfulDocs.push(doc);
            } catch (err) { // TODO Determine what type of docs gemini api rejects and handle
                console.error("Failed to embed or store document chunk:", doc.metadata?.source, err);
            }
        }

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

    /**
     * Deletes all segments corresponding to files that are listed in the
     * parsed string array.
     * @param filePaths array of flile paths of documents to be deleted from the 
     *                  vector db
     */
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
    
    /**
     * Adds documents to the vector store as specified by an array of file paths
     * @param filePaths an array of files to be added to the vector store
     */
    public async addDocuments(filePaths: string[]): Promise<void> {
      const documents: Document[] = [];
      for (const filePath of filePaths){
        const doc = await this.documentLoader.loadSingleDocument(filePath);
        documents.push(doc);
      }
      // Split the documents into chunks
      const splitDocs = await this.splitter.splitDocuments(documents);
      // Add the documents using the embeddings instance of the vector store
      await this.vectorStore.addDocuments(splitDocs);
    }
}