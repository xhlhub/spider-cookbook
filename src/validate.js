const API_CATEGORIES = new Set(['家常菜', '快手菜', '地方菜', '妈妈菜', '其他']);
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

const INGREDIENT_ALIASES = new Map([
  ['番茄', '西红柿'],
  ['蕃茄', '西红柿'],
  ['生抽酱油', '生抽'],
  ['耗油', '蚝油'],
]);

const UNIT_ALIASES = new Map([
  ['克', 'g'],
  ['公克', 'g'],
  ['千克', 'kg'],
  ['公斤', 'kg'],
  ['毫升', 'ml'],
  ['公升', 'L'],
]);

function cleanText(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeUrl(value) {
  const text = cleanText(value);
  if (text.startsWith('//')) return `https:${text}`;
  if (text.startsWith('http://')) return `https://${text.slice(7)}`;
  return text;
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeIngredient(raw) {
  const originalName = cleanText(raw?.name);
  const name = INGREDIENT_ALIASES.get(originalName) || originalName;
  const rawUnit = cleanText(raw?.unit);
  const unit = UNIT_ALIASES.get(rawUnit) || rawUnit;
  let amount = cleanText(raw?.amount);

  if (amount && rawUnit && unit !== rawUnit && amount.endsWith(rawUnit)) {
    amount = `${amount.slice(0, -rawUnit.length)}${unit}`;
  } else if (amount && unit && !amount.endsWith(unit)) {
    amount = `${amount}${unit}`;
  }
  if (!amount) amount = '适量';

  return {
    name,
    amount,
    unit,
    type: raw?.type === 'seasoning' ? 'seasoning' : 'ingredient',
  };
}

function mergeIngredients(items) {
  const merged = new Map();
  for (const raw of items || []) {
    const item = normalizeIngredient(raw);
    if (!item.name) continue;
    const previous = merged.get(item.name);
    if (!previous) {
      merged.set(item.name, item);
      continue;
    }
    const amounts = new Set([...previous.amount.split('、'), item.amount].filter(Boolean));
    previous.amount = Array.from(amounts).join('、');
    if (!previous.unit) previous.unit = item.unit;
    if (item.type === 'ingredient') previous.type = 'ingredient';
  }
  return Array.from(merged.values());
}

export function cleanRecipe(raw) {
  const source = raw?.source || {};
  return {
    name: cleanText(raw?.name),
    category: cleanText(raw?.category),
    tags: Array.from(
      new Set((raw?.tags || []).map(cleanText).filter(Boolean))
    ),
    steps: (raw?.steps || []).map(cleanText).filter(Boolean),
    image: normalizeUrl(raw?.image),
    suggestions: cleanText(raw?.suggestions),
    nutrition:
      raw?.nutrition && typeof raw.nutrition === 'object' && !Array.isArray(raw.nutrition)
        ? raw.nutrition
        : null,
    difficulty: cleanText(raw?.difficulty),
    cookingTime: Number(raw?.cookingTime),
    servings: Number(raw?.servings) || 4,
    ingredients: mergeIngredients(raw?.ingredients),
    source: {
      site: cleanText(source.site),
      id: cleanText(source.id),
      url: normalizeUrl(source.url),
      author: cleanText(source.author) || null,
      authorUrl: normalizeUrl(source.authorUrl) || null,
      score: nullableNumber(source.score),
      cookedCount: nullableNumber(source.cookedCount),
      publishedAt: cleanText(source.publishedAt) || null,
    },
  };
}

export function validateRecipe(recipe) {
  const errors = [];
  const warnings = [];

  if (!recipe.name) errors.push('菜名为空');
  if (recipe.name.length > 100) warnings.push('菜名超过 100 个字符');
  if (!API_CATEGORIES.has(recipe.category)) errors.push('API 分类不合法');
  if (!recipe.image || !isHttpUrl(recipe.image)) errors.push('封面图片 URL 无效');
  if (!recipe.source.site) errors.push('来源站点为空');
  if (!recipe.source.id) errors.push('来源 ID 为空');
  if (!recipe.source.url || !isHttpUrl(recipe.source.url)) errors.push('来源 URL 无效');
  if (!DIFFICULTIES.has(recipe.difficulty)) errors.push('难度枚举不合法');
  if (!Number.isInteger(recipe.cookingTime) || recipe.cookingTime <= 0) {
    errors.push('烹饪时间必须是正整数分钟');
  } else if (recipe.cookingTime > 480) {
    warnings.push('烹饪时间超过 8 小时');
  }
  if (!Number.isInteger(recipe.servings) || recipe.servings <= 0) {
    errors.push('份数必须是正整数');
  }
  if (recipe.ingredients.length === 0) errors.push('食材为空，详情页可能抓取失败');
  if (recipe.steps.length === 0) errors.push('步骤为空，详情页可能抓取失败');
  if (recipe.steps.some((step) => step.length > 1000)) warnings.push('存在超长步骤');

  return { valid: errors.length === 0, errors, warnings };
}

export function cleanAndValidateRecipes(recipes) {
  const clean = [];
  const rejected = [];
  const warnings = [];
  const seenSources = new Set();

  for (const raw of recipes || []) {
    const recipe = cleanRecipe(raw);
    const key = `${recipe.source.site}:${recipe.source.id}`;
    const validation = validateRecipe(recipe);

    if (recipe.source.site && recipe.source.id && seenSources.has(key)) {
      validation.errors.push('同一批次来源 ID 重复');
      validation.valid = false;
    } else if (recipe.source.site && recipe.source.id) {
      seenSources.add(key);
    }

    if (validation.valid) {
      clean.push(recipe);
      if (validation.warnings.length) {
        warnings.push({ source: key, name: recipe.name, warnings: validation.warnings });
      }
    } else {
      rejected.push({
        source: key,
        name: recipe.name,
        errors: validation.errors,
        warnings: validation.warnings,
        recipe,
      });
    }
  }

  return {
    clean,
    rejected,
    warnings,
    report: {
      total: (recipes || []).length,
      valid: clean.length,
      rejected: rejected.length,
      warnings: warnings.length,
    },
  };
}
