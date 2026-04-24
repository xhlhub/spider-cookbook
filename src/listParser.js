import * as cheerio from 'cheerio';
import { BASE_URL } from './http.js';

const RECIPE_ID_RE = /\/recipe\/(\d+)\/?/;

function absUrl(href) {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  return new URL(href, BASE_URL).toString();
}

function pickImage($img) {
  const dataSrc = $img.attr('data-src');
  const src = $img.attr('src');
  const url = dataSrc && !dataSrc.startsWith('data:') ? dataSrc : src || '';
  return url || '';
}

/**
 * 解析分类列表页
 * @param {string} html
 * @returns {{ recipes: Array, hasNext: boolean, nextUrl: string|null, currentPage: number }}
 */
export function parseListPage(html) {
  const $ = cheerio.load(html);

  const recipes = [];
  $('.normal-recipe-list .recipe').each((_, el) => {
    const $el = $(el);
    const link = $el.find('.info p.name a').first().attr('href') || '';
    const url = absUrl(link);
    const idMatch = url.match(RECIPE_ID_RE);
    const id = idMatch ? idMatch[1] : '';

    const title = $el.find('.info p.name a').first().text().trim();
    const $img = $el.find('.cover img').first();
    const cover = pickImage($img);

    const ingredients = [];
    $el.find('.ing').children().each((_, c) => {
      const text = $(c).text().trim();
      if (text) ingredients.push(text);
    });
    if (ingredients.length === 0) {
      const ingText = $el.find('.ing').text().trim();
      if (ingText) {
        ingText
          .split(/[、,，]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((s) => ingredients.push(s));
      }
    }

    const score = $el.find('.stats .score').first().text().trim() || null;
    const statsText = $el.find('.stats').text().replace(/\s+/g, ' ').trim();
    const doneMatch = statsText.match(/(\d+)\s*人做过/);
    const doneCount = doneMatch ? Number(doneMatch[1]) : null;

    const $author = $el.find('.author a').first();
    const author = $author.text().trim() || null;
    const authorUrl = $author.attr('href') ? absUrl($author.attr('href')) : null;

    if (id && title) {
      recipes.push({
        id,
        title,
        url,
        cover,
        ingredients,
        score: score ? Number(score) : null,
        doneCount,
        author,
        authorUrl,
      });
    }
  });

  const $now = $('.pager .now').first();
  const currentPage = $now.length ? Number($now.text().trim()) || 1 : 1;
  const $next = $('.pager a.next').first();
  const nextHref = $next.attr('href') || null;
  const hasNext = Boolean(nextHref);

  return {
    recipes,
    hasNext,
    nextUrl: hasNext ? absUrl(nextHref) : null,
    currentPage,
  };
}
