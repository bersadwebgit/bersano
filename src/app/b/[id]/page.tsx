import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';

interface ShortLinkPageProps {
  params: Promise<{ id: string }>;
}

export default async function ShortLinkPage({ params }: ShortLinkPageProps) {
  const { id } = await params;

  if (!id) {
    return notFound();
  }

  // Find the blog post with this id
  const post = await prisma.blogPost.findUnique({
    where: { id },
    select: { slug: true }
  });

  if (!post) {
    return notFound();
  }

  // Redirect to the actual blog post page
  return redirect(`/blog/${encodeURIComponent(post.slug)}`);
}
