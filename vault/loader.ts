import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import { Document } from "langchain/document";
import * as fs from "fs";
import * as path from "path";

const prompt = `Act like a text scanner. Extract text as it is without analyzing it and without summarizing it. Treat all images as a whole document and analyze them accordingly. Think of it as a document with multiple pages, each image being a page. Understand page-to-page flow logically and semantically.`;

export class GeminiLoader {
  private ai: GoogleGenAI;

    constructor(
        private vaultPath: string,
        private apiKey: string,
        private model: string = "gemini-pro-vision"
    ) {
        this.ai = new GoogleGenAI({ apiKey: apiKey });
    }

    private getMimeType(extension: string): string {
      const mimeTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".pdf": "application/pdf",
      };
      return mimeTypes[extension] || "application/octet-stream";
    }
    private async processFile(filePath: string): Promise<string> {
      const ext = path.extname(filePath).toLowerCase();
  
      try {
        if ([".png", ".jpg", ".jpeg", ".pdf"].includes(ext)) {
          // Upload file
          const image = await this.ai.files.upload({ file: filePath });
          
          if (!image.uri) {
            throw new Error(`Upload failed: no URI returned for ${filePath}`);
          }

          const mimeType = image.mimeType ?? this.getMimeType(ext);

          const response = await this.ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
              createUserContent([
                prompt,
                createPartFromUri(image.uri, mimeType),
              ]),
            ],
          });

          return response.text ?? "";
        }  
        // For markdown, just read text
        if (ext === ".md") {
          return fs.readFileSync(filePath, "utf-8");
        }
  
        // unsupported file types
        return "";
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
        return "";
      }
    }
  
    /**
     * Walk the vaultPath and yield each file as a LangChain Document
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
            metadata: { source: fullPath },
          });
        }
      }
    }
}