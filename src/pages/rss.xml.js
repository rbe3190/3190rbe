import rss from "@astrojs/rss";
import { getPosts } from "@/lib/content";
import { SITE } from "@/lib/site";

export async function GET(context) {
  const posts = await getPosts();
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.slice(0, 20).map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: new Date(post.publishedAt),
      link: post.url,
    })),
  });
}
