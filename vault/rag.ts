import 'dotenv/config';
import { ObsidianVaultProcessor } from "../vault/process-vault";
import { Document } from "langchain/document";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { pull } from "langchain/hub";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Annotation } from "@langchain/langgraph";
import { StateGraph } from "@langchain/langgraph";
import { QdrantVectorStore } from "@langchain/qdrant";


const InputStateAnnotation = Annotation.Root({
  question: Annotation<string>,
});

const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
  context: Annotation<Document[]>,
  answer: Annotation<string>,
});

export class RAG {
  private processor: ObsidianVaultProcessor;
  private llm: ChatGoogleGenerativeAI;
  private vectorStore: QdrantVectorStore;
  private graph: any;
  private promptTemplate: ChatPromptTemplate;
  

  constructor(
    processor: ObsidianVaultProcessor,
    private apiKey: string,
    private modelName: string = "gemini-1.5-flash"
  ) {
    if (!apiKey) {
      throw new Error("Gemini API key must be provided");
    }

    this.processor = processor;
    this.llm = new ChatGoogleGenerativeAI({
      model: this.modelName,
      temperature: 0,
      maxRetries: 2,
      apiKey: this.apiKey
    });
  }

  async setup() {
    try {
      // Get the promptTemplate from LangChain Hub
      this.promptTemplate = await pull<ChatPromptTemplate>("rlm/rag-prompt");
      
      // Initialize the vector store with documents from the processor
      this.vectorStore = await this.processor.getVectorStore();
      
      // Create the LangGraph
      await this.buildGraph();
      
      return this;
    } catch (error) {
      console.error("Failed to set up RAG system:", error);
      throw new Error(`RAG system setup failed: ${error.message}`);
    }
  }

  private async buildGraph() {
    // Define the retrieval node
    const retrieve = async (state: typeof InputStateAnnotation.State) => {
      const retrievedDocs = await this.vectorStore.similaritySearch(state.question);
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
  
  public async query(question: string): Promise<{ answer: string, sources: string[] }> {
    if (!this.graph) {
      throw new Error("Graph is not initialized. Please call setup() before querying.");
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
      console.error("RAG query failed:", error);
      throw new Error(`Failed to process query: ${error.message}`);
    }
  }
}