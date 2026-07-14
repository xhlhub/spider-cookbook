export const API_CATEGORIES = [
  '家常菜',
  '快手菜',
  '地方菜',
  '妈妈菜',
  '其他',
];

/**
 * 这里只放已经通过下厨房页面核实过的分类 ID。
 * 地方菜分类会在浏览器核实后逐项补充，避免凭经验写错 ID。
 */
export const CATEGORY_PRESETS = {
  家常菜: {
    sourceType: 'category',
    sourceCategoryId: '40076',
    sourceCategoryName: '家常菜',
    apiCategory: '家常菜',
    tags: [],
  },
  川菜: {
    sourceType: 'search',
    sourceKeyword: '川菜',
    sourceCategoryName: '川菜',
    apiCategory: '地方菜',
    tags: ['川菜'],
  },
  粤菜: {
    sourceType: 'search',
    sourceKeyword: '粤菜',
    sourceCategoryName: '粤菜',
    apiCategory: '地方菜',
    tags: ['粤菜'],
  },
  湘菜: {
    sourceType: 'search',
    sourceKeyword: '湘菜',
    sourceCategoryName: '湘菜',
    apiCategory: '地方菜',
    tags: ['湘菜'],
  },
  东北菜: {
    sourceType: 'search',
    sourceKeyword: '东北菜',
    sourceCategoryName: '东北菜',
    apiCategory: '地方菜',
    tags: ['东北菜'],
  },
};

const PRESETS_BY_ID = new Map(
  Object.values(CATEGORY_PRESETS)
    .filter((config) => config.sourceCategoryId)
    .map((config) => [config.sourceCategoryId, config])
);

function normalizeTags(tags) {
  return Array.from(
    new Set((tags || []).map((tag) => String(tag).trim()).filter(Boolean))
  );
}

/**
 * 支持两种用法：
 * 1. --category 家常菜（使用已核实的预置）
 * 2. --category 12345 --source-category-name 川菜 --api-category 地方菜 --category-tag 川菜
 */
export function resolveCategoryConfig({
  category,
  sourceCategoryName,
  apiCategory,
  categoryTags = [],
} = {}) {
  const categoryValue = String(category || '').trim();
  const preset = CATEGORY_PRESETS[categoryValue] || PRESETS_BY_ID.get(categoryValue);

  const resolved = {
    sourceType: preset?.sourceType || 'category',
    sourceCategoryId: preset ? preset.sourceCategoryId || '' : categoryValue,
    sourceKeyword: preset?.sourceKeyword || '',
    sourceCategoryName:
      sourceCategoryName || preset?.sourceCategoryName || categoryValue,
    apiCategory: apiCategory || preset?.apiCategory || '',
    tags: normalizeTags([...(preset?.tags || []), ...categoryTags]),
  };

  if (
    resolved.sourceType === 'category' &&
    !/^\d+$/.test(resolved.sourceCategoryId)
  ) {
    throw new Error(
      `未知分类“${categoryValue}”，请传入已经核实的下厨房数字分类 ID`
    );
  }
  if (!API_CATEGORIES.includes(resolved.apiCategory)) {
    throw new Error(
      `API 分类必须是以下之一：${API_CATEGORIES.join('、')}`
    );
  }
  if (!resolved.sourceCategoryName) {
    throw new Error('缺少来源分类名称，请使用 --source-category-name 指定');
  }
  if (resolved.sourceType === 'search' && !resolved.sourceKeyword) {
    throw new Error('搜索分类缺少关键词');
  }

  return resolved;
}
