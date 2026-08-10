import { MediaRepository } from "@/lib/repositories/media-repository";

export class MediaService {
  private repo = new MediaRepository();

  async getMediaFiles() {
    return this.repo.listMediaFiles();
  }

  async deleteMediaFile(filename: string) {
    if (!filename) throw new Error("Filename is required for deletion");
    return this.repo.deleteFile(filename);
  }

  async uploadMediaFile(blob: File) {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = new Set([
      "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "image/avif",
    ]);

    if (blob.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
    }

    if (!ALLOWED_TYPES.has(blob.type)) {
      throw new Error(`Unsupported file type: ${blob.type}. Allowed: ${Array.from(ALLOWED_TYPES).join(", ")}`);
    }

    const ext = blob.name.split(".").pop() || "png";
    const filename = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const buffer = Buffer.from(await blob.arrayBuffer());

    const result = await this.repo.uploadFile(filename, buffer, blob.type);

    return {
      url: result.url,
      path: result.path,
      name: blob.name,
      size: blob.size,
      type: blob.type,
    };
  }
}
