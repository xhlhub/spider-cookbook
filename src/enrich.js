/**
 * 把爬虫抓到的原始数据规整为统一的食谱结构：
 * - 拆分食材的「名称 + 数量 + 单位」
 * - 区分「食材」和「调料」
 * - 根据食材/标题/步骤推断「地区 / 口味 / 营养 / 耗时 / 难度」
 */

// ============ 调料识别 ============

/** 这些含有调料关键词，但其实是蔬菜/食材，必须排除 */
const NOT_SEASONING_TOKENS = [
  '洋葱', '葱头', '青葱', '蒜苔', '蒜苗', '蒜薹', '蒜黄',
  '青椒', '红椒', '彩椒', '甜椒', '柿子椒', '尖椒', '杭椒',
  '辣白菜', '油菜', '油麦菜', '油豆腐', '油条', '油皮', '油面筋',
  '葱油饼', '葱花饼', '蒜泥白肉',
];

/** 调料关键词（精确匹配或子串匹配） */
const SEASONING_TOKENS = [
  '盐', '糖', '冰糖', '红糖', '白糖',
  '酱油', '生抽', '老抽', '味极鲜', '蒸鱼豉油',
  '醋', '陈醋', '香醋', '米醋', '白醋', '黑醋',
  '料酒', '黄酒', '米酒', '清酒', '味噌',
  '味精', '鸡精', '鸡粉',
  '胡椒', '花椒', '麻椒', '八角', '大料', '桂皮', '香叶', '丁香',
  '孜然', '五香粉', '十三香', '咖喱',
  '豆瓣', '黄豆酱', '甜面酱', '辣椒酱', '剁椒', '老干妈', '蚝油', '耗油',
  '香油', '芝麻油', '麻油', '蜂蜜', '糖浆',
  '淀粉', '生粉', '玉米淀粉', '土豆淀粉', '红薯淀粉',
  '食用油', '色拉油', '菜籽油', '花生油', '橄榄油', '玉米油',
  '葱', '姜', '蒜',
  '辣椒', '干辣椒', '小米辣', '辣椒粉', '辣椒油', '泡椒',
  '番茄酱', '芥末', '芝麻', '黄油', '奶油', '椒盐', '腐乳', '豆豉',
];

export function isSeasoning(name) {
  if (!name) return false;
  for (const w of NOT_SEASONING_TOKENS) if (name.includes(w)) return false;
  for (const w of SEASONING_TOKENS) if (name.includes(w)) return true;
  return false;
}

// ============ 名称 / 用量拆分 ============

const CN_AMOUNT_WORDS = [
  '适量', '少许', '少量', '若干', '一些', '一点点', '一点',
  '酌情', '随意', '按需',
  '半碗', '半勺', '半杯', '半根', '半个', '半块', '半盒',
];

const CN_UNIT_TOKENS = [
  '块', '颗', '根', '片', '勺', '汤匙', '茶匙', '只', '条', '袋',
  '瓶', '杯', '碗', '份', '张', '团', '捏', '小撮', '撮', '把',
  '节', '段', '斤', '两', '克', '升', '毫升', '盒', '支', '棵',
  '头', '束', '粒', '滴', '罐', '听',
];

const CN_NUM_MAP = {
  零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 半: 0.5,
};

function chineseToNumber(s) {
  if (s in CN_NUM_MAP) return CN_NUM_MAP[s];
  // 简单处理 "十二""二十"
  if (/^十[一二三四五六七八九]$/.test(s)) return 10 + CN_NUM_MAP[s[1]];
  if (/^[二三四五六七八九]十[一二三四五六七八九]?$/.test(s)) {
    const tens = CN_NUM_MAP[s[0]] * 10;
    return s.length === 3 ? tens + CN_NUM_MAP[s[2]] : tens;
  }
  return null;
}

/**
 * 解析单一用量字符串 -> { amount, unit }
 *   "2个"  -> { amount: 2, unit: "个" }
 *   "适量"  -> { amount: "适量", unit: "" }
 *   "1/2 茶匙" -> { amount: 0.5, unit: "茶匙" }
 *   "100g" -> { amount: 100, unit: "g" }
 *   "一块" -> { amount: 1, unit: "块" }
 */
