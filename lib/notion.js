import { Client } from "@notionhq/client";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

export const getDatabase = async (databaseId) => {
  const response = await notion.databases.query({
    database_id: databaseId,
    sorts: [{
      property: "publish_on",
      direction: "descending"
    }],
    filter: {
      property: "published",
      checkbox: { equals: true }
    }
  });
  return response.results;
};

export const getPage = async (pageId) => {
  const response = await notion.pages.retrieve({ page_id: pageId });
  return response;
};

export const getBlocks = async (blockId) => {
  const blocks = [];
  let cursor;
  while (true) {
    const { results, next_cursor } = await notion.blocks.children.list({
      start_cursor: cursor,
      block_id: blockId,
    });
    blocks.push(...results);
    if (!next_cursor) {
      break;
    }
    cursor = next_cursor;
  }

  await Promise.all(
    blocks.map(async (block) => {
      const image_url = block.image?.file?.url;
      try {
        if (image_url) {
          const matched = image_url.match(/^https:\/\/s3\..*\.amazonaws\.com\/.*\/(.*\/.*\..*)\?.*$/, 'i');
          const file_name = matched[1].replace("/", "-");
          const file_path = path.join(process.cwd(), 'public', 'images', file_name);
          if (!fs.existsSync(file_path)) {
            const res = await fetch(image_url);
            const buffer = await res.buffer();
            await fsPromises.writeFile(file_path, buffer);
          }
        }
      } catch (err) {
        console.error(err);
      }
    })
  );
  return blocks;
};
