import { getAllPosts } from "@/lib/mdx";
import Image from "next/image";
import Link from "next/link";

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight mb-2">
          Blog
        </h1>
        <p className="text-muted-foreground">
          Explore our latest articles and insights
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block p-6 border rounded-lg hover:shadow-lg transition-shadow"
          >
            {post.frontMatter.image && (
              <Image
                src={post.frontMatter.image}
                alt={post.frontMatter.title}
                width={400}
                height={250}
                className="rounded-md mb-4 w-full h-auto"
              />
            )}
            <h2 className="text-2xl font-semibold mb-2">
              {post.frontMatter.title}
            </h2>
            {post.frontMatter.excerpt && (
              <p className="text-muted-foreground mb-4 line-clamp-3">
                {post.frontMatter.excerpt}
              </p>
            )}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {new Date(post.frontMatter.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              {post.frontMatter.author && (
                <span>{post.frontMatter.author}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
      {posts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No blog posts found.</p>
        </div>
      )}
    </div>
  );
}