export function parseAmount(raw) {
  if (raw == null) return { amount: '适量', unit: '' };
  const s = String(raw).trim();
  if (!s) return { amount: '适量', unit: '' };

  for (const w of CN_AMOUNT_WORDS) {
    if (s === w || s.startsWith(w)) {
      return { amount: w, unit: '' };
    }
  }

  const range = s.match(/^([\d.]+)\s*[-~～至到]\s*([\d.]+)\s*(.*)$/);
  if (range) {
    return { amount: `${range[1]}~${range[2]}`, unit: range[3].trim() };
  }

  const m = s.match(/^([\d./]+)\s*(.*)$/);
  if (m && /\d/.test(m[1])) {
    let n;
    if (m[1].includes('/')) {
      const [a, b] = m[1].split('/').map(Number);
      n = b ? +(a / b).toFixed(3) : a;
    } else {
      n = Number(m[1]);
    }
    return {
      amount: Number.isFinite(n) ? n : m[1],
      unit: m[2].trim(),
    };
  }

  const cn = s.match(/^([零一二两三四五六七八九十半]+)\s*(.*)$/);
  if (cn) {
    const n = chineseToNumber(cn[1]);
    if (n != null) return { amount: n, unit: cn[2].trim() };
  }

  return { amount: s, unit: '' };
}

/**
 * 把列表页那种"嫩豆腐一块" / "瘦肉50克" / "盐少许" 的合并字符串拆成
 *   { name, amount, unit }
 */
export function splitNameAmount(text) {
  const s = String(text || '').trim();
  if (!s) return { name: '', amount: '适量', unit: '' };

  const numIdx = s.search(/\d/);
  if (numIdx > 0) {
    const name = s.slice(0, numIdx).trim();
    const { amount, unit } = parseAmount(s.slice(numIdx));
    return { name, amount, unit };
  }

  for (const w of CN_AMOUNT_WORDS) {
    const idx = s.indexOf(w);
    if (idx > 0) {
      return { name: s.slice(0, idx).trim(), amount: w, unit: '' };
    }
  }

  for (const u of CN_UNIT_TOKENS) {
    const re = new RegExp(`^(.+?)([零一二两三四五六七八九十半])${u}$`);
    const m = s.match(re);
    if (m) {
      const n = chineseToNumber(m[2]);
      return { name: m[1].trim(), amount: n != null ? n : m[2], unit: u };
    }
  }

  return { name: s, amount: '适量', unit: '' };
}

// ============ 标签推断 ============

const REGION_RULES = [
  { region: '川菜', kws: ['川', '麻辣', '水煮', '宫保', '鱼香', '麻婆', '口水', '夫妻肺片', '回锅', '重庆', '毛血旺', '担担', '钟水饺', '夹沙'] },
  { region: '粤菜', kws: ['粤', '广式', '广州', '港式', '早茶', '虾饺', '烧腊', '叉烧', '煲仔', '白切', '老火汤', '蒸鱼'] },
  { region: '湘菜', kws: ['湘', '湖南', '剁椒', '辣椒炒肉', '小炒肉', '腊味', '剁辣椒'] },
  { region: '鲁菜', kws: ['鲁', '山东', '葱烧', '糖醋鲤鱼', '九转大肠', '把子肉'] },
  { region: '苏菜', kws: ['苏菜', '淮扬', '扬州', '南京', '盐水鸭', '狮子头'] },
  { region: '浙菜', kws: ['浙菜', '西湖', '东坡肉', '龙井', '宋嫂'] },
  { region: '闽菜', kws: ['闽', '福建', '佛跳墙', '荔枝肉'] },
  { region: '徽菜', kws: ['徽菜', '安徽', '臭鳜鱼', '毛豆腐'] },
  { region: '东北菜', kws: ['东北', '锅包肉', '小鸡炖蘑菇', '酸菜', '猪肉炖粉条', '杀猪菜', '地三鲜'] },
  { region: '西北菜', kws: ['西北', '新疆', '兰州', '羊肉串', '手抓饭', '大盘鸡', '羊肉泡馍', '凉皮'] },
  { region: '京菜', kws: ['京菜', '北京', '烤鸭', '炸酱面', '京酱'] },
  { region: '本帮菜', kws: ['上海', '本帮', '红烧肉', '糖醋小排', '油爆虾'] },
  { region: '日料', kws: ['日式', '寿司', '味噌', '照烧', '天妇罗', '丼', '亲子'] },
  { region: '韩餐', kws: ['韩式', '韩国', '泡菜', '辣白菜', '部队锅', '石锅拌饭'] },
  { region: '西餐', kws: ['意大利', '法式', '意面', '披萨', '牛排', '汉堡', '三明治', '焗', '帕尼尼'] },
  { region: '东南亚', kws: ['泰式', '冬阴功', '咖喱', '越南', '河粉'] },
];

