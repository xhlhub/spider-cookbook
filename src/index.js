#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { crawl } from './crawler.js';

const argv = yargs(hideBin(process.argv))
  .scriptName('xcf-spider')
  .usage('$0 [options]')
  .option('category', {
    alias: 'c',
    type: 'string',
    default: '40076',
    describe: '下厨房分类 ID（默认 40076 家常菜）',
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

await crawl({
  category: argv.category,
  startPage: argv.start,
  endPage: argv.end,
  detail: argv.detail,
  concurrency: argv.concurrency,
  minDelay: argv['min-delay'],
  maxDelay: argv['max-delay'],
  outputDir: argv.output,
  cookie: argv.cookie,
});
