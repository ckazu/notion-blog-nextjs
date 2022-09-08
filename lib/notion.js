import { Client } from "@notionhq/client";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import ogs from 'open-graph-scraper';
import crypto from 'crypto';
import sharp from "sharp";

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
  let blocks = [];
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

  for (let i = 0; i < blocks.length; i++) { // Promise.all では駄目
    const block = blocks[i];
    if (block.bookmark) {
      try {
        const ogp = await getOgp(block.bookmark.url);
        block.bookmark.ogp = ogp;
      } catch (e) {
        console.warn(e)
        console.warn('ogp fetch error: ', block.bookmark.url);
      }
    }
  }

  await Promise.all(
    blocks.map(async (block) => {
      const image_url = block.image?.file?.url;
      try {
        if (image_url) {
          const matched = image_url.match(/^https:\/\/s3\..*\.amazonaws\.com\/.*\/(.*\/.*\..*)\?.*$/, 'i');
          const file_name = matched[1].replace("/", "-");
          await saveImageFile(image_url, file_name);
        }
      } catch (err) {
        console.error(err);
      }
    })
  );

  return blocks;
};

const getOgp = async (url) => {
  let userAgent;
  if (url.match(/^http[s]:\/\/amazon/) || url.match(/^https:\/\/amzn.to/)) {
    userAgent = "Googlebot/2.1 (+http://www.google.com/bot.html)";
  } else {
    userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36';
  }

  return new Promise(async (resolve, reject) => {
    const md5 = crypto.createHash('md5')
    const filePath = path.join(process.cwd(), 'public', 'ogp', md5.update(url, 'binary').digest('hex'));
    if (fs.existsSync(filePath)) {
      const buffer = await fsPromises.readFile(filePath);
      const json = JSON.parse(buffer.toString())
      resolve(json);
    } else {
      ogs({
        url: url,
        downloadLimit: 5000000,
        headers: { "user-agent": userAgent },
      }).then(async (data) => {
        const { error, result, response } = data;
        if (error) {
          return reject(error);
        } else {
          await fsPromises.writeFile(filePath, JSON.stringify(result));
          return resolve(result);
        }
      }).catch((err) => {
        return reject(err);
      })
    }
  })
}


const saveImageFile = async (imageUrl, fileName, quality = 75) => {
  const filePath = path.join(process.cwd(), 'public', 'images', fileName);

  if (!fs.existsSync(filePath)) {
    const res = await fetch(imageUrl);
    const buffer = await res.buffer();
    await fsPromises.writeFile(filePath, buffer);

    try {
      await sharp(filePath)
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toFile(`${filePath}-l.webp`)
      await sharp(filePath)
        .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: quality })
        .toFile(`${filePath}-m.webp`)
      await sharp(filePath)
        .resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: quality })
        .toFile(`${filePath}-s.webp`)
    } catch (err) {
      console.error(err)
    }
  }
}