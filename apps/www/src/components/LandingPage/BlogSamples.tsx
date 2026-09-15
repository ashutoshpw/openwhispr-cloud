import Link from "next/link";

const articles = [
  {
    id: 1,
    href: "/blog/sample-post-1",
    title: "OpenWhispr Cloud: Your Notes, Synced Everywhere",
    date: "2026-09-01",
  },
  {
    id: 2,
    href: "/blog/sample-post-2",
    title: "Local Whisper vs. Cloud Models: Why Not Both?",
    date: "2026-09-05",
  },
  {
    id: 3,
    href: "/blog/sample-post-3",
    title: "Dictate Once, Automate Everywhere with the API",
    date: "2026-09-10",
  },
];

export default function BlogSample() {
  return (
    <div className="flex flex-col justify-center items-center">
      <div className="flex flex-col items-center p-3 w-full">
        <div className="flex flex-col justify-start items-center gap-2 w-full">
          <div className="flex gap-3 justify-start items-center w-full">
            <h1 className="scroll-m-20 text-3xl md:text-4xl tracking-tight font-semibold text-center">
              From the OpenWhispr Blog
            </h1>
          </div>
          <div className="flex gap-3 justify-start items-center w-full border-b pb-4">
            <p className="text-gray-500">
              Product updates and notes on private voice-to-text
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-start">
        <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 mt-5">
          {articles?.map((article) => (
            <Link href={article.href} key={article?.id}>
              <article className="flex flex-col space-y-2 p-4 rounded-md border">
                <div className="flex lg:flex-row w-full justify-between items-center">
                  <h2 className="text-md lg:text-lg font-bold">
                    {article?.title}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(article.date).toLocaleDateString()}
                </p>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
