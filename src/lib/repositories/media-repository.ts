import { createService } from "@/lib/supabase/service";

export interface MediaFileItem {
  name: string;
  id?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  last_accessed_at?: string | null;
  metadata?: Record<string, unknown>;
  publicUrl: string;
}

export class MediaRepository {
  private getClient() {
    const service = createService();
    if (!service) throw new Error("Database service unavailable");
    return service;
  }

  async listMediaFiles(bucket = "media"): Promise<MediaFileItem[]> {
    const client = this.getClient();
    const { data, error } = await client.storage.from(bucket).list("", {
      limit: 100,
      offset: 0,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) throw error;

    return (data ?? []).map((file) => {
      const { data: publicUrlData } = client.storage.from(bucket).getPublicUrl(file.name);
      return {
        name: file.name,
        id: file.id,
        updated_at: file.updated_at,
        created_at: file.created_at,
        metadata: file.metadata as Record<string, unknown> | undefined,
        publicUrl: publicUrlData.publicUrl,
      };
    });
  }

  async deleteFile(filename: string, bucket = "media"): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client.storage.from(bucket).remove([filename]);
    if (error) throw error;
    return true;
  }

  async uploadFile(filename: string, buffer: Buffer, contentType: string, bucket = "media"): Promise<{ url: string; path: string }> {
    const client = this.getClient();
    const { data: uploadData, error: uploadErr } = await client.storage
      .from(bucket)
      .upload(filename, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const { data: publicUrlData } = client.storage.from(bucket).getPublicUrl(uploadData.path);
    return {
      url: publicUrlData.publicUrl,
      path: uploadData.path,
    };
  }
}
