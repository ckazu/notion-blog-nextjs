import Head from "next/head";
import Link from "next/link";
import { getDatabase } from "../lib/notion";
import { Text } from "./[id].js";
import styles from "./index.module.css";

export const databaseId = process.env.NOTION_DATABASE_ID;

export default function Home({ posts }) {
  const siteUrl = `https://${process.env.NEXT_PUBLIC_DOMAIN}`;
  const siteTitle = process.env.NEXT_PUBLIC_BLOG_TITLE;
  const description = process.env.NEXT_PUBLIC_META_OG_DESCRIPTION;

  return (
    <div>
      <Head>
        <title>{process.env.NEXT_PUBLIC_BLOG_TITLE}</title>
        <link rel="icon" href="/favicon.ico" />
        <meta name="description" content={description} />
        <meta name="theme-color" content="#fff" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={siteTitle} />
        <meta property="og:description" content={description} />
      </Head>

      <main className={styles.container}>
        <header className={styles.header}>
          <h1>{process.env.NEXT_PUBLIC_BLOG_TITLE}</h1>
        </header>

        <h2 className={styles.heading}>All Posts</h2>
        <ol className={styles.posts}>
          {posts.map((post) => {
            const date = new Date(post.properties.publish_on.date.start).toLocaleString(
              process.env.NEXT_PUBLIC_LOCALE,
              {
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
              }
            );
            return (
              <li key={post.id} className={styles.post}>
                <p className={styles.postDescription}>{date}
                  <span className={styles.postTitle}>
                    <Link href={`/${post.id}`}>
                      <a>
                        <Text text={post.properties.Name.title} />
                      </a>
                    </Link>
                  </span>
                </p>
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}

export const getStaticProps = async () => {
  const database = await getDatabase(databaseId);

  return {
    props: {
      posts: database,
    },
    revalidate: false,
  };
};
