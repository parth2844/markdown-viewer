export interface LocalFileEntry {
  id: string; // Unique id format: "local:<relativePath>"
  name: string;
  relativePath: string;
  handle: FileSystemFileHandle;
}

export interface LocalDirectoryNode {
  name: string;
  relativePath: string;
  handle: FileSystemDirectoryHandle;
  directories: LocalDirectoryNode[];
  files: LocalFileEntry[];
}

/**
 * Resolves a relative path to its immediate parent directory handle and filename.
 */
async function getParentDirectoryHandle(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string
): Promise<{ parentHandle: FileSystemDirectoryHandle; filename: string }> {
  const parts = relativePath.split('/');
  const filename = parts.pop()!;
  let currentHandle = rootHandle;

  for (const part of parts) {
    if (part) {
      currentHandle = await currentHandle.getDirectoryHandle(part);
    }
  }

  return { parentHandle: currentHandle, filename };
}

class LocalFolderService {
  /**
   * Checks if the File System Access API is supported by the current browser.
   */
  isSupported(): boolean {
    return 'showDirectoryPicker' in window;
  }

  /**
   * Opens the browser folder picker and returns the selected directory handle.
   */
  async requestFolderHandle(): Promise<FileSystemDirectoryHandle> {
    if (!this.isSupported()) {
      throw new Error("File System Access API is not supported in this browser.");
    }
    return await window.showDirectoryPicker({
      mode: 'readwrite'
    });
  }

  /**
   * Checks and requests permission to read/write a file system handle.
   */
  async verifyPermission(
    handle: FileSystemHandle,
    readWrite: boolean = true
  ): Promise<boolean> {
    const options = {
      mode: (readWrite ? 'readwrite' : 'read') as 'readwrite' | 'read'
    };

    try {
      if ((await handle.queryPermission(options)) === 'granted') {
        return true;
      }
      if ((await handle.requestPermission(options)) === 'granted') {
        return true;
      }
    } catch (e) {
      console.error("Failed to query/request file system permissions:", e);
    }
    return false;
  }

  /**
   * Recursively traverses a folder handle to find all .md files.
   * Excludes folders that contain no markdown files.
   */
  async traverseDirectory(
    rootHandle: FileSystemDirectoryHandle
  ): Promise<{ tree: LocalDirectoryNode; flatFiles: LocalFileEntry[] }> {
    const flatFiles: LocalFileEntry[] = [];

    const traverse = async (
      currentHandle: FileSystemDirectoryHandle,
      currentRelativePath: string
    ): Promise<LocalDirectoryNode> => {
      const node: LocalDirectoryNode = {
        name: currentHandle.name,
        relativePath: currentRelativePath,
        handle: currentHandle,
        directories: [],
        files: []
      };

      // In TypeScript, entry keys can be obtained using keys() or entries()
      // We will iterate over the values of the directory entries
      for await (const entry of currentHandle.values()) {
        const entryRelativePath = currentRelativePath 
          ? `${currentRelativePath}/${entry.name}` 
          : entry.name;

        if (entry.kind === 'file') {
          if (entry.name.endsWith('.md') || entry.name.endsWith('.markdown')) {
            const fileEntry: LocalFileEntry = {
              id: `local:${entryRelativePath}`,
              name: entry.name,
              relativePath: entryRelativePath,
              handle: entry as FileSystemFileHandle
            };
            node.files.push(fileEntry);
            flatFiles.push(fileEntry);
          }
        } else if (entry.kind === 'directory') {
          const subDir = await traverse(entry as FileSystemDirectoryHandle, entryRelativePath);
          // Only include directories if they contain markdown files (directly or nested)
          if (subDir.files.length > 0 || subDir.directories.length > 0) {
            node.directories.push(subDir);
          }
        }
      }

      // Sort alphabetically
      node.files.sort((a, b) => a.name.localeCompare(b.name));
      node.directories.sort((a, b) => a.name.localeCompare(b.name));

      return node;
    };

    const tree = await traverse(rootHandle, '');
    return { tree, flatFiles };
  }

  /**
   * Reads text content of a local file handle.
   */
  async readFile(fileHandle: FileSystemFileHandle): Promise<string> {
    const file = await fileHandle.getFile();
    return await file.text();
  }

  /**
   * Writes text content directly back to a local file handle.
   */
  async writeFile(fileHandle: FileSystemFileHandle, text: string): Promise<void> {
    const writable = await fileHandle.createWritable();
    await writable.write(text);
    await writable.close();
  }

  /**
   * Creates a new empty .md file inside a directory at the given relative path.
   */
  async createFile(
    rootHandle: FileSystemDirectoryHandle,
    relativePath: string
  ): Promise<FileSystemFileHandle> {
    const { parentHandle, filename } = await getParentDirectoryHandle(rootHandle, relativePath);
    // Ensure filename ends with .md
    const sanitizedFilename = filename.endsWith('.md') || filename.endsWith('.markdown') 
      ? filename 
      : `${filename}.md`;
    
    return await parentHandle.getFileHandle(sanitizedFilename, { create: true });
  }

  /**
   * Renames/moves a file within its parent directory.
   */
  async renameFile(
    fileHandle: FileSystemFileHandle,
    rootHandle: FileSystemDirectoryHandle,
    relativePath: string,
    newFilename: string
  ): Promise<FileSystemFileHandle> {
    const { parentHandle, filename } = await getParentDirectoryHandle(rootHandle, relativePath);
    const sanitizedNewName = newFilename.endsWith('.md') || newFilename.endsWith('.markdown')
      ? newFilename
      : `${newFilename}.md`;

    // Modern Chrome support
    const movableHandle = fileHandle as FileSystemFileHandle & {
      move?: (name: string) => Promise<void>;
    };
    if (typeof movableHandle.move === 'function') {
      await movableHandle.move(sanitizedNewName);
      return fileHandle;
    }

    // Fallback: copy and delete
    const content = await this.readFile(fileHandle);
    const newFileHandle = await parentHandle.getFileHandle(sanitizedNewName, { create: true });
    await this.writeFile(newFileHandle, content);
    await parentHandle.removeEntry(filename);
    return newFileHandle;
  }

  /**
   * Deletes a file in the directory at the given relative path.
   */
  async deleteFile(
    rootHandle: FileSystemDirectoryHandle,
    relativePath: string
  ): Promise<void> {
    const { parentHandle, filename } = await getParentDirectoryHandle(rootHandle, relativePath);
    await parentHandle.removeEntry(filename);
  }
}

export const localFolderService = new LocalFolderService();
