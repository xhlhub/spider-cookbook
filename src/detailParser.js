import * as cheerio from 'cheerio';

function txt($el) {
  return $el.text().replace(/\s+/g, ' ').trim();
}

/**
 * 解析下厨房食谱详情页 HTML
 * @param {string} html
 * @returns {object}
 */
export function parseDetailPage(html) {
  const $ = cheerio.load(html);

  const title = txt($('h1.page-title')) || txt($('h1').first());
  const cover =
    $('.cover img').attr('src') ||
    $('img.cover').attr('src') ||
    $('meta[property="og:image"]').attr('content') ||
    '';
  const description =
    txt($('.desc')) || txt($('div.recipe-show .desc')) || '';

  const score =
    txt($('.score .number')) ||
    txt($('.score')).match(/[\d.]+/)?.[0] ||
    null;
  const cookedCount =
    txt($('.cooked .number')) ||
    txt($('.stats .cooked')).match(/\d+/)?.[0] ||
    txt($('.stats')).match(/(\d+)\s*人做过/)?.[1] ||
    null;

  const ingredients = [];
  $('.ings table tr').each((_, tr) => {
    const $tr = $(tr);
    const name =
      txt($tr.find('td.name')) || txt($tr.find('td').eq(0));
    const unit =
      txt($tr.find('td.unit')) || txt($tr.find('td').eq(1));
    if (name) ingredients.push({ name, amount: unit });
  });

  const steps = [];
  $('.steps ol li, .steps li').each((idx, li) => {
    const $li = $(li);
    const text = txt($li.find('p.text')) || txt($li.find('p').first()) || txt($li);
    const image = $li.find('img').attr('src') || '';
    if (text) steps.push({ index: idx + 1, text, image });
  });

  const tip = txt($('.tip'));

  let publishedAt = null;
  const timeText = txt($('.recipe-show .time')) || txt($('.time'));
  const m = timeText.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}([ T]\d{1,2}:\d{1,2}(:\d{1,2})?)?/);
  if (m) publishedAt = m[0];

  return {
    title,
    cover,
    description,
    score: score ? Number(score) || score : null,
    cookedCount: cookedCount ? Number(cookedCount) : null,
    ingredients,
    steps,
    tip: tip || '',
    publishedAt,
  };
}
