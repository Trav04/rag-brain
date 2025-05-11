import 'dotenv/config';
import { VectorManager } from "./vector-manager";
import { VersionControl } from "./version-control"
import { Document } from "langchain/document";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { pull } from "langchain/hub";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Annotation, StateGraph } from "@langchain/langgraph";

const InputStateAnnotation = Annotation.Root({
  question: Annotation<string>,
});

const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
  context: Annotation<Document[]>,
  answer: Annotation<string>,
});

export class RAG {
  private llmModelName: string;
  private geminiApiKey: string;
  private vectorManager: VectorManager;
  private versionControl: VersionControl;
  private llm: ChatGoogleGenerativeAI;
  private promptTemplate: ChatPromptTemplate;
  private graph: any;

  constructor(
    geminiApiKey: string,
    llmModelName: "gemini-1.5-flash",
    vectorManager: VectorManager,
    versionControl: VersionControl,
  ) {
    if (!geminiApiKey) {
      throw new Error("Gemini API key must be provided");
    }
    // Assign privates
    this.geminiApiKey = geminiApiKey;
    this.llmModelName = llmModelName;
    this.vectorManager = vectorManager;
    this.versionControl = versionControl;
  }

  async init() {
    try {
      // Create LLM 
      this.llm = new ChatGoogleGenerativeAI({
        model: this.llmModelName,
        temperature: 0,
        maxRetries: 2,
        apiKey: this.geminiApiKey
      });

      // Get prompt template from langchain
      this.promptTemplate = await pull<ChatPromptTemplate>("rlm/rag-prompt");

      // Build the LangGraph
      await this.buildGraph();

      return this;
    } catch (error) {
      throw new Error(`RAG system setup failed: ${error.message}`);
    }
  }

  /**
   * Builds a langgraph with two nodes: Retreive and Generate.
   * Adds edges between nodes. This approach allows for more complicated anad
   * involved RAG and LLM chains to be implemented.
   */
  private async buildGraph() {
    // Define the retrieval node
    const retrieve = async (state: typeof InputStateAnnotation.State) => {
      const vectorStore = await this.vectorManager.getVectorStore();
      const retrievedDocs = await vectorStore.similaritySearch(state.question);
      return { context: retrievedDocs };
    };

    // Define the generation node
    const generate = async (state: typeof StateAnnotation.State) => {
      if (!state.context?.length) {
        throw new Error("No context available for generation");
      }
      
      const docsContent = state.context.map((doc) => doc.pageContent).join("\n");
      const messages = await this.promptTemplate.invoke({
        question: state.question,
        context: docsContent,
      });
      
      const response = await this.llm.invoke(messages);
      return { answer: response.content };
    };

    // Create and compile the graph
    this.graph = new StateGraph(StateAnnotation)
      .addNode("retrieve", retrieve)
      .addNode("generate", generate)
      .addEdge("__start__", "retrieve")
      .addEdge("retrieve", "generate")
      .addEdge("generate", "__end__")
      .compile();
  }

  /**
   * Update the vaults version control json file and handle the updates. 
   * The updates are recieved from the VersionControl class and 
   * are handelled through the VectorManager class.
   */
  public async updateVaultVersionControl() {
    const { changedFiles, deletedFiles } = await this.versionControl.updateVersionControl();
    
    // Handle deleted files
    if (deletedFiles.length > 0) {
      this.vectorManager.deleteDocuments(deletedFiles);
    }

    // Handle changed changed files
    if (changedFiles.length > 0) {
      this.vectorManager.deleteDocuments(changedFiles);
      this.vectorManager.addDocuments(changedFiles);
    }
  }

  /**
   * Performs a semantic similarity search on the vector database with the input
   * question and returns the answer.
   * 
   * @param question the question to be similarity searched against the vector 
   *                 DB
   * @returns The answer after RAG has completed.
   */
  public async query(question: string): Promise<{ answer: string, sources: string[] }> {
    if (!this.graph) {
      throw new Error("Graph is not initialized. Please call init() before querying.");
    }
    try {
      // Execute the graph with the initial state
      const result = await this.graph.invoke({ question });
      
      // Extract sources from context
      const sources = result.context?.map((doc: Document) => doc.metadata.source) || [];
      
      return {
        answer: result.answer || "No answer could be generated",
        sources
      };
    } catch (error) {
      throw new Error(`Failed to process query: ${error.message}`);
    }
  }
}