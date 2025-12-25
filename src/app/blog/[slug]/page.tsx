import { notFound } from "next/navigation";
import Image from "next/image";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPosts, getPostBySlug, serializeMdx } from "@/lib/mdx";
import { mdxComponents } from "@/components/mdx-components";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const mdxSource = await serializeMdx(post.content);
  if (!mdxSource) {
    notFound();
  }

  return (
    <article className="container mx-auto px-4 py-8 max-w-3xl">
      <header className="mb-8">
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight mb-4">
          {post.frontMatter.title}
        </h1>
        <div className="flex items-center gap-4 text-muted-foreground mb-6">
          <time dateTime={post.frontMatter.date}>
            {new Date(post.frontMatter.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          {post.frontMatter.author && (
            <>
              <span>•</span>
              <span>{post.frontMatter.author}</span>
            </>
          )}
        </div>
        {post.frontMatter.image && (
          <Image
            src={post.frontMatter.image}
            alt={post.frontMatter.title}
            width={1200}
            height={675}
            className="rounded-lg mb-8 w-full h-auto"
            priority
          />
        )}
      </header>
      <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:font-semibold">
        <MDXRemote source={mdxSource} components={mdxComponents} />
      </div>
    </article>
  );
}
