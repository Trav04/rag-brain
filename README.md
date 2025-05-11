# RAGBrain

<div align="center"> <img src="RAGBrain.png" alt="RAGBrain Logo" width="300"/> <h3>Your personalized AI assistant for your Obsidian notes</h3> </div>

## Overview

RAGBrain is a powerful plugin for Obsidian that leverages Retrieval-Augmented Generation (RAG) to create a personalized AI assistant that works with your vault. It enables you to chat with your notes, ask questions, and get intelligent responses based on your personal knowledge base.

## Setup Guide

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

### 2. Configure RAGBrain Plugin

After installing the plugin in Obsidian:

1. Open the plugin settings
2. Configure all parameters (do NOT leave any blank)
3. The Qdrant URL when hosted locally is typically `http://localhost:6333`
4. Current Embeddings Model, OCR model, and LLM model are fixed (more options coming soon)

<div align="center"> <img src="Pasted image 20250511205355.png" alt="RAGBrain Settings" width="600"/> <p><em>RAGBrain plugin settings</em></p> </div>

## Usage

1. Upon loading the plugin, you'll see a new brain icon added to your side panel
2. Click on it to open the AI Chat interface

<div align="center"> <img src="Pasted image 20250511210053.png" alt="RAGBrain Interface" width="600"/> <p><em>RAGBrain chat interface</em></p> </div>

3. Prompt the AI chat with your questions about your notes
    - Currently, the chat history doesn't inform future prompts

<div align="center"> <img src="Pasted image 20250511211220.png" alt="RAGBrain Chat Example" width="600"/> <p><em>Example of RAGBrain in action</em></p> </div>

## Roadmap

- [ ] Ability to toggle and query only the currently opened file instead of the entire vault
- [ ] Change Gemini model support
- [ ] Use chat history as context for future prompts
- [ ] Chat embeddings and expanded LLM support
- [ ] Better UI indicators for progress of vectorization

## Contributing

Contributions are most certainly welcome! This is a passion project of mine as I look to leverage AI to make my knowledge base more efficient.


---

<div align="center"> Made with ❤️ for Obsidian users </div>