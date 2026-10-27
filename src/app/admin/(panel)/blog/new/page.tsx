import type { Metadata } from "next";
import Link from "next/link";
import { PostForm } from "@/components/admin/post-form";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <Link href="/admin/blog" className="text-sm text-mute hover:text-lemon">
        ← Blog
      </Link>
      <h1 className="display text-5xl">New post</h1>
      <PostForm />
    </div>
  );
}
