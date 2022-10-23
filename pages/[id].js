import React, { Fragment } from "react";
import Head from "next/head";
import { getDatabase, getPage, getBlocks } from "../lib/notion";
import Link from "next/link";
import { databaseId } from "./index.js";
import ScrollUpButton from 'react-scroll-up-button'
import styles from "./post.module.css";
import { TwitterTweetEmbed } from "react-twitter-embed";
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

export const Text = ({ text }) => {
  if (!text) {
    return null;
  }
  return text.map((value) => {
    const {
      annotations: { bold, code, color, italic, strikethrough, underline },
      text,
    } = value;

    return (
      <span
        className={[
          bold ? styles.bold : "",
          code ? styles.code : "",
          italic ? styles.italic : "",
          strikethrough ? styles.strikethrough : "",
          underline ? styles.underline : "",
        ].join(" ")}
        style={color !== "default" ? { color } : {}}
        key={Math.random()} // ここは何でも良い
      >
        {text.link ? <a href={text.link.url} target="_blank">{text.content}</a> : text.content}
      </span>
    );
  });
};

const renderNestedList = (block) => {
  const { type } = block;
  const value = block[type];
  if (!value) return null;

  const isNumberedList = value.children[0].type === 'numbered_list_item'

  if (isNumberedList) {
    return (
      <ol>
        {value.children.map((block) => renderBlock(block))}
      </ol>
    )
  }
  return (
    <ul>
      {value.children.map((block) => renderBlock(block))}
    </ul>
  )
}

