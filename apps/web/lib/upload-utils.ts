const traverseEntry = async (entry: any): Promise<File[]> => {
  if (entry.isFile) {
    return new Promise((resolve) => entry.file(
      (f: File) => resolve([new File([f], entry.fullPath.startsWith('/') ? entry.fullPath.substring(1) : entry.fullPath, { type: f.type })]),
      () => resolve([])
    ));
  }
  if (entry.isDirectory) {
    try {
      const entries = await readAllEntries(entry.createReader());
      return (await Promise.all(entries.map(traverseEntry))).flat();
    } catch {
      return [];
    }
  }
  return [];
};

const readAllEntries = async (dirReader: any): Promise<any[]> => {
  const all: any[] = [];
  const read = (): Promise<any[]> => new Promise((resolve) => dirReader.readEntries(
    (entries: any[]) => entries.length === 0 ? resolve(all) : (all.push(...entries), read().then(resolve)),
    () => resolve(all)
  ));
  return read();
};

export const getFilesFromEvent = async (event: any): Promise<File[]> => {
  if (event.dataTransfer) {
    const items = Array.from(event.dataTransfer.items || []) as DataTransferItem[];
    if (items.length > 0) {
      return (await Promise.all(items.map(async (item) => {
        if (item.kind !== 'file') return [];
        const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null;
        return entry ? traverseEntry(entry) : (item.getAsFile() ? [item.getAsFile()!] : []);
      }))).flat();
    }
    return Array.from(event.dataTransfer.files || []) as File[];
  }
  return event.target?.files ? Array.from(event.target.files) : [];
};
