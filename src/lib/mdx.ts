import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { MDXRemoteSerializeResult } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";

const contentDirectory = path.join(process.cwd(), "content", "blog");

export interface BlogPostFrontMatter {
  title: string;
  date: string;
  author?: string;
  image?: string;
  excerpt?: string;
}

export interface BlogPost {
  slug: string;
  frontMatter: BlogPostFrontMatter;
  content: string;
}

export async function getAllPosts(): Promise<BlogPost[]> {
  if (!fs.existsSync(contentDirectory)) {
    return [];
  }

  const files = fs.readdirSync(contentDirectory);
  const posts = files
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const slug = file.replace(".mdx", "");
      const filePath = path.join(contentDirectory, file);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data, content } = matter(fileContents);

      return {
        slug,
        frontMatter: data as BlogPostFrontMatter,
        content,
      };
    })
    .sort((a, b) => {
      return (
        new Date(b.frontMatter.date).getTime() -
        new Date(a.frontMatter.date).getTime()
      );
    });

  return posts;
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const filePath = path.join(contentDirectory, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const fileContents = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(fileContents);

    return {
      slug,
      frontMatter: data as BlogPostFrontMatter,
      content,
    };
  } catch {
    return null;
  }
}

export async function serializeMdx(
  content: string
): Promise<MDXRemoteSerializeResult> {
  return await serialize(content, {
    parseFrontmatter: false,
  });
}

