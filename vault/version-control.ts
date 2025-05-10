import { createHash } from 'crypto';
import * as fs from "fs";
import * as path from 'path';


interface FileMetadata {
  lastModified: number;
  hash: string;
}

interface TrackingData {
  files: Record<string, FileMetadata>;
}

export class VersionControl {
  private vaultPath: string;
  private fileMapMetaData: string;
  private trackingData: TrackingData = { files: {} };

  constructor(
    vaultPath: string,
    trackingFilePath?: string, // Optional
  ) {
    this.vaultPath = vaultPath;
    this.fileMapMetaData = trackingFilePath || 'rag-brain-version-control.json';

  }

  /**
   * Scan through the tracked files and determine if the qdrant store needs
   * to be updated. If it does, return the updated files and deleted files.
   */
  public async updateVersionControl(): Promise<void> {
    await this.loadTrackingData();
    const { changedFiles, deletedFiles } = await this.detectChanges();
    console.log("Changed Files:\r\n",changedFiles, "Deleted Files:\r\n", deletedFiles);
    
    await this.handleDeletedFiles(deletedFiles);
    await this.processChangedFiles(changedFiles);
    
    await this.saveTrackingData();
  }

  /**
   * Looks for a tracking json file or creates a new one if it doesn't exist
   */
  private async loadTrackingData(): Promise<void> {
    try {
      const data = await fs.promises.readFile(this.fileMapMetaData, 'utf-8');
      this.trackingData = JSON.parse(data) as TrackingData;
    } catch (error) {
      console.log('No existing tracking data, starting fresh');
      this.trackingData = { files: {} };
    }
  }

  /**
   * Given a file path, the binary is hashed and the hex hash value is returned.
   * @param filePath the filepath of the file to be hased 
   * @returns Promise<string> representing the hash for the file
   */
  private async getFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.promises.readFile(filePath); // read raw binary data
      return createHash('sha256').update(content).digest('hex');
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Write the tracking data to a file in the vault as a JSON string.
   */
  private async saveTrackingData(): Promise<void> {
    await fs.promises.writeFile(
      this.fileMapMetaData,
      JSON.stringify(this.trackingData, null, 2)
    );
  }

  /**
   * Generator that recursively walks a directory and 
   * yields the file path of all files in the directories and sub directories.
   * 
   * @param dir the directory of the vault to be walked
   */
  private async *walkDirectory(dir: string): AsyncGenerator<string> {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const res = path.resolve(dir, entry.name);
      if (entry.isDirectory()) {
        yield* this.walkDirectory(res);  // Recurse into subdirectory
      } else {
          yield res; // Yield file path
        }
      }
    }

  /**
   * Walks the vault directory and determines if files have been modified or 
   * deleted. 
   * 
   * @returns Promise<{changedFiles: string[]; deletedFiles: string[]}
   */
  private async detectChanges(): Promise<{
    changedFiles: string[];
    deletedFiles: string[];
  }> {
    const changedFiles: string[] = [];
    const currentFiles = new Set<string>();

    // Walk through all files in vault
    for await (const filePath of this.walkDirectory(this.vaultPath)) {
      currentFiles.add(filePath);
      const stats = await fs.promises.stat(filePath);
      const trackedMeta = this.trackingData.files[filePath];

      if (!trackedMeta) {
        changedFiles.push(filePath);
      } else {
        const currentHash = await this.getFileHash(filePath);
        if (currentHash !== trackedMeta.hash || stats.mtimeMs > trackedMeta.lastModified) {
          changedFiles.push(filePath);
        }
      }
    }

    // Detect deleted files
    const deletedFiles = Object.keys(this.trackingData.files)
      .filter(path => !currentFiles.has(path));

    return { changedFiles, deletedFiles };
  }

  /**
   * Removes any file data of deleted files from the version control json.
   * 
   * @param filePaths array of file path name strings that were deleted from 
   * the vault.
   */
  private async handleDeletedFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      delete this.trackingData.files[filePath];
    }
  }

  /**
   * Adds the hash and last modified timestamp to the version control json
   * for each modified file since the last index.
   * 
   * @param filePaths array of file path name strings that were modified
   * in the vault.
   */
  private async processChangedFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      const stats = await fs.promises.stat(filePath);
      const hash = await this.getFileHash(filePath);
      // Update tracking data
      this.trackingData.files[filePath] = {
        lastModified: stats.mtimeMs,
        hash
      };
    }
  }
  
}