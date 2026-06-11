# Feature Design: Local File System Integration & IndexedDB Storage Migration

This document details the architectural design, implementation steps, and discussion points for integrating local folder access and migrating the persistence layer from `localStorage` to `IndexedDB`.

### Status
*   **Phase 1: Storage Migration to IndexedDB**: [x] Completed
*   **Phase 2: Local Folder Access API Integration**: [ ] Planned

---

## 1. Objectives & Requirements

### Primary Goals
1. **IndexedDB Storage Migration**: Transition the existing browser-persisted files from synchronous `localStorage` to asynchronous, non-blocking `IndexedDB`.
2. **Local Folder Connection**: Allow users to connect a directory from their local file system directly to the web app using the modern browser **File System Access API**.
3. **Local File Editing & Viewer**: List all `.md` files in the connected folder inside the sidebar (nested within their folder tree), select them to edit/view, and auto-save changes directly to the local disk.
4. **Persistent Folders**: Persist the local folder handles in `IndexedDB` so that the app remembers connected directories across page reloads.
5. **Interactive Permissions Check**: On page reload, show a clean "Unlock Folder" button to prompt the user for directory read/write permissions (as required by browser security sandbox policies).
6. **Graceful Degradation**: Detect browser compatibility and disable the local folder picker on browsers that do not support the File System Access API (e.g., Safari, Firefox), prompting the user with an explanation.

---

## 2. Phase 1: Local Storage to IndexedDB Migration

To support directory handles and handle larger document sizes without blocking the React main rendering thread, the application's storage engine must first migrate to `IndexedDB`.

### Key Motivations
* `localStorage` is synchronous and blocks the UI thread during heavy reads/writes.
* `localStorage` is restricted to ~5MB, which restricts markdown attachments, large assets, or high-volume files.
* Directory handles (`FileSystemDirectoryHandle`) cannot be serialized into JSON strings; they must be stored in IndexedDB since it supports structured clone serialization.

### Migration Strategy
On application startup inside `useWorkspaceManager.ts`:
1. Check if files exist in the legacy `localStorage` key `'markdown-viewer-files'`.
2. If legacy files are found:
   - Copy them into the new IndexedDB document store.
   - Delete the legacy keys (`markdown-viewer-files`, `markdown-viewer-active-file`) from `localStorage` to complete the migration.
3. If no legacy files are found, initialize from IndexedDB normally.

---

## 3. Phase 2: Local Folder Integration

### Web API Architecture
* **`window.showDirectoryPicker()`**: Used to select a folder and return a `FileSystemDirectoryHandle`.
* **Serialization**: Save the folder handle directly inside an IndexedDB object store (e.g., `connected-folders`).
* **Session Restoration & Permission Lifecycles**:
  ```typescript
  // Verify/Request permission state on reload
  async function verifyPermission(fileHandle: FileSystemHandle, readWrite: boolean) {
    const options: FileSystemHandlePermissionDescriptor = {};
    if (readWrite) {
      options.mode = 'readwrite';
    }
    // Check if permission was already granted
    if ((await fileHandle.queryPermission(options)) === 'granted') {
      return true;
    }
    // Request permission if not already granted
    if ((await fileHandle.requestPermission(options)) === 'granted') {
      return true;
    }
    return false;
  }
  ```

### File Hierarchy & Directory Traversal
1. Traverse directory handles recursively or iteratively.
2. Read files ending in `.md` or `.markdown`.
3. In-memory data model for sidebar representation (storing filename, relative path, and associated file/directory handles).
4. Watch / Refresh: Provide a manual or automatic refresh mechanism to sync any updates made to the local directory outside of the browser.

---

## 4. UI / UX Design Specifications

### Sidebar Integration (`Sidebar.tsx`)
* **Connect Button**: A "Connect Local Folder" action button with a computer/folder icon.
* **Collaboration/Folders Section**:
  * Connected folders list (e.g., "📁 My Notes").
  * Indented folder contents showing `.md` files.
  * Collapsible tree behavior.
* **Locked State UI**: If a folder is restored from IndexedDB but permissions are not yet unlocked, render:
  * `⚠️ Click to Unlock [Folder Name]`
  * Clicking it triggers the browser's permission prompt.

### Editor Workspace & Autosave
* When a local file is active, the workspace header/NavBar should display a **local disk indicator** (e.g., `💾 Local File: /notes/index.md`).
* Bypasses the browser storage save pipeline; instead, triggers a debounced save directly using a file writer stream:
  ```typescript
  const writable = await fileHandle.createWritable();
  await writable.write(newContent);
  await writable.close();
  ```

---

## 5. Technical Stack & Dependencies
* **IndexedDB Access**: Use the browser's native `indexedDB` API or a simple promise-based utility to interact with IndexedDB cleanly.
* **File System Access API Types**: Add `@types/wicg-file-system-access` to `devDependencies` in `package.json` to prevent TypeScript compiler errors when referencing window file system methods.
