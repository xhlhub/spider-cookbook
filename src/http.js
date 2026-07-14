import axios from 'axios';

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

export const BASE_URL = 'https://www.xiachufang.com';

export function createClient({ timeout = 15000, cookie = '' } = {}) {
  const headers = { ...DEFAULT_HEADERS };
  if (cookie) headers.Cookie = cookie;

  return axios.create({
    baseURL: BASE_URL,
    timeout,
    headers,
    decompress: true,
    maxRedirects: 5,
    validateStatus: (s) => s >= 200 && s < 400,
  });
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 在 [min, max] 毫秒之间随机等待 */
export async function randomDelay(min = 800, max = 1800) {
  const ms = Math.floor(min + Math.random() * (max - min));
  await sleep(ms);
}

/** 检查是否被反爬重定向到了滑动验证页 */
export function isCaptchaPage(html) {
  return (
    typeof html === 'string' &&
    (html.includes('滑动验证') || html.includes('aliyundun-validate'))
  );
}

/** 识别正常中文及浏览器错误解码后的“访问频率太高”页面 */
export function isRateLimitPage(html) {
  return (
    typeof html === 'string' &&
    (html.includes('访问频率太高') ||
      html.includes('频率太高') ||
      html.includes('璁块棶棰戠巼澶珮'))
  );
}

/**
 * 带重试的 GET 请求
 * @param {import('axios').AxiosInstance} client
 * @param {string} url
 * @param {{retries?: number, referer?: string}} opts
 */
export async function getHtml(client, url, opts = {}) {
  const { retries = 4, referer } = opts;
  let lastErr;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await client.get(url, {
        headers: referer ? { Referer: referer } : undefined,
        responseType: 'text',
      });
      const html = res.data;
      if (isCaptchaPage(html)) {
        const err = new Error('CAPTCHA_REQUIRED');
        err.code = 'CAPTCHA_REQUIRED';
        throw err;
      }
      if (isRateLimitPage(html)) {
        const err = new Error('RATE_LIMITED');
        err.code = 'RATE_LIMITED';
        throw err;
      }
      return html;
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      const code = err.code;
      const isCaptcha = code === 'CAPTCHA_REQUIRED';
      const isRateLimited =
        code === 'RATE_LIMITED' ||
        status === 429 ||
        isRateLimitPage(err.response?.data);

      if (isRateLimited) {
        err.code = 'RATE_LIMITED';
        if (attempt === retries) break;
        const wait = 5000 * attempt + Math.random() * 2000;
        console.warn(`[限流] 命中 429，等待 ${(wait / 1000).toFixed(1)}s 后重试...`);
        await sleep(wait);
        continue;
      }

      if (isCaptcha && attempt === retries) break;
      const backoff = Math.min(5000, 800 * attempt) + Math.random() * 600;
      await sleep(backoff);
    }
  }
  throw lastErr;
}
