import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveCategoryConfig } from '../src/categoryConfig.js';
import { enrichRecipe } from '../src/enrich.js';
import { cleanAndValidateRecipes } from '../src/validate.js';
import { isRateLimitPage } from '../src/http.js';

test('resolves the confirmed home-cooking category preset', () => {
  assert.deepEqual(resolveCategoryConfig({ category: '家常菜' }), {
    sourceType: 'category',
    sourceCategoryId: '40076',
    sourceKeyword: '',
    sourceCategoryName: '家常菜',
    apiCategory: '家常菜',
    tags: [],
  });
});

test('resolves a regional cuisine to the verified search mode', () => {
  assert.deepEqual(resolveCategoryConfig({ category: '川菜' }), {
    sourceType: 'search',
    sourceCategoryId: '',
    sourceKeyword: '川菜',
    sourceCategoryName: '川菜',
    apiCategory: '地方菜',
    tags: ['川菜'],
  });
});

test('requires an API category for an unconfirmed source category id', () => {
  assert.throws(
    () => resolveCategoryConfig({ category: '12345', sourceCategoryName: '川菜' }),
    /API 分类必须是以下之一/
  );
});

test('converts a crawled detail into the API import shape', () => {
  const recipe = enrichRecipe(
    {
      id: '107578876',
      title: '麻婆豆腐',
      url: 'https://www.xiachufang.com/recipe/107578876/',
      cover: 'https://i2.chuimg.com/cover.jpg',
      author: '测试作者',
    },
    {
      title: '麻婆豆腐',
      cover: 'https://i2.chuimg.com/detail.jpg',
      description: '经典川味下饭菜',
      tip: '豆腐不要频繁翻动',
      ingredients: [
        { name: '嫩豆腐', amount: '1块' },
        { name: '郫县豆瓣酱', amount: '2勺' },
      ],
      steps: [
        { text: '豆腐切块焯水。', image: 'https://i2.chuimg.com/step1.jpg' },
        { text: '炒香肉末和豆瓣酱后加入豆腐。', image: '' },
      ],
    },
    { apiCategory: '地方菜', categoryTags: ['川菜'] }
  );

  assert.equal(recipe.category, '地方菜');
  assert.equal(recipe.image, 'https://i2.chuimg.com/detail.jpg');
  assert.deepEqual(recipe.steps, ['豆腐切块焯水。', '炒香肉末和豆瓣酱后加入豆腐。']);
  assert.equal(recipe.suggestions, '豆腐不要频繁翻动');
  assert.match(recipe.difficulty, /^(easy|medium|hard)$/);
  assert.equal(Number.isInteger(recipe.cookingTime), true);
  assert.equal(recipe.ingredients.length, 2);
  assert.equal(recipe.ingredients.find((item) => item.name === '郫县豆瓣酱')?.type, 'seasoning');
  assert.equal(recipe.tags.includes('川菜'), true);
});

test('cleans aliases and rejects incomplete detail records', () => {
  const base = {
    name: ' 番茄炒蛋 ',
    category: '家常菜',
    tags: ['快手', '快手'],
    steps: [' 炒熟即可。 '],
    image: 'http://example.com/cover.jpg',
    suggestions: '',
    nutrition: null,
    difficulty: 'easy',
    cookingTime: 15,
    servings: 2,
    ingredients: [{ name: '番茄', amount: 2, unit: '个', type: 'ingredient' }],
    source: {
      site: 'xiachufang',
      id: '1',
      url: 'http://www.xiachufang.com/recipe/1/',
    },
  };

  const validResult = cleanAndValidateRecipes([base]);
  assert.equal(validResult.report.valid, 1);
  assert.equal(validResult.clean[0].ingredients[0].name, '西红柿');
  assert.equal(validResult.clean[0].ingredients[0].amount, '2个');
  assert.equal(validResult.clean[0].image.startsWith('https://'), true);

  const invalidResult = cleanAndValidateRecipes([{ ...base, steps: [] }]);
  assert.equal(invalidResult.report.rejected, 1);
  assert.equal(invalidResult.rejected[0].errors.includes('步骤为空，详情页可能抓取失败'), true);
});

test('normalizes promotional recipe titles to concise dish names', () => {
  const base = {
    category: '地方菜',
    tags: ['湘菜'],
    steps: ['炒熟即可。'],
    image: 'https://example.com/cover.jpg',
    suggestions: '',
    nutrition: null,
    difficulty: 'easy',
    cookingTime: 15,
    servings: 2,
    ingredients: [{ name: '食材', amount: '适量', unit: '', type: 'ingredient' }],
    source: {
      site: 'xiachufang',
      id: 'title-test',
      url: 'https://www.xiachufang.com/recipe/title-test/',
    },
  };

  const cases = [
    {
      name: '零基础教程，湘菜小炒',
      ingredients: [
        { name: '牛肉（筋膜要少）', amount: '半斤', type: 'ingredient' },
        { name: '香菜/芹菜', amount: '适量', type: 'ingredient' },
      ],
      expected: '香菜小炒牛肉',
    },
    {
      name: '下饭湘菜【小炒攸县香干】，随手一炒就好吃！',
      expected: '小炒攸县香干',
    },
    { name: '湘菜馆-金钱蛋', expected: '金钱蛋' },
  ];

  for (const [index, item] of cases.entries()) {
    const result = cleanAndValidateRecipes([
      {
        ...base,
        name: item.name,
        ingredients: item.ingredients || base.ingredients,
        source: { ...base.source, id: `title-test-${index}` },
      },
    ]);
    assert.equal(result.clean[0].name, item.expected);
  }
});

test('detects both normal and mojibake rate-limit pages', () => {
  assert.equal(isRateLimitPage('访问频率太高，请稍后再试'), true);
  assert.equal(isRateLimitPage('璁块棶棰戠巼澶珮锛岃绋嶅悗鍐嶈瘯'), true);
  assert.equal(isRateLimitPage('<html>正常菜谱</html>'), false);
});

test('rejects recipe collections disguised as a single recipe', () => {
  const collection = {
    name: '30道广东家常菜',
    category: '地方菜',
    tags: ['粤菜'],
    steps: Array.from({ length: 31 }, (_, index) => `步骤 ${index + 1}`),
    image: 'https://example.com/collection.jpg',
    suggestions: '',
    nutrition: null,
    difficulty: 'hard',
    cookingTime: 60,
    servings: 4,
    ingredients: [{ name: '食材', amount: '适量', unit: '', type: 'ingredient' }],
    source: {
      site: 'xiachufang',
      id: 'collection-1',
      url: 'https://www.xiachufang.com/recipe/collection-1/',
    },
  };
  const result = cleanAndValidateRecipes([collection]);
  assert.equal(result.report.rejected, 1);
  assert.equal(result.rejected[0].errors.includes('疑似菜谱合集或菜单'), true);
  assert.equal(result.rejected[0].errors.includes('步骤超过 30 条，疑似菜谱合集'), true);
});
