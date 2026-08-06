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
}
