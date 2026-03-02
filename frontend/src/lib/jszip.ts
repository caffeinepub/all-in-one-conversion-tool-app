// Shared utility to load JSZip from CDN and create ZIP downloads

let loadPromise: Promise<new () => JSZipInstance> | null = null;

interface JSZipInstance {
  file(name: string, data: Blob | Uint8Array | ArrayBuffer | string): this;
  generateAsync(options: { type: 'blob'; compression?: string; compressionOptions?: { level: number } }): Promise<Blob>;
}

function getJSZip(): Promise<new () => JSZipInstance> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const win = window as unknown as Record<string, unknown>;
    if (win.JSZip) {
      resolve(win.JSZip as new () => JSZipInstance);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => {
      if ((window as unknown as Record<string, unknown>).JSZip) {
        resolve((window as unknown as Record<string, unknown>).JSZip as new () => JSZipInstance);
      } else {
        loadPromise = null;
        reject(new Error('JSZip failed to initialize'));
      }
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load JSZip from CDN'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export interface ZipEntry {
  filename: string;
  data: Blob | Uint8Array | ArrayBuffer;
}

/**
 * Creates a ZIP archive from the given entries and triggers a browser download.
 */
export async function downloadAsZip(entries: ZipEntry[], zipFilename: string): Promise<void> {
  const JSZip = await getJSZip();
  const zip = new JSZip();

  for (const entry of entries) {
    zip.file(entry.filename, entry.data);
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Converts a data URL to a Blob.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}