export function inferRegion(text) {
  const t = String(text || '');
  for (const r of REGION_RULES) {
    if (r.kws.some((k) => t.includes(k))) return r.region;
  }
  return '家常';
}

const TASTE_RULES = [
  { tag: '辣', kws: ['辣', '麻辣', '剁椒', '小米辣', '辣椒', '老干妈', '豆瓣', '泡椒', '川', '湘'] },
  { tag: '麻', kws: ['麻辣', '花椒', '麻椒', '藤椒'] },
  { tag: '酸', kws: ['酸', '醋', '柠檬', '番茄', '西红柿', '酸菜', '泡菜', '柚子'] },
  { tag: '甜', kws: ['糖', '蜂蜜', '糖醋', '果酱', '红枣', '蛋糕', '甜', '焦糖', '奶油'] },
  { tag: '咸', kws: ['老抽', '味噌', '腐乳', '豆豉', '腊味', '腊肉', '腊肠', '咸蛋', '咸鱼', '酱卤', '酱牛肉'] },
  { tag: '鲜', kws: ['鲜', '蚝油', '虾', '鱼', '蘑菇', '菌菇', '海鲜', '鸡汤', '高汤'] },
];

export function inferTaste(text) {
  const t = String(text || '');
  const tags = TASTE_RULES.filter((r) => r.kws.some((k) => t.includes(k))).map((r) => r.tag);
  if (tags.length === 0) tags.push('清淡');
  return Array.from(new Set(tags));
}

const PROTEIN_KWS = [
  '鸡蛋', '鸭蛋', '鹌鹑蛋',
  '牛肉', '猪肉', '鸡肉', '鸡胸', '羊肉', '鸭肉', '鹅肉',
  '排骨', '里脊', '五花肉', '梅花肉', '腿肉', '腱子',
  '肉末', '肉丝', '肉片', '肉糜', '肉馅', '肉丸',
  '鱼', '虾', '蟹', '贝', '蛤', '鱿鱼', '章鱼',
  '豆腐', '豆干', '豆皮', '腐竹', '千张', '毛豆',
  '牛奶', '酸奶', '奶酪', '芝士', '坚果',
];
const LIGHT_COOK_KWS = ['蒸', '煮', '凉拌', '汆', '焯', '白灼'];
const HEAVY_COOK_KWS = ['炸', '油炸', '红烧', '糖醋', '回锅', '爆炒', '焦糖'];
const QUICK_KWS = ['快手', '懒人', '简单', '5分钟', '10分钟', '一人食', '速成'];
const STAPLE_KWS = [
  '面条', '面包', '拉面', '烩面', '炒面', '汤面', '凉面', '担担面', '油泼面',
  '米饭', '炒饭', '蛋炒饭', '盖饭', '盖浇饭', '焖饭', '煲仔饭', '寿司饭',
  '稀饭', '小米粥', '皮蛋粥', '白粥', '八宝粥',
  '馒头', '包子', '花卷', '饺子', '馄饨', '云吞', '春卷', '烧麦',
  '烧饼', '烙饼', '葱油饼', '手抓饼', '披萨', '比萨', '汉堡', '三明治',
  '米粉', '河粉', '螺蛳粉', '凉皮', '粉条', '粉丝', '年糕', '米线',
];
const DESSERT_KWS = ['蛋糕', '甜品', '布丁', '慕斯', '饼干', '吐司', '面包', '披萨', '甜甜圈', '奶昔', '冰淇淋'];
const VEG_KWS = ['白菜', '青菜', '油菜', '生菜', '菠菜', '芹菜', '茄子', '黄瓜', '丝瓜', '苦瓜', '西兰花', '花菜', '莴笋', '土豆', '红薯', '萝卜', '豆角', '豆芽', '木耳', '蘑菇', '番茄', '西红柿', '南瓜', '冬瓜'];

