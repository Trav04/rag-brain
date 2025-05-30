# RAGBrain

<div align="center">
  <img src="imgs/RAGBrain.png" alt="RAGBrain Logo" width="300"/>
  <h3>Your personalized AI assistant for your Obsidian notes</h3>
</div>

## Overview

RAGBrain is a powerful plugin for Obsidian that leverages Retrieval-Augmented Generation (RAG) to create a personalized AI assistant that works with your vault. It enables you to chat with your notes, ask questions, and get intelligent responses based on your personal knowledge base.

<div align="center">
  <img src="imgs/Obsidian_0atx4X8msl.gif" alt="RAGBrain Demo" width="700"/>
  <p><em>See RAGBrain in action</em></p>
</div>

## 🔨 Setup Guide

### 1. Set up Qdrant Server

First, you need to set up a Qdrant vector database server. Follow the [Qdrant quickstart guide](https://qdrant.tech/documentation/quickstart/) or use these commands:

```bash
# Pull the Qdrant image
docker pull qdrant/qdrant

# Run the Qdrant container
docker run -p 6333:6333 -p 6334:6334 \
    -v "$(pwd)/qdrant_storage:/qdrant/storage:z" \
    qdrant/qdrant
```
Ensure the server is running before moving onto the next step.
### 2. Manually install RAGBrain 
To manually install the RAGBrain plugin:

1. Head to the **[Releases](https://github.com/Trav04/rag-brain/releases/tag/beta)** section of this repository
2. Download the following three files from the latest release:
   - `main.js`
   - `manifest.json`
   - `styles.css`
3. Create a new folder named `rag-brain` inside your `.obsidian/plugins` directory (create the plugins folder if it doesn't exist).
4. Paste the three downloaded files into the `rag-brain` folder.
5. Reload Obsidian and enable the **RAGBrain** plugin from the settings panel.


### 3. Configure RAGBrain Plugin

After installing the plugin in Obsidian:

1. Open the plugin settings
2. Configure all parameters (do NOT leave any blank)
3. The Qdrant URL when hosted locally is typically `http://localhost:6333`
4. Current Embeddings Model, OCR model, and LLM model are fixed (more options coming soon)

<div align="center">
  <img src="imgs/Pasted image 20250511205355.png" alt="RAGBrain Settings" width="600"/>
  <p><em>RAGBrain plugin settings</em></p>
</div>


## Usage

1. Upon loading the plugin, you'll see a new brain icon added to your side panel
2. Click on it to open the AI Chat interface

<div align="center">
  <img src="imgs/Pasted image 20250511210053.png" alt="RAGBrain Interface" width="600"/>
  <p><em>RAGBrain chat interface</em></p>
</div>

3. Prompt the AI chat with your questions about your notes
   - Currently, the chat history doesn't inform future prompts

<div align="center">
  <img src="imgs/Pasted image 20250511211220.png" alt="RAGBrain Chat Example" width="600"/>
  <p><em>Example of RAGBrain in action</em></p>
</div>

## Why Gemini?

RAGBrain currently uses Google's Gemini models because:

- **Superior OCR Capabilities**: Gemini scores exceptionally high on OCR image processing tasks, making it ideal for extracting text from images in your notes
- **High-Quality Embeddings**: Gemini embeddings provide excellent semantic representation of your content, leading to more accurate retrieval
- **Context Understanding**: Gemini excels at understanding complex relationships between different pieces of information in your vault

> **⚠️ CAUTION**: If OCR is enabled, the vectorization process may take quite a while depending on the number of images in your vault. Consider running the initial vectorization when you don't need immediate access to Obsidian.

## 🔄 Custom Version Control

RAGBrain includes a lightweight custom version control system that tracks changes to your vault without relying on Git. This ensures the embedding pipeline and Qdrant index stay in sync efficiently.

### How it works

- **File Hashing**: Each file in your vault is hashed using SHA-256 to detect content changes.
- **Timestamp Checking**: Last modified timestamps are compared to detect updates.
- **Deletion Detection**: Files that no longer exist in the vault are automatically removed from tracking.
- **Efficient Updates**: Only changed or deleted files are reprocessed, keeping performance high.

The plugin maintains a file called `rag-brain-version-control.json` in your `.obsidian` folder, which stores hashes and timestamps for each tracked file. This allows RAGBrain to determine exactly which files need re-indexing.

## Roadmap

- [ ] Ability to toggle and query only the currently opened file instead of the entire vault
- [ ] Change Gemini model support
- [ ] Use chat history as context for future prompts
- [ ] Chat embeddings and expanded LLM support
- [ ] Better UI indicators for progress of vectorization

## Contributing

Contributions are most certainly welcome! This is a passion project of mine as I look to leverage AI to make my knowledge base more efficient.

---

<div align="center">
  Made with ❤️ for Obsidian users
</div>
