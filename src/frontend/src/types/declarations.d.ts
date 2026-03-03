// Type declarations for CDN-loaded libraries

declare module "pdf-lib" {
  export class PDFDocument {
    static create(): Promise<PDFDocument>;
    static load(
      data: Uint8Array | ArrayBuffer | string,
      options?: { ignoreEncryption?: boolean },
    ): Promise<PDFDocument>;
    addPage(pageOrSize?: PDFPage | [number, number]): PDFPage;
    getPageCount(): number;
    getPageIndices(): number[];
    getPages(): PDFPage[];
    copyPages(srcDoc: PDFDocument, indices: number[]): Promise<PDFPage[]>;
    embedJpg(jpgData: Uint8Array | ArrayBuffer): Promise<PDFImage>;
    embedPng(pngData: Uint8Array | ArrayBuffer): Promise<PDFImage>;
    save(options?: { useObjectStreams?: boolean }): Promise<Uint8Array>;
    removePage(index: number): void;
  }

  export class PDFPage {
    getSize(): { width: number; height: number };
    drawImage(
      image: PDFImage,
      options: {
        x: number;
        y: number;
        width: number;
        height: number;
      },
    ): void;
    drawText(text: string, options?: Record<string, unknown>): void;
  }

  export class PDFImage {
    width: number;
    height: number;
  }

  export const StandardFonts: Record<string, string>;
  export function rgb(r: number, g: number, b: number): unknown;
}

declare module "pdfjs-dist" {
  export const version: string;
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(src: { data: Uint8Array } | string): {
    promise: Promise<PDFDocumentProxy>;
  };

  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  export interface PDFPageProxy {
    getViewport(options: { scale: number }): PageViewport;
    render(renderContext: {
      canvasContext: CanvasRenderingContext2D;
      viewport: PageViewport;
    }): { promise: Promise<void> };
  }

  export interface PageViewport {
    width: number;
    height: number;
  }
}

declare module "jszip" {
  export default class JSZip {
    file(
      name: string,
      data: string | Blob | Uint8Array | ArrayBuffer,
      options?: { base64?: boolean },
    ): this;
    generateAsync(options: {
      type: "blob" | "uint8array" | "arraybuffer";
      compression?: string;
      compressionOptions?: { level: number };
    }): Promise<Blob>;
    folder(name: string): JSZip;
  }
}