export function inferNutrition({ title = '', ingredients = [], steps = [] } = {}) {
  const text = `${title} ${ingredients.map((i) => i.name).join(' ')} ${steps.join(' ')}`;
  const tags = new Set();

  if (PROTEIN_KWS.some((k) => text.includes(k))) tags.add('高蛋白');
  if (LIGHT_COOK_KWS.some((k) => text.includes(k)) && !HEAVY_COOK_KWS.some((k) => text.includes(k))) {
    tags.add('低脂');
  }
  if (QUICK_KWS.some((k) => text.includes(k)) || (steps.length > 0 && steps.length <= 3)) {
    tags.add('快手');
  }
  if (STAPLE_KWS.some((k) => text.includes(k))) tags.add('主食');
  if (DESSERT_KWS.some((k) => text.includes(k))) tags.add('甜点');

  const vegHits = VEG_KWS.filter((k) => text.includes(k)).length;
  const proteinHits = PROTEIN_KWS.filter((k) => text.includes(k)).length;
  if (vegHits >= 2 && proteinHits === 0) tags.add('素食');
  if (HEAVY_COOK_KWS.some((k) => text.includes(k))) tags.add('重口');

  if (tags.size === 0) tags.add('家常');
  return Array.from(tags);
}

const SLOW_COOK_KWS = ['炖', '煲', '焖', '卤', '熬', '慢炖', '高压锅', '电饭煲'];

/** 仅在标题中匹配显式总耗时；步骤里的"煎2分钟"等子步骤耗时不算 */
function matchExplicitTime(text) {
  const t = String(text || '');
  const hour = t.match(/(\d+)\s*小时/);
  if (hour) return `${hour[1]}小时`;
  const min = t.match(/(\d{2,3})\s*(?:分钟|min)/i);
  if (min) return `${min[1]}分钟`;
  return null;
}

export function inferTime({ title = '', steps = [] } = {}) {
  const explicit = matchExplicitTime(title);
  if (explicit) return explicit;

  const stepText = steps.join(' ');
  const slow = SLOW_COOK_KWS.some((k) => `${title} ${stepText}`.includes(k));
  const stepCount = steps.length;

  if (slow) return '约60分钟';
  if (stepCount === 0) return '未知';
  if (stepCount <= 3) return '约15分钟';
  if (stepCount <= 6) return '约30分钟';
  if (stepCount <= 10) return '约45分钟';
  return '约60分钟';
}

const HARD_TECHNIQUE_KWS = ['打发', '揉面', '醒面', '发酵', '裹粉', '挂浆', '雕花', '拔丝', '现磨'];

export function inferDifficulty({ steps = [], ingredients = [], seasoning = [], title = '' } = {}) {
  const text = `${title} ${steps.join(' ')}`;
  const total = ingredients.length + seasoning.length;
  if (HARD_TECHNIQUE_KWS.some((k) => text.includes(k))) return '困难';
  if (steps.length > 8 || total > 12) return '困难';
  if (steps.length > 4 || total > 7) return '中等';
  return '简单';
}

export function timeLabelToMinutes(value) {
  const text = String(value || '');
  const hours = text.match(/([\d.]+)\s*小时/);
  if (hours) return Math.max(1, Math.round(Number(hours[1]) * 60));
  const minutes = text.match(/(\d+)\s*分钟/);
  if (minutes) return Math.max(1, Number(minutes[1]));
  return 30;
}

const DIFFICULTY_VALUES = {
  简单: 'easy',
  中等: 'medium',
  困难: 'hard',
};

// ============ 步骤规整 ============

/**
 * 把原始步骤（字符串或 {text,image}）规整为：
 *   { title, description, images }
 *
 * - title：取首句（句号/换行/分号前），过短或过长则回退为 "步骤N"
 * - description：完整文本
 * - images：图片 URL 数组（下厨房一般每步 1 张图）
 */
