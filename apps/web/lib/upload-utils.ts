const traverseEntry = async (entry: any): Promise<File[]> => {
  if (entry.isFile) {
    return new Promise((resolve) => {
      entry.file(
        (file: File) => {
          const relativePath = entry.fullPath.startsWith('/')
            ? entry.fullPath.substring(1)
            : entry.fullPath;
          resolve([new File([file], relativePath, { type: file.type })]);
        },
        () => resolve([])
      );
    });
  }

  if (entry.isDirectory) {
    try {
      const dirReader = entry.createReader();
      const entries = await readAllEntries(dirReader);
      const results = await Promise.all(entries.map((e) => traverseEntry(e)));
      return results.flat();
    } catch {
      return [];
    }
  }

  return [];
};

const readAllEntries = async (dirReader: any): Promise<any[]> => {
  const allEntries: any[] = [];
  const read = async (): Promise<any[]> => {
    return new Promise((resolve) => {
      dirReader.readEntries(
        (entries: any[]) => {
          if (entries.length === 0) {
            resolve(allEntries);
          } else {
            allEntries.push(...entries);
            read().then(resolve);
          }
        },
        () => resolve(allEntries)
      );
    });
  };
  return read();
};

export const getFilesFromEvent = async (event: any): Promise<File[]> => {
  if (event.dataTransfer) {
    const items = Array.from(event.dataTransfer.items || []) as DataTransferItem[];
    if (items.length > 0) {
      const filePromises = items.map(async (item) => {
        if (item.kind !== 'file') return [];
        if (typeof item.webkitGetAsEntry === 'function') {
          const entry = item.webkitGetAsEntry();
          if (entry) return traverseEntry(entry);
        }
        const file = item.getAsFile();
        return file ? [file] : [];
      });
      const results = await Promise.all(filePromises);
      return results.flat();
    }
    return Array.from(event.dataTransfer.files || []) as File[];
  }

  if (event.target && event.target.files) {
    return Array.from(event.target.files);
  }

  return [];
};
