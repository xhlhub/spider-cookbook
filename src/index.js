#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { crawl } from './crawler.js';
import { resolveCategoryConfig } from './categoryConfig.js';

const argv = yargs(hideBin(process.argv))
  .scriptName('xcf-spider')
  .usage('$0 [options]')
  .option('category', {
    alias: 'c',
    type: 'string',
    default: '家常菜',
    describe: '已配置的分类/搜索名称，或下厨房数字分类 ID',
  })
  .option('source-category-name', {
    type: 'string',
    describe: '来源分类名称；传入未预置的数字 ID 时必填',
  })
  .option('api-category', {
    type: 'string',
    describe: 'API 一级分类；传入未预置的数字 ID 时必填',
  })
  .option('category-tag', {
    type: 'array',
    string: true,
    default: [],
    describe: '附加到每条菜谱的标签，可重复传入',
  })
  .option('start', {
    alias: 's',
    type: 'number',
    default: 1,
    describe: '起始页码',
  })
  .option('end', {
    alias: 'e',
    type: 'number',
    default: 1,
    describe: '结束页码（含）',
  })
  .option('detail', {
    alias: 'd',
    type: 'boolean',
    default: false,
    describe: '是否抓取详情页（注意：详情页有反爬，可能需要 cookie）',
  })
  .option('max-recipes', {
    type: 'number',
    default: 0,
    describe: '本次最多处理多少条菜谱，0 表示不限制',
  })
  .option('concurrency', {
    alias: 'n',
    type: 'number',
    default: 2,
    describe: '详情页并发数',
  })
  .option('min-delay', {
    type: 'number',
    default: 1000,
    describe: '请求最小间隔（毫秒）',
  })
  .option('max-delay', {
    type: 'number',
    default: 2200,
    describe: '请求最大间隔（毫秒）',
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    default: 'output',
    describe: '输出目录',
  })
  .option('cookie', {
    type: 'string',
    default: process.env.XCF_COOKIE || '',
    describe: '浏览器中复制的 Cookie，用于详情页绕过滑动验证',
  })
  .help()
  .alias('h', 'help').argv;

const categoryConfig = resolveCategoryConfig({
  category: argv.category,
  sourceCategoryName: argv['source-category-name'],
  apiCategory: argv['api-category'],
  categoryTags: argv['category-tag'],
});

await crawl({
  categoryConfig,
  startPage: argv.start,
  endPage: argv.end,
  detail: argv.detail,
  maxRecipes: argv['max-recipes'],
  concurrency: argv.concurrency,
  minDelay: argv['min-delay'],
  maxDelay: argv['max-delay'],
  outputDir: argv.output,
  cookie: argv.cookie,
});