export function buildStep(raw, index = 0) {
  let text = '';
  const images = [];

  if (typeof raw === 'string') {
    text = raw;
  } else if (raw && typeof raw === 'object') {
    text = raw.text || raw.description || '';
    if (Array.isArray(raw.images)) {
      raw.images.filter(Boolean).forEach((u) => images.push(u));
    } else if (raw.image) {
      images.push(raw.image);
    }
  }

  text = String(text).trim();
  if (!text) return null;

  const firstSentence = text.split(/[。\n；;！!？?]/)[0].trim();
  const fallback = `步骤${index + 1}`;
  const title =
    firstSentence && firstSentence.length >= 2 && firstSentence.length <= 18
      ? firstSentence
      : fallback;

  return { title, description: text, images };
}

// ============ 主转换 ============

/**
 * 把 list + detail 原始数据转为目标结构
 * @param {object} listItem 列表页解析得到的对象（含 id/title/url/cover/ingredients(string[])/score/author 等）
 * @param {object|null} detail 详情页解析得到的对象（可能为 null）
 */
export function enrichRecipe(listItem, detail, context = {}) {
  const title = (detail && detail.title) || listItem.title || '';

  let rawIngs = [];
  if (detail && Array.isArray(detail.ingredients) && detail.ingredients.length) {
    rawIngs = detail.ingredients.map((it) => {
      const { amount, unit } = parseAmount(it.amount);
      return { name: (it.name || '').trim(), amount, unit };
    });
  } else if (Array.isArray(listItem.ingredients) && listItem.ingredients.length) {
    rawIngs = listItem.ingredients
      .map((s) => splitNameAmount(s))
      .filter((x) => x.name);
  }

  const ingredients = [];
  const seasoning = [];
  for (const it of rawIngs) {
    if (!it.name) continue;
    if (isSeasoning(it.name)) {
      seasoning.push({ name: it.name, amount: it.unit ? `${it.amount}${it.unit}` : it.amount });
    } else {
      ingredients.push({ name: it.name, amount: it.amount, unit: it.unit });
    }
  }

  const steps = (detail?.steps || [])
    .map((s, i) => buildStep(s, i))
    .filter(Boolean);

  const stepTexts = steps.map((s) => s.description);

  const taste = inferTaste(`${title} ${rawIngs.map((i) => i.name).join(' ')} ${stepTexts.join(' ')}`);
  const nutrition = inferNutrition({ title, ingredients, steps: stepTexts });
  const time = inferTime({ title, steps: stepTexts });
  const difficultyLabel = inferDifficulty({ title, steps: stepTexts, ingredients, seasoning });
  const region = inferRegion(`${title} ${stepTexts.join(' ')}`);

  const tags = Array.from(
    new Set([
      ...(context.categoryTags || []),
      ...(region && region !== '家常' ? [region] : []),
      ...taste,
      ...nutrition,
    ])
  );

  const importIngredients = [
    ...ingredients.map((item) => ({
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      type: 'ingredient',
    })),
    ...seasoning.map((item) => ({
      name: item.name,
      amount: item.amount,
      unit: '',
      type: 'seasoning',
    })),
  ];

  return {
    name: title,
    category: context.apiCategory || '其他',
    tags,
    steps: stepTexts,
    image: (detail && detail.cover) || listItem.cover || '',
    suggestions: detail?.tip || detail?.description || '',
    nutrition: null,
    difficulty: DIFFICULTY_VALUES[difficultyLabel] || 'medium',
    cookingTime: timeLabelToMinutes(time),
    servings: 4,
    ingredients: importIngredients,
    source: {
      site: 'xiachufang',
      id: listItem.id,
      url: listItem.url,
      author: listItem.author || null,
      authorUrl: listItem.authorUrl || null,
      score: detail?.score ?? listItem.score ?? null,
      cookedCount: detail?.cookedCount ?? listItem.doneCount ?? null,
      publishedAt: detail?.publishedAt || null,
      detailFetched: Boolean(detail),
      detailError: listItem.detailError || null,
    },
  };
}
