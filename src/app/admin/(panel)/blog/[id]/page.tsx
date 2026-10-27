import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePostAction } from "@/app/admin/content-actions";
import { PostForm } from "@/components/admin/post-form";
import { ConfirmSubmit } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Edit post" };

export default async function EditPostPage({ params }: PageProps<"/admin/blog/[id]">) {
  await requireAdmin();
  const post = await getStore().getPost((await params).id);
  if (!post) notFound();
  return (
    <div className="space-y-6">
      <Link href="/admin/blog" className="text-sm text-mute hover:text-lemon">
        ← Blog
      </Link>
      <h1 className="display text-5xl">{post.title}</h1>
      <PostForm post={post} />
      <form action={deletePostAction}>
        <input type="hidden" name="id" value={post.id} />
        <ConfirmSubmit message="Delete this post for good?" className="text-sm text-mute hover:text-[#ff7a59]">
          Delete post
        </ConfirmSubmit>
      </form>
    </div>
  );
}
