import fs from 'node:fs/promises';
import path from 'node:path';
import pLimit from 'p-limit';

import { createClient, getHtml, randomDelay } from './http.js';
import { parseListPage } from './listParser.js';
import { parseDetailPage } from './detailParser.js';
import { enrichRecipe } from './enrich.js';
import { cleanAndValidateRecipes } from './validate.js';

function buildListUrl(categoryConfig, page) {
  if (categoryConfig.sourceType === 'search') {
    const params = new URLSearchParams({
      keyword: categoryConfig.sourceKeyword,
      cat: '1001',
    });
    if (page > 1) params.set('page', String(page));
    return `/search/?${params.toString()}`;
  }
  if (page <= 1) return `/category/${categoryConfig.sourceCategoryId}/`;
  return `/category/${categoryConfig.sourceCategoryId}/?page=${page}`;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeJson(file, value) {
  await fs.writeFile(file, JSON.stringify(value, null, 2), 'utf8');
}

/**
 * @param {{
 *   categoryConfig: {
 *     sourceType: 'category'|'search',
 *     sourceCategoryId?: string,
 *     sourceKeyword?: string,
 *     sourceCategoryName: string,
 *     apiCategory: string,
 *     tags: string[],
 *   },
 *   startPage?: number,
 *   endPage?: number,
 *   detail?: boolean,
 *   maxRecipes?: number,
 *   concurrency?: number,
 *   minDelay?: number,
 *   maxDelay?: number,
 *   outputDir?: string,
 *   cookie?: string,
 * }} opts
 */
export async function crawl(opts) {
  const {
    categoryConfig,
    startPage = 1,
    endPage = 1,
    detail = false,
    maxRecipes = 0,
    concurrency = 2,
    minDelay = 1000,
    maxDelay = 2200,
    outputDir = 'output',
    cookie = '',
  } = opts;

  if (
    !categoryConfig ||
    (categoryConfig.sourceType === 'category' && !categoryConfig.sourceCategoryId) ||
    (categoryConfig.sourceType === 'search' && !categoryConfig.sourceKeyword)
  ) {
    throw new Error('缺少有效的分类配置');
  }

  const sourceKey =
    categoryConfig.sourceType === 'search'
      ? `search-${categoryConfig.sourceKeyword}`
      : categoryConfig.sourceCategoryId;

  const client = createClient({ cookie });
  const rawDir = path.join(outputDir, 'raw');
  const cleanDir = path.join(outputDir, 'clean');
  const rejectedDir = path.join(outputDir, 'rejected');
  const reportsDir = path.join(outputDir, 'reports');
  await Promise.all([rawDir, cleanDir, rejectedDir, reportsDir].map(ensureDir));

  const allRecipes = [];

  for (let page = startPage; page <= endPage; page++) {
    const url = buildListUrl(categoryConfig, page);
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

  if (maxRecipes > 0 && allRecipes.length > maxRecipes) {
    allRecipes.splice(maxRecipes);
    console.log(`[限制] 本次只处理前 ${maxRecipes} 条菜谱`);
  }

  if (detail && allRecipes.length > 0) {
    console.log(`[详情] 开始抓取 ${allRecipes.length} 个食谱详情，并发=${concurrency}`);
    const limit = pLimit(concurrency);
    let done = 0;
    let failed = 0;
    let stopReason = null;

    await Promise.all(
      allRecipes.map((r) =>
        limit(async () => {
          try {
            if (stopReason) {
              r._detail = null;
              r.detailError = `SKIPPED_AFTER_${stopReason}`;
              return;
            }
            await randomDelay(minDelay, maxDelay);
            const html = await getHtml(client, r.url, {
              referer: r.url,
              retries: 2,
            });
            r._detail = parseDetailPage(html);
          } catch (err) {
            failed++;
            r._detail = null;
            r.detailError = err.code || err.message;
            if (err.code === 'RATE_LIMITED' || err.code === 'CAPTCHA_REQUIRED') {
              stopReason = err.code;
              console.warn(
                `[熔断] 详情页触发${err.code === 'RATE_LIMITED' ? '限流' : '验证码'}，停止本批剩余详情请求`
              );
            }
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

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const safeSourceKey = sourceKey.replace(/[^\p{L}\p{N}-]+/gu, '-');
  const basename = `recipes-${safeSourceKey}-p${startPage}-${endPage}-${ts}`;
  const fetchedAt = new Date().toISOString();
  const commonMeta = {
    sourceType: categoryConfig.sourceType,
    sourceCategoryId: categoryConfig.sourceCategoryId || null,
    sourceKeyword: categoryConfig.sourceKeyword || null,
    sourceCategoryName: categoryConfig.sourceCategoryName,
    apiCategory: categoryConfig.apiCategory,
    categoryTags: categoryConfig.tags,
    startPage,
    endPage,
    detail,
    maxRecipes,
    fetchedAt,
  };

  const rawFile = path.join(rawDir, `${basename}.json`);
  await writeJson(rawFile, {
    meta: { ...commonMeta, count: allRecipes.length },
    recipes: allRecipes,
  });

  const enriched = allRecipes.map((recipe) =>
    enrichRecipe(recipe, recipe._detail || null, {
      apiCategory: categoryConfig.apiCategory,
      categoryTags: categoryConfig.tags,
    })
  );
  const result = cleanAndValidateRecipes(enriched);

  const cleanFile = path.join(cleanDir, `${basename}.json`);
  const rejectedFile = path.join(rejectedDir, `${basename}.json`);
  const reportFile = path.join(reportsDir, `${basename}.json`);

  await Promise.all([
    writeJson(cleanFile, {
      meta: { ...commonMeta, count: result.clean.length },
      recipes: result.clean,
    }),
    writeJson(rejectedFile, {
      meta: { ...commonMeta, count: result.rejected.length },
      recipes: result.rejected,
    }),
    writeJson(reportFile, {
      meta: commonMeta,
      ...result.report,
      warningItems: result.warnings,
      rejectedItems: result.rejected.map((item) => ({
        source: item.source,
        name: item.name,
        errors: item.errors,
        warnings: item.warnings,
      })),
    }),
  ]);

  console.log(
    `[完成] 抓取 ${enriched.length} 条，有效 ${result.clean.length} 条，拒绝 ${result.rejected.length} 条`
  );
  console.log(`[原始] ${rawFile}`);
  console.log(`[清洗] ${cleanFile}`);
  console.log(`[报告] ${reportFile}`);
  return {
    file: cleanFile,
    rawFile,
    cleanFile,
    rejectedFile,
    reportFile,
    recipes: result.clean,
    report: result.report,
  };
}
