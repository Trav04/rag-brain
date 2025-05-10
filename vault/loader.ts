import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import { v4 as uuidv4 } from "uuid";
import { Document } from "langchain/document";
import * as fs from "fs";
import * as path from "path";

// OCR prompt
const prompt = `Act like a text scanner. Extract text as it is without analyzing it and without summarizing it. Treat all images as a whole document and analyze them accordingly. Think of it as a document with multiple pages, each image being a page. Understand page-to-page flow logically and semantically.`;

export class GeminiLoader {
  private ai: GoogleGenAI;

    constructor(
        private vaultPath: string,
        private model: string = "gemini-2.0-flash",
        apiKey: string
    ) {
        this.ai = new GoogleGenAI({ apiKey: apiKey });
    }

    /**
     * Returns the mimetype of a given extension in .ext format
     * @param extension the extension of the file 
     * @returns the mimetype of the extension
     */
    private getMimeType(extension: string): string {
      const mimeTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".pdf": "application/pdf",
      };
      return mimeTypes[extension] || "application/octet-stream";
    }
    /**
     * Parses pdf, image and .md filetypes. For PDFs and Images, Gemini
     * is prompted to OCR the text from the pdf or image.
     * @param filePath the path to the file
     * @returns Promise<string> the page content from the file.
     */
    private async processFile(filePath: string): Promise<string> {
      const ext = path.extname(filePath).toLowerCase();
  
      try {
        // IMAGE & PDF FILES
        if ([".png", ".jpg", ".jpeg", ".pdf"].includes(ext)) {
          // Upload file
          const image = await this.ai.files.upload({ file: filePath });
          
          if (!image.uri) {
            throw new Error(`Upload failed: no URI returned for ${filePath}`);
          }

          const mimeType = image.mimeType ?? this.getMimeType(ext);  // Get ext

          const response = await this.ai.models.generateContent({
            model: this.model,
            contents: [
              createUserContent([
                prompt,
                createPartFromUri(image.uri, mimeType),
              ]),
            ],
          });

          return response.text ?? "";
        }  
        // MARKDOWN FILES
        if (ext === ".md") {
          return fs.readFileSync(filePath, "utf-8");
        }
  
        // UNSUPPORTED FILES
        return "";
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
        return "";
      }
    }
  
    /**
     * Walk the vaultPath and yield each file as a LangChain Document
     * @returns AsyncGenerator<Document> - a iterable generator for all 
     *          files in the directory loaded when this class was instantiated.
     */
    public async *loadDocuments(dir = this.vaultPath): AsyncGenerator<Document> {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
    
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          yield* this.loadDocuments(fullPath); // Recurse into subdirectory
        } else if (entry.isFile()) {
          const content = await this.processFile(fullPath);
          if (!content) continue;

          yield new Document({
            pageContent: content,
            metadata: { source: fullPath, id: uuidv4() },
          });
        }
      }
    }

    /**
     * Loads a single file given from a file path.
     * @param filePath the path to the file
     * @returns Promise<Document> a Langchain Document object with the page
     *          content and associated metadata
     */
    public async loadSingleDocument(filePath: string): Promise<Document> {
      const content = await this.processFile(filePath);
      return new Document({
        pageContent: content,
        metadata: {source: filePath, id: uuidv4()}
      })
    }
}