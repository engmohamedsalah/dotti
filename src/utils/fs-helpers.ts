import * as fs from "node:fs";
import * as path from "node:path";

/** Check if a file exists */
export function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/** Check if a directory exists */
export function dirExists(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/** Read a file safely, returns null on failure */
export function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

/** Read JSON file safely */
export function readJsonSafe<T = unknown>(filePath: string): T | null {
  const content = readFileSafe(filePath);
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/** Write a file, creating directories as needed */
export function writeFileWithDirs(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
}

/** List files in a directory recursively with depth limit */
export function walkDir(
  dirPath: string,
  options: {
    maxDepth?: number;
    ignorePatterns?: string[];
    extensions?: string[];
  } = {}
): string[] {
  const {
    maxDepth = 5,
    ignorePatterns = [
      "node_modules",
      ".git",
      "dist",
      "build",
      ".next",
      "__pycache__",
      ".venv",
      "venv",
      "target",
      ".cache",
      "coverage",
      ".turbo",
    ],
    extensions,
  } = options;

  const results: string[] = [];

  function walk(currentPath: string, depth: number): void {
    if (depth > maxDepth) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".") && depth > 0) continue;
      if (ignorePatterns.includes(entry.name)) continue;

      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        if (extensions) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!extensions.includes(ext)) continue;
        }
        results.push(fullPath);
      }
    }
  }

  walk(dirPath, 0);
  return results;
}

/** Get top-level directories */
export function getTopLevelDirs(dirPath: string): string[] {
  try {
    return fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules")
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/** Count files by extension in a directory */
export function countFilesByExtension(files: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const file of files) {
    const ext = path.extname(file).toLowerCase() || "(no ext)";
    counts[ext] = (counts[ext] || 0) + 1;
  }
  return counts;
}
