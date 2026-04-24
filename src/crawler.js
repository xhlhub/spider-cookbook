import fs from 'node:fs/promises';
import path from 'node:path';
import pLimit from 'p-limit';

import { createClient, getHtml, randomDelay } from './http.js';
import { parseListPage } from './listParser.js';
import { parseDetailPage } from './detailParser.js';
import { enrichRecipe } from './enrich.js';

function buildCategoryUrl(category, page) {
  if (page <= 1) return `/category/${category}/`;
  return `/category/${category}/?page=${page}`;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * @param {{
 *   category: string|number,
 *   startPage?: number,
 *   endPage?: number,
 *   detail?: boolean,
 *   concurrency?: number,
 *   minDelay?: number,
 *   maxDelay?: number,
 *   outputDir?: string,
 *   cookie?: string,
 * }} opts
 */
export async function crawl(opts) {
  const {
    category,
    startPage = 1,
    endPage = 1,
    detail = false,
    concurrency = 2,
    minDelay = 1000,
    maxDelay = 2200,
    outputDir = 'output',
    cookie = '',
  } = opts;

  const client = createClient({ cookie });
  await ensureDir(outputDir);

  const allRecipes = [];

  for (let page = startPage; page <= endPage; page++) {
    const url = buildCategoryUrl(category, page);
    console.log(`[列表] 抓取第 ${page} 页 -> ${url}`);
    let html;
    try {
      html = await getHtml(client, url, { referer: 'https://www.xiachufang.com/' });
    } catch (err) {
      console.error(`[列表] 第 ${page} 页失败：${err.code || err.message}`);
      break;
    }

    const { recipes, hasNext } = parseListPage(html);
    console.log(`[列表] 第 ${page} 页解析到 ${recipes.length} 条食谱`);
    allRecipes.push(...recipes);

    if (!hasNext) {
      console.log(`[列表] 第 ${page} 页之后无更多分页，提前结束`);
      break;
    }

    if (page < endPage) await randomDelay(minDelay, maxDelay);
  }

  if (detail && allRecipes.length > 0) {
    console.log(`[详情] 开始抓取 ${allRecipes.length} 个食谱详情，并发=${concurrency}`);
    const limit = pLimit(concurrency);
    let done = 0;
    let failed = 0;

    await Promise.all(
      allRecipes.map((r) =>
        limit(async () => {
          await randomDelay(minDelay, maxDelay);
          try {
            const html = await getHtml(client, r.url, { referer: r.url });
            r._detail = parseDetailPage(html);
          } catch (err) {
            failed++;
            r._detail = null;
            r.detailError = err.code || err.message;
          } finally {
            done++;
            if (done % 5 === 0 || done === allRecipes.length) {
              console.log(`[详情] 进度 ${done}/${allRecipes.length}（失败 ${failed}）`);
            }
          }
        })
      )
    );
  }

  const enriched = allRecipes.map((r) => enrichRecipe(r, r._detail || null));

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(
    outputDir,
    `recipes-${category}-p${startPage}-${endPage}-${ts}.json`
  );
  await fs.writeFile(
    file,
    JSON.stringify(
      {
        meta: {
          category,
          startPage,
          endPage,
          detail,
          fetchedAt: new Date().toISOString(),
          count: enriched.length,
        },
        recipes: enriched,
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`[完成] 共 ${enriched.length} 条 -> ${file}`);
  return { file, recipes: enriched };
}