const renderBlock = (block, siteTitle = "") => {
  const { type, id } = block;
  const value = block[type];

  switch (type) {
    case "paragraph":
      return (
        <p>
          <Text text={value.text} />
        </p>
      );
    case "heading_1":
      return (
        <h1>
          <Text text={value.text} />
        </h1>
      );
    case "heading_2":
      return (
        <h2>
          <Text text={value.text} />
        </h2>
      );
    case "heading_3":
      return (
        <h3>
          <Text text={value.text} />
        </h3>
      );
    case "bulleted_list_item":
    case "numbered_list_item":
      return (
        <li>
          <Text text={value.text} />
          {!!value.children && renderNestedList(block)}
        </li>
      );
    case "to_do":
      return (
        <div>
          <label htmlFor={id}>
            <input type="checkbox" id={id} defaultChecked={value.checked} />{" "}
            <Text text={value.text} />
          </label>
        </div>
      );
    case "toggle":
      return (
        <details>
          <summary>
            <Text text={value.text} />
          </summary>
          {value.children?.map((block) => (
            <Fragment key={block.id}>{renderBlock(block)}</Fragment>
          ))}
        </details>
      );
    case "child_page":
      return <p>{value.title}</p>;
    case "image":
      const src =
        value.type === "external" ? value.external.url : value.file.url;

      const matched = src.match(/^https:\/\/s3\..*\.amazonaws\.com\/.*\/(.*\/.*\..*)\?.*$/, 'i');
      const fileName = matched[1].replace("/", "-");
      const imagePath = `/images/${encodeURIComponent(fileName)}`
      const captionText = value.caption ? value.caption.map((cap) => cap.plain_text).join('') : "";
      const captionHtml = value.caption ? <Text text={value.caption} /> : "";

      return (
        <figure>
          <img src={`${imagePath}`}
            srcSet={`${imagePath}-l.webp 1200w, ${imagePath}-m.webp 640w, ${imagePath}-s.webp 320w`}
            sizes="100vw"
            alt={captionText || siteTitle}
            width={760}
            height={507}
          />
          {value.caption && <figcaption>{captionHtml}</figcaption>}
        </figure>
      );
    case "divider":
      return <hr key={id} />;
    case "quote":
      return <blockquote key={id}>{value.text[0].plain_text}</blockquote>;
    case "code":
      const text = value.text[0]?.plain_text;
      if (text.match(/^<RAW/)) {
        return React.createElement('div', {
          dangerouslySetInnerHTML: {
            __html: text
              .replace(/^\<RAW\>/, '')
              .replace('</RAW>[s]*', ''),
          },
          className: 'raw',
        })
      } else {
        return (
          <pre className={styles.pre}>
            <SyntaxHighlighter style={docco} key={id}>
              {value.text[0].plain_text}
            </SyntaxHighlighter>
          </pre>
        )
      }
    case "file":
      const src_file =
        value.type === "external" ? value.external.url : value.file.url;
      const splitSourceArray = src_file.split("/");
      const lastElementInArray = splitSourceArray[splitSourceArray.length - 1];
      const caption_file = value.caption ? value.caption[0]?.plain_text : "";
      return (
        <figure>
          <div className={styles.file}>
            📎 {" "}
            <Link href={src_file} passHref>
              {lastElementInArray.split("?")[0]}
            </Link>
          </div >
          {caption_file && <figcaption>{caption_file}</figcaption>}
        </figure >
      );
    case "link_preview":
    case "bookmark":
      let favicon;
      if (value.ogp) {
        if (value.ogp.favicon) {
          if (value.ogp.favicon.match(/^https?/)) {
            favicon = value.ogp.favicon;
          } else {
            if (value.ogp.ogUrl) {
              const domain = value.ogp?.ogUrl.match(/^(https?:\/\/.*?(\/|$))/)[0];
              favicon = `${domain}/${value.ogp.favicon}`;
            } else {
              const domain = value.url.match(/^(https?:\/\/.*?(\/|$))/)[0];
              favicon = `${domain}/${value.ogp.favicon}`;
            }
          }
        } else {
          if (value.ogp.ogUrl) {
            const domain = value.ogp?.ogUrl.match(/^(https?:\/\/.*?(\/|$))/)[0];
            favicon = `${domain}/favicon.ico`;
          } else {
            const domain = value.url.match(/^(https?:\/\/.*?(\/|$))/)[0];
            favicon = `${domain}/favicon.ico`;
          }
        }
      }
      if (favicon) {
        favicon = favicon.replace(/([^:])\/\//, '$1/')
      }

      return <div className={styles.bookmark}>
        <div style={{ display: 'flex' }}>
          <a href={value.url} target="_blank">
            <article>
              <section>
                <h1>{value.ogp?.ogTitle}</h1>
                <h2>{value.ogp?.ogSiteName}</h2>
                <p>{value.ogp?.ogDescription}</p>
                <footer>
                  <img src={favicon} width={16} height={16} alt={value.ogp?.ogSiteName || value.ogp?.ogTitle} />
                  <pre>{value.url}</pre>
                </footer>
              </section>
              {value.ogp?.ogImage?.url &&
                <figure>
                  <div>
                    <div>
                      <img src={value.ogp?.ogImage?.url} width={260} height={112} alt={value.ogp?.ogTitle} />
                    </div>
                  </div>
                </figure>
              }
            </article>
          </a>
        </div>
      </div>
    case "embed":
      if (value.url && value.url.match("https://twitter.com")) {
        const tweetId = value.url.match("https://twitter.com/.*/status/(.*)")[1]
        return <TwitterTweetEmbed tweetId={tweetId} />
      } else {
        return ""
      }
    case "video":
      // Youtube のみ対応
      const url = value.external?.url?.match(/.*v=(.*)$/) || value.external?.url?.match(/https:\/\/youtu.be\/(.*)$/);
      if (url) {
        const videoId = url[1];
        return <iframe id="ytplayer" type="text/html" width="640" height="360"
          src={`https://www.youtube.com/embed/${videoId}`}
          frameBorder="0"
          style={{ width: '100%' }}></iframe>
      } else {
        return <></>
      }
    default:
      // return `❌ Unsupported block (${type === "unsupported" ? "unsupported by Notion API" : type})`;
      return <></>
  }
};

export default function Post({ page, blocks }) {
  if (!page || !blocks) {
    return <div />;
  }
  const siteUrl = `https://${process.env.NEXT_PUBLIC_DOMAIN}/${page.id}`;
  const siteTitle = `${page.properties.Name.title[0].plain_text} | ${process.env.NEXT_PUBLIC_BLOG_TITLE}`;
  let description = "";
  [blocks[0], blocks[1], blocks[2]].map((block) => {
    if (block.type === 'paragraph') {
      block.paragraph.text.map((para) => {
        description += para.plain_text;
      })
    }
  })

  return (
    <div>
      <Head prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# website: http://ogp.me/ns/website#">
        <title>{siteTitle}</title>
        <link rel="icon" href="/favicon.ico" />

        <meta name="viewport" content="width=device-width" />
        <meta name="description" content={description} />
        <meta name="theme-color" content="#fff" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={siteTitle} />
        <meta property="og:description" content={description} />
      </Head>

      <header className={styles.header}>
        <h1><Link href="/">{process.env.NEXT_PUBLIC_BLOG_TITLE}</Link></h1>
      </header>

      <article className={styles.container}>
        <h1 className={styles.name}>
          <Text text={page.properties.Name.title} />
        </h1>
        <time dateTime={page.properties.publish_on?.date?.start}>{page.properties.publish_on?.date?.start}</time>
        <hr />
        <section>
          {blocks.map((block) => (
            <Fragment key={block.id}>{renderBlock(block, siteTitle)}</Fragment>
          ))}
          <hr />
          <Link href="/">
            <a className={styles.back}>← Go home</a>
          </Link>
        </section>
      </article>
      <div>
        <ScrollUpButton></ScrollUpButton>
      </div>
    </div>
  );
}

export const getStaticPaths = async () => {
  const database = await getDatabase(databaseId);
  return {
    paths: database.map((page) => ({ params: { id: page.id } })),
    fallback: false,
  };
};

export const getStaticProps = async (context) => {
  const { id } = context.params;
  const page = await getPage(id);
  const blocks = await getBlocks(id);

  // Retrieve block children for nested blocks (one level deep), for example toggle blocks
  // https://developers.notion.com/docs/working-with-page-content#reading-nested-blocks
  const childBlocks = await Promise.all(
    blocks
      .filter((block) => block.has_children)
      .map(async (block) => {
        return {
          id: block.id,
          children: await getBlocks(block.id),
        };
      })
  );
  const blocksWithChildren = blocks.map((block) => {
    // Add child blocks if the block should contain children but none exists
    if (block.has_children && !block[block.type].children) {
      block[block.type]["children"] = childBlocks.find(
        (x) => x.id === block.id
      )?.children;
    }
    return block;
  });

  return {
    props: {
      page,
      blocks: blocksWithChildren,
    },
    revalidate: false,
  };
};
