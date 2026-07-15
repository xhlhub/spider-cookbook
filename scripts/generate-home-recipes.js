import fs from 'node:fs/promises';
import path from 'node:path';

const outputPath = path.resolve(
  'output/generated/home-recipes-50-preview.json'
);

const ingredient = (name, amount, type = 'ingredient', unit = '') => ({
  name,
  amount,
  unit,
  type,
});

const recipeStepOverrides = {
  '豆角焖面': [
    '五花肉切薄片，豆角掰成约 4 厘米长的段，蒜切末；鲜面条抖散备用。',
    '锅烧热后放少量油，下五花肉中小火煸 2–3 分钟，煸出油脂、边缘微焦后加入蒜末炒香。',
    '放入豆角翻炒 2 分钟，加入生抽 2 勺、老抽半勺、蚝油 1 勺和白糖半勺，翻匀让豆角上色。',
    '沿锅边加入约 400 ml 热水，水量以刚没过豆角为准；留出约三分之一汤汁，剩余汤汁先盛入小碗备用。',
    '把面条均匀铺在豆角上，不要翻动，盖盖中小火焖 8–10 分钟；中途若锅内偏干，分两次淋入预留汤汁。',
    '开盖后用筷子把面条和豆角翻拌均匀，再焖 1 分钟至面条熟透、汤汁基本收干，尝味后补少许盐即可。',
  ],
  '红烧肉': [
    '五花肉切成约 3 厘米见方的块，冷水下锅，加入 2 片姜和少许料酒；水开后撇去浮沫，捞出沥干。',
    '锅中放 20g 冰糖和 1 勺水，小火熬至冰糖融化并呈琥珀色；立即倒入五花肉快速翻炒，使每块肉均匀上色。',
    '加入姜片、2 勺生抽、半勺老抽和八角，翻炒 1 分钟炒出香味。',
    '沿锅边加入没过肉块的热水，大火煮开后转最小火，盖盖焖 45–50 分钟；中途查看水量，避免烧干。',
    '肉块用筷子能轻松扎透时，开盖转中大火收汁 5–8 分钟，期间不断翻动防止粘锅。',
    '汤汁浓稠并能挂在肉块表面时关火，静置 2 分钟再盛出。',
  ],
  '鱼香肉丝': [
    '猪里脊逆纹切丝，加入 1 勺生抽、1 勺淀粉和 1 勺食用油抓匀，腌制 10 分钟；胡萝卜和木耳切丝。',
    '碗中调鱼香汁：白糖 1 勺、陈醋 1 勺半、生抽 1 勺、淀粉半勺和清水 3 勺，搅拌至淀粉化开。',
    '锅烧热后放油，肉丝下锅快速滑散，变白后立刻盛出，避免炒老。',
    '锅中留底油，放 1 勺郫县豆瓣酱小火炒出红油，再放胡萝卜丝和木耳丝炒 1–2 分钟。',
    '倒回肉丝，沿锅边倒入鱼香汁，大火翻炒 30–40 秒至汤汁浓亮，尝味后即可出锅。',
  ],
  '宫保鸡丁': [
    '鸡胸肉切 1.5 厘米见方的丁，加入生抽 1 勺、料酒半勺和淀粉 1 勺抓匀，腌制 10 分钟；黄瓜切丁。',
    '调碗汁：白糖 1 勺、香醋 1 勺、生抽 1 勺、淀粉半勺和清水 3 勺，搅拌均匀。',
    '冷油下花生米，小火炸至微黄后捞出；锅中留底油，放花椒和干辣椒，小火炸出香味。',
    '转大火放鸡丁炒散，鸡肉变白后加入黄瓜丁翻炒约 30 秒。',
    '倒入碗汁快速翻炒至浓稠，关火后拌入花生米，立刻出锅保持花生酥脆。',
  ],
  '糖醋里脊': [
    '猪里脊切粗条，加少许盐、1 个鸡蛋和适量淀粉抓匀，静置 10 分钟，让每根肉条均匀挂浆。',
    '锅中油温六成热时分批下肉条，中火炸 2–3 分钟定型后捞出；油温升高后复炸 30 秒至金黄酥脆。',
    '另起锅放番茄酱 2 勺、白糖 2 勺、白醋 1 勺和清水 3 勺，小火搅拌至糖完全融化。',
    '酱汁冒细泡后淋入少量水淀粉，煮至能挂勺的浓度。',
    '关火后立即倒入炸好的里脊快速翻匀，使表面均匀裹上糖醋汁，30 秒内出锅。',
  ],
  '土豆烧牛肉': [
    '牛腩切 3 厘米块，冷水下锅焯出血沫后洗净；土豆和胡萝卜切滚刀块，土豆用清水浸泡防变色。',
    '锅中放少量油，炒香葱、姜和八角，倒入牛腩加生抽 2 勺、老抽半勺翻炒上色。',
    '加入没过牛腩的热水，大火煮开后转小火焖 40 分钟，期间保持汤面微微翻滚。',
    '加入土豆和胡萝卜，再焖 15–20 分钟至牛肉软烂、土豆能用筷子轻松扎透。',
    '开盖加盐调味，转大火收汁 3–5 分钟，保留少量汤汁拌饭更好吃。',
  ],
  '黄焖鸡': [
    '鸡腿剁块后冷水下锅，水开焯 2 分钟并洗净；土豆、香菇切块，姜蒜切片。',
    '锅中放少量油，姜蒜和 1 勺黄豆酱小火炒香，加入鸡块翻炒 2 分钟。',
    '加入生抽 2 勺、老抽半勺、冰糖 1 小块和热水，水量约没过鸡块的三分之二。',
    '大火煮开后转中小火焖 20 分钟，放入土豆和香菇继续焖 15 分钟。',
    '土豆熟透后放入青椒，翻炒 1 分钟；尝味后根据咸度补盐，收至汤汁浓稠即可。',
  ],
  '糖醋排骨': [
    '小排冷水下锅，加入姜片和料酒；水开后撇沫，捞出用温水洗净。',
    '锅中少量油把排骨煎至表面微黄，加入白糖 2 勺翻炒至糖融化并裹在排骨上。',
    '加入生抽 2 勺、香醋 3 勺和没过排骨一半的热水，大火煮开后盖盖小火焖 25–30 分钟。',
    '开盖后尝味，若偏酸可补半勺糖；转大火收汁，持续翻动使每块排骨均匀挂汁。',
    '汤汁浓稠、排骨表面油亮时关火，撒少许熟芝麻即可。',
  ],
  '清蒸鲈鱼': [
    '鲈鱼处理干净后擦干水分，鱼身两侧各划 2 刀；在鱼腹和切口处塞入姜片，盘底垫两根葱段。',
    '蒸锅水完全烧开后放入鱼，盖盖大火蒸 8 分钟；鱼较大可延长至 10 分钟。',
    '关火后不要立即开盖，利用余温焖 2 分钟；取出后倒掉盘中的腥水和姜葱。',
    '鱼身铺上新鲜葱丝，淋 2 勺蒸鱼豉油；另起小锅烧热 2 勺食用油。',
    '热油冒烟后均匀浇在葱丝上，听到香味爆出后立即上桌。',
  ],
  '家常豆腐': [
    '北豆腐切成约 1 厘米厚的三角片，木耳提前泡发洗净，青椒切片。',
    '平底锅放少量油，豆腐中小火煎至两面金黄后盛出；不要频繁翻动以免碎裂。',
    '锅中留底油，放 1 勺豆瓣酱和蒜末小火炒出红油，加入木耳和青椒炒 1 分钟。',
    '调入生抽 1 勺、蚝油半勺和清水 4 勺，放入煎好的豆腐轻轻翻匀。',
    '盖盖中小火烧 3–4 分钟使豆腐入味，最后用少许水淀粉收浓汤汁。',
  ],
};

function buildDetailedSteps(shortSteps) {
  return shortSteps;
}

const recipe = (name, tags, cookingTime, ingredients, steps, difficulty = 'easy') => ({
  name,
  category: '家常菜',
  tags: ['家常菜', ...tags],
  steps: recipeStepOverrides[name] || buildDetailedSteps(steps),
  image: 'https://placehold.co/1200x800/FFF3E0/7A3E1D?text=EatWhat+Home+Recipe',
  suggestions: '按个人口味调整盐和辣度。',
  nutrition: null,
  difficulty,
  cookingTime,
  servings: 2,
  ingredients,
});

const recipes = [
  recipe('番茄炒蛋', ['快手'], 12, [ingredient('番茄', '2个'), ingredient('鸡蛋', '3个'), ingredient('葱花', '1勺', 'seasoning'), ingredient('盐', '适量', 'seasoning')], ['番茄切块，鸡蛋加少许盐打散。', '热锅下油炒熟鸡蛋，盛出备用。', '番茄炒软出汁后倒回鸡蛋，翻匀调味即可。']),
  recipe('青椒肉丝', ['下饭'], 18, [ingredient('猪里脊', '200g'), ingredient('青椒', '2个'), ingredient('蒜', '2瓣', 'seasoning'), ingredient('生抽', '1勺', 'seasoning')], ['猪里脊切丝，加生抽和淀粉抓匀。', '青椒切丝，热锅滑熟肉丝后盛出。', '蒜末爆香，炒软青椒后倒回肉丝调味。']),
  recipe('鱼香肉丝', ['川味', '下饭'], 25, [ingredient('猪里脊', '200g'), ingredient('胡萝卜', '半根'), ingredient('木耳', '50g'), ingredient('郫县豆瓣酱', '1勺', 'seasoning'), ingredient('生抽', '2勺', 'seasoning'), ingredient('陈醋', '1勺半', 'seasoning'), ingredient('白糖', '1勺', 'seasoning'), ingredient('淀粉', '1勺半', 'seasoning'), ingredient('食用油', '2勺', 'seasoning')], ['肉丝加淀粉抓匀，配菜切丝备用。', '调匀糖、醋、生抽和淀粉水制成鱼香汁。', '炒香豆瓣酱，依次炒肉丝和配菜，倒入料汁收浓。'], 'medium'),
  recipe('宫保鸡丁', ['川味', '下饭'], 25, [ingredient('鸡胸肉', '250g'), ingredient('黄瓜', '半根'), ingredient('花生米', '50g'), ingredient('干辣椒', '6个', 'seasoning'), ingredient('花椒', '15粒', 'seasoning'), ingredient('生抽', '2勺', 'seasoning'), ingredient('料酒', '半勺', 'seasoning'), ingredient('白糖', '1勺', 'seasoning'), ingredient('香醋', '1勺', 'seasoning'), ingredient('淀粉', '1勺半', 'seasoning'), ingredient('食用油', '3勺', 'seasoning')], ['鸡肉切丁，用生抽和淀粉腌十分钟。', '炒香花椒和干辣椒，倒入鸡丁炒熟。', '加入黄瓜丁和调味汁，最后拌入花生米。'], 'medium'),
  recipe('麻婆豆腐', ['川味', '下饭'], 20, [ingredient('嫩豆腐', '1盒'), ingredient('猪肉末', '80g'), ingredient('郫县豆瓣酱', '1勺', 'seasoning'), ingredient('花椒粉', '适量', 'seasoning')], ['豆腐切块，入淡盐水焯一分钟。', '炒香肉末和豆瓣酱，加入少量清水。', '放入豆腐煮入味，勾薄芡后撒花椒粉。'], 'medium'),
  recipe('红烧肉', ['下饭'], 70, [ingredient('五花肉', '500g'), ingredient('冰糖', '20g', 'seasoning'), ingredient('姜', '4片', 'seasoning'), ingredient('生抽', '2勺', 'seasoning'), ingredient('老抽', '半勺', 'seasoning'), ingredient('料酒', '1勺', 'seasoning'), ingredient('八角', '1个', 'seasoning'), ingredient('食用油', '1勺', 'seasoning')], ['五花肉切块焯水，沥干备用。', '冰糖炒出糖色，放入五花肉翻炒上色。', '加热水和调味料小火焖至软烂，转大火收汁。'], 'medium'),
  recipe('可乐鸡翅', ['快手', '下饭'], 35, [ingredient('鸡翅中', '10个'), ingredient('可乐', '330ml'), ingredient('姜', '3片', 'seasoning'), ingredient('生抽', '1勺', 'seasoning')], ['鸡翅两面划刀，焯水后沥干。', '煎至表皮金黄，加入姜片和生抽。', '倒入可乐焖二十分钟，收至汤汁浓稠。']),
  recipe('土豆烧牛肉', ['下饭'], 65, [ingredient('牛腩', '400g'), ingredient('土豆', '2个'), ingredient('胡萝卜', '1根'), ingredient('八角', '1个', 'seasoning'), ingredient('葱', '1根', 'seasoning'), ingredient('姜', '4片', 'seasoning'), ingredient('生抽', '2勺', 'seasoning'), ingredient('老抽', '半勺', 'seasoning'), ingredient('食用油', '1勺', 'seasoning')], ['牛腩焯水后洗净，土豆和胡萝卜切块。', '炒香葱姜八角，放牛腩和调味料翻炒。', '加热水焖软牛腩，再放入土豆胡萝卜煮熟。'], 'medium'),
  recipe('红烧茄子', ['下饭'], 25, [ingredient('茄子', '2根'), ingredient('青椒', '1个'), ingredient('蒜', '3瓣', 'seasoning'), ingredient('生抽', '1勺', 'seasoning')], ['茄子切条，少油煎至变软。', '调匀生抽、糖、醋和少量淀粉水。', '蒜末爆香，加入茄子青椒和料汁烧至入味。']),
  recipe('地三鲜', ['东北菜', '下饭'], 30, [ingredient('茄子', '1根'), ingredient('土豆', '1个'), ingredient('青椒', '1个'), ingredient('蒜', '3瓣', 'seasoning')], ['茄子、土豆和青椒切块。', '分别煎熟茄子和土豆，青椒过油后盛出。', '蒜末爆香，倒入食材和酱汁快速翻炒。'], 'medium'),
  recipe('酸辣土豆丝', ['快手', '素菜'], 12, [ingredient('土豆', '2个'), ingredient('干辣椒', '4个', 'seasoning'), ingredient('白醋', '1勺', 'seasoning'), ingredient('蒜', '2瓣', 'seasoning')], ['土豆切细丝后用清水冲洗淀粉。', '热锅炒香蒜末和干辣椒。', '大火快炒土豆丝，沿锅边淋醋后调盐出锅。']),
  recipe('干煸豆角', ['下饭'], 22, [ingredient('四季豆', '300g'), ingredient('猪肉末', '80g'), ingredient('芽菜', '30g'), ingredient('干辣椒', '5个', 'seasoning')], ['四季豆掰段并擦干水分。', '少油煸至表皮起皱后盛出。', '炒香肉末、芽菜和辣椒，倒回豆角炒匀。'], 'medium'),
  recipe('蒜蓉西兰花', ['快手', '素菜'], 12, [ingredient('西兰花', '1棵'), ingredient('蒜', '5瓣', 'seasoning'), ingredient('蚝油', '1勺', 'seasoning'), ingredient('盐', '适量', 'seasoning')], ['西兰花掰小朵，盐水浸泡后焯熟。', '蒜末小火炒香。', '倒入西兰花，加蚝油和少量水快速翻匀。']),
  recipe('蚝油生菜', ['快手', '素菜'], 8, [ingredient('生菜', '1棵'), ingredient('蒜', '3瓣', 'seasoning'), ingredient('蚝油', '1勺', 'seasoning'), ingredient('淀粉', '1勺', 'seasoning')], ['生菜洗净，沸水中焯十秒后摆盘。', '蒜末炒香，加入蚝油、清水和淀粉水。', '酱汁煮开后淋在生菜上。']),
  recipe('清炒油麦菜', ['快手', '素菜'], 8, [ingredient('油麦菜', '300g'), ingredient('蒜', '3瓣', 'seasoning'), ingredient('盐', '适量', 'seasoning'), ingredient('食用油', '1勺', 'seasoning')], ['油麦菜洗净切段，蒜切末。', '热锅下油炒香蒜末。', '大火放油麦菜翻炒断生，加盐即可。']),
  recipe('手撕包菜', ['快手', '下饭'], 12, [ingredient('包菜', '半颗'), ingredient('五花肉', '80g'), ingredient('干辣椒', '4个', 'seasoning'), ingredient('陈醋', '1勺', 'seasoning')], ['包菜洗净后用手撕成片。', '五花肉煸出油，炒香干辣椒。', '大火炒包菜，沿锅边淋醋并调味。']),
  recipe('回锅肉', ['川味', '下饭'], 35, [ingredient('五花肉', '300g'), ingredient('青蒜苗', '150g'), ingredient('郫县豆瓣酱', '1勺', 'seasoning'), ingredient('豆豉', '1勺', 'seasoning')], ['五花肉煮至断生，放凉后切薄片。', '煸出肉片油脂，加入豆瓣酱和豆豉。', '放入蒜苗大火翻炒至断生。'], 'medium'),
  recipe('京酱肉丝', ['下饭'], 22, [ingredient('猪里脊', '250g'), ingredient('豆皮', '2张'), ingredient('甜面酱', '2勺', 'seasoning'), ingredient('葱白', '1根', 'seasoning')], ['肉丝加生抽和淀粉抓匀，豆皮切方片。', '肉丝滑熟后盛出。', '甜面酱炒香，倒回肉丝翻匀，配葱丝豆皮食用。'], 'medium'),
  recipe('糖醋里脊', ['酸甜', '下饭'], 30, [ingredient('猪里脊', '300g'), ingredient('鸡蛋', '1个'), ingredient('番茄酱', '2勺', 'seasoning'), ingredient('白醋', '1勺', 'seasoning'), ingredient('白糖', '2勺', 'seasoning'), ingredient('淀粉', '适量', 'seasoning'), ingredient('盐', '少许', 'seasoning'), ingredient('食用油', '适量', 'seasoning')], ['里脊切条，用盐、蛋液和淀粉抓匀。', '分两次炸至金黄酥脆。', '番茄酱、糖和醋熬成汁，快速裹匀肉条。'], 'medium'),
  recipe('葱爆羊肉', ['快手', '下饭'], 15, [ingredient('羊肉片', '300g'), ingredient('大葱', '2根'), ingredient('孜然粉', '适量', 'seasoning'), ingredient('生抽', '1勺', 'seasoning')], ['羊肉片加生抽和淀粉抓匀。', '大葱斜切段，热锅大火炒香。', '倒入羊肉片快速翻炒，撒孜然和盐出锅。']),
  recipe('豆角焖面', ['一锅出'], 35, [ingredient('鲜面条', '300g'), ingredient('豆角', '250g'), ingredient('五花肉', '120g'), ingredient('蒜', '3瓣', 'seasoning'), ingredient('生抽', '2勺', 'seasoning'), ingredient('老抽', '半勺', 'seasoning'), ingredient('蚝油', '1勺', 'seasoning'), ingredient('白糖', '半勺', 'seasoning'), ingredient('盐', '适量', 'seasoning'), ingredient('食用油', '1勺', 'seasoning')], ['五花肉煸香，加入豆角翻炒。', '加水和调味料，铺上面条后盖盖焖煮。', '汤汁将干时翻拌面条至熟透。'], 'medium'),
  recipe('番茄牛腩', ['汤菜'], 75, [ingredient('牛腩', '500g'), ingredient('番茄', '3个'), ingredient('洋葱', '半个'), ingredient('番茄酱', '1勺', 'seasoning')], ['牛腩焯水洗净，番茄切块。', '炒香洋葱和番茄酱，加入番茄炒出汁。', '放牛腩加热水焖软，调盐后再煮十分钟。'], 'medium'),
  recipe('玉米排骨汤', ['汤菜'], 70, [ingredient('排骨', '500g'), ingredient('玉米', '1根'), ingredient('胡萝卜', '1根'), ingredient('姜', '3片', 'seasoning')], ['排骨焯水洗净，玉米和胡萝卜切段。', '所有食材加足量热水煮开。', '小火炖一小时，最后加盐调味。']),
  recipe('冬瓜排骨汤', ['汤菜'], 65, [ingredient('排骨', '500g'), ingredient('冬瓜', '400g'), ingredient('姜', '3片', 'seasoning'), ingredient('葱', '1根', 'seasoning')], ['排骨焯水后放入汤锅。', '加姜片和热水炖四十五分钟。', '加入冬瓜煮至透明，加盐和葱花。']),
  recipe('紫菜蛋花汤', ['快手', '汤菜'], 8, [ingredient('紫菜', '10g'), ingredient('鸡蛋', '1个'), ingredient('虾皮', '1勺', 'seasoning'), ingredient('香油', '少许', 'seasoning')], ['紫菜和虾皮放入汤碗。', '锅中水烧开，加盐和生抽调味。', '淋入蛋液形成蛋花，冲入汤碗并滴香油。']),
  recipe('酸辣汤', ['汤菜'], 18, [ingredient('嫩豆腐', '150g'), ingredient('木耳', '50g'), ingredient('鸡蛋', '1个'), ingredient('白醋', '2勺', 'seasoning')], ['豆腐、木耳和胡萝卜切丝。', '高汤煮开后放入食材，煮两分钟。', '加胡椒粉和醋，勾芡后淋入蛋液。']),
  recipe('皮蛋瘦肉粥', ['早餐'], 45, [ingredient('大米', '100g'), ingredient('瘦肉', '120g'), ingredient('皮蛋', '2个'), ingredient('姜丝', '适量', 'seasoning')], ['大米提前浸泡，煮成浓稠白粥。', '瘦肉切丝加盐和淀粉腌制。', '放入肉丝和皮蛋煮熟，加入姜丝和葱花。']),
  recipe('扬州炒饭', ['快手', '主食'], 18, [ingredient('米饭', '2碗'), ingredient('鸡蛋', '2个'), ingredient('火腿肠', '1根'), ingredient('豌豆', '50g')], ['鸡蛋炒散盛出，火腿和配菜切丁。', '锅中炒香配菜，倒入米饭炒散。', '加入鸡蛋和盐，炒至颗粒分明。']),
  recipe('蛋炒饭', ['快手', '主食'], 10, [ingredient('米饭', '2碗'), ingredient('鸡蛋', '2个'), ingredient('葱花', '1勺', 'seasoning'), ingredient('盐', '适量', 'seasoning')], ['鸡蛋打散，米饭提前拨松。', '鸡蛋炒散后倒入米饭。', '大火翻炒至干爽，加入葱花和盐。']),
  recipe('青椒炒蛋', ['快手'], 10, [ingredient('青椒', '2个'), ingredient('鸡蛋', '3个'), ingredient('蒜', '2瓣', 'seasoning'), ingredient('盐', '适量', 'seasoning')], ['青椒切丝，鸡蛋打散。', '先炒熟鸡蛋盛出。', '炒香蒜末和青椒，倒回鸡蛋调味。']),
  recipe('韭菜炒蛋', ['快手'], 8, [ingredient('韭菜', '200g'), ingredient('鸡蛋', '3个'), ingredient('盐', '适量', 'seasoning'), ingredient('食用油', '1勺', 'seasoning')], ['韭菜洗净切段，鸡蛋打散。', '鸡蛋炒至凝固后盛出。', '大火炒韭菜断生，倒入鸡蛋加盐翻匀。']),
  recipe('香菇滑鸡', ['下饭'], 30, [ingredient('鸡腿肉', '300g'), ingredient('鲜香菇', '200g'), ingredient('青椒', '1个'), ingredient('蚝油', '1勺', 'seasoning')], ['鸡腿肉切块，用生抽和淀粉腌制。', '鸡肉炒至变色，加入香菇炒软。', '放青椒和蚝油，焖至鸡肉熟透。']),
  recipe('黄焖鸡', ['下饭'], 45, [ingredient('鸡腿', '2只'), ingredient('土豆', '1个'), ingredient('香菇', '150g'), ingredient('青椒', '1个'), ingredient('黄豆酱', '1勺', 'seasoning'), ingredient('姜', '3片', 'seasoning'), ingredient('蒜', '3瓣', 'seasoning'), ingredient('生抽', '2勺', 'seasoning'), ingredient('老抽', '半勺', 'seasoning'), ingredient('冰糖', '1小块', 'seasoning'), ingredient('食用油', '1勺', 'seasoning')], ['鸡腿剁块焯水，土豆和香菇切块。', '炒香姜蒜和黄豆酱，放鸡块翻炒。', '加水焖二十五分钟，放土豆香菇焖熟。'], 'medium'),
  recipe('小鸡炖蘑菇', ['东北菜', '汤菜'], 70, [ingredient('鸡腿', '2只'), ingredient('干榛蘑', '40g'), ingredient('粉条', '80g'), ingredient('姜', '3片', 'seasoning')], ['干榛蘑泡发洗净，鸡腿切块焯水。', '鸡块加姜和热水炖四十五分钟。', '加入榛蘑和粉条，煮熟后加盐。'], 'medium'),
  recipe('鲫鱼豆腐汤', ['汤菜'], 35, [ingredient('鲫鱼', '1条'), ingredient('嫩豆腐', '1盒'), ingredient('姜', '4片', 'seasoning'), ingredient('葱', '1根', 'seasoning')], ['鲫鱼擦干表面，煎至两面金黄。', '加入开水和姜片，煮出奶白汤色。', '放入豆腐煮十分钟，加盐和葱花。']),
  recipe('清蒸鲈鱼', ['清淡'], 20, [ingredient('鲈鱼', '1条'), ingredient('姜片', '4片', 'seasoning'), ingredient('姜丝', '适量', 'seasoning'), ingredient('葱段', '2段', 'seasoning'), ingredient('葱丝', '适量', 'seasoning'), ingredient('蒸鱼豉油', '2勺', 'seasoning'), ingredient('食用油', '2勺', 'seasoning')], ['鲈鱼处理干净，鱼身划两刀。', '铺姜丝后大火蒸八分钟，关火焖两分钟。', '倒掉蒸汁，放葱丝并淋热油和豉油。']),
  recipe('红烧带鱼', ['下饭'], 30, [ingredient('带鱼', '500g'), ingredient('葱姜', '适量', 'seasoning'), ingredient('生抽', '2勺', 'seasoning'), ingredient('白糖', '1勺', 'seasoning')], ['带鱼洗净切段，擦干后煎至金黄。', '葱姜爆香，加入调味料和少量热水。', '放入带鱼焖入味，收浓汤汁。']),
  recipe('糖醋排骨', ['酸甜', '下饭'], 50, [ingredient('小排', '500g'), ingredient('白糖', '2勺', 'seasoning'), ingredient('香醋', '3勺', 'seasoning'), ingredient('生抽', '2勺', 'seasoning'), ingredient('姜片', '3片', 'seasoning'), ingredient('料酒', '1勺', 'seasoning'), ingredient('熟芝麻', '1勺', 'seasoning'), ingredient('食用油', '1勺', 'seasoning')], ['排骨焯水后沥干，煎至表面金黄。', '加入糖、醋、生抽和热水焖三十分钟。', '大火收至汁浓，撒熟芝麻。'], 'medium'),
  recipe('土豆炖鸡块', ['下饭'], 45, [ingredient('鸡腿', '2只'), ingredient('土豆', '2个'), ingredient('青椒', '1个'), ingredient('生抽', '2勺', 'seasoning')], ['鸡块焯水，土豆切滚刀块。', '炒香葱姜，加入鸡块和生抽翻炒。', '加水焖二十分钟，放土豆和青椒煮熟。']),
  recipe('白菜炖豆腐', ['素菜', '汤菜'], 25, [ingredient('大白菜', '300g'), ingredient('北豆腐', '1块'), ingredient('粉条', '80g'), ingredient('姜', '2片', 'seasoning')], ['白菜切片，豆腐切块，粉条泡软。', '姜片爆香后炒软白菜。', '加水放豆腐和粉条炖至入味。']),
  recipe('肉末茄子', ['下饭'], 25, [ingredient('茄子', '2根'), ingredient('猪肉末', '120g'), ingredient('蒜', '4瓣', 'seasoning'), ingredient('豆瓣酱', '1勺', 'seasoning')], ['茄子切条，少油煎至变软。', '炒香肉末、蒜末和豆瓣酱。', '放入茄子和少量水焖入味。']),
  recipe('肉末豆腐', ['下饭'], 20, [ingredient('嫩豆腐', '1盒'), ingredient('猪肉末', '100g'), ingredient('蒜末', '1勺', 'seasoning'), ingredient('生抽', '1勺', 'seasoning')], ['豆腐切小块，用热水焯一分钟。', '肉末炒散，放蒜末和生抽炒香。', '加入豆腐和少量水煮入味，勾薄芡。']),
  recipe('香干炒肉', ['下饭'], 18, [ingredient('香干', '200g'), ingredient('五花肉', '150g'), ingredient('青椒', '1个'), ingredient('蒜苗', '1根')], ['香干和青椒切片，五花肉切薄片。', '煸香五花肉，加入香干炒至微焦。', '放青椒和蒜苗，加生抽翻炒断生。']),
  recipe('芹菜炒牛肉', ['快手', '下饭'], 18, [ingredient('牛里脊', '250g'), ingredient('芹菜', '200g'), ingredient('小米辣', '2个', 'seasoning'), ingredient('生抽', '1勺', 'seasoning')], ['牛肉切片，加生抽和淀粉抓匀。', '牛肉大火滑炒至变色后盛出。', '炒香小米辣和芹菜，倒回牛肉快速翻匀。']),
  recipe('蒜苗炒腊肉', ['下饭'], 18, [ingredient('腊肉', '200g'), ingredient('蒜苗', '250g'), ingredient('干辣椒', '3个', 'seasoning'), ingredient('蒜', '2瓣', 'seasoning')], ['腊肉蒸软后切片，蒜苗切段。', '腊肉小火煸出油，炒香蒜和辣椒。', '加入蒜苗大火炒至断生。']),
  recipe('洋葱炒牛肉', ['快手', '下饭'], 18, [ingredient('牛里脊', '250g'), ingredient('洋葱', '1个'), ingredient('彩椒', '半个'), ingredient('黑胡椒', '适量', 'seasoning')], ['牛肉切片腌制，洋葱和彩椒切条。', '牛肉大火炒至七成熟后盛出。', '炒香洋葱和彩椒，倒回牛肉撒黑胡椒。']),
  recipe('黑椒牛柳', ['快手', '下饭'], 20, [ingredient('牛里脊', '250g'), ingredient('洋葱', '半个'), ingredient('青椒', '1个'), ingredient('黑胡椒酱', '1勺', 'seasoning')], ['牛肉切条，用黑胡椒和淀粉腌制。', '牛肉大火炒至变色盛出。', '炒香洋葱青椒，倒回牛肉和黑胡椒酱翻匀。']),
  recipe('荷包蛋焖面', ['一锅出', '主食'], 20, [ingredient('挂面', '200g'), ingredient('鸡蛋', '2个'), ingredient('番茄', '1个'), ingredient('生抽', '2勺', 'seasoning')], ['鸡蛋煎成荷包蛋，番茄切块。', '炒出番茄汁，加水和生抽煮开。', '放挂面和荷包蛋焖至面条吸收汤汁。']),
  recipe('家常豆腐', ['下饭'], 25, [ingredient('北豆腐', '1块'), ingredient('木耳', '50g'), ingredient('青椒', '1个'), ingredient('豆瓣酱', '1勺', 'seasoning'), ingredient('蒜', '3瓣', 'seasoning'), ingredient('生抽', '1勺', 'seasoning'), ingredient('蚝油', '半勺', 'seasoning'), ingredient('淀粉', '半勺', 'seasoning'), ingredient('食用油', '2勺', 'seasoning')], ['豆腐切三角片，煎至两面金黄。', '炒香豆瓣酱，加入木耳和青椒。', '倒入豆腐和酱汁，烧至入味。']),
  recipe('西葫芦炒蛋', ['快手'], 12, [ingredient('西葫芦', '1个'), ingredient('鸡蛋', '3个'), ingredient('蒜', '2瓣', 'seasoning'), ingredient('盐', '适量', 'seasoning')], ['西葫芦切片，鸡蛋打散。', '鸡蛋炒熟盛出，蒜末爆香。', '炒软西葫芦后倒回鸡蛋，加盐翻匀。']),
];

const generatedAt = new Date().toISOString();
const payload = {
  meta: {
    generatedAt,
    count: recipes.length,
    source: 'eatwhat-generated',
    note: '此文件为人工智能生成的预览菜谱，尚未导入数据库；图片为占位图。',
  },
  recipes: recipes.map((item, index) => ({
    ...item,
    source: {
      site: 'eatwhat-generated',
      id: `home-${String(index + 1).padStart(3, '0')}`,
      url: `https://eatwhat.local/generated/home-${String(index + 1).padStart(3, '0')}`,
      author: 'EatWhat 生成数据',
      authorUrl: null,
      score: null,
      cookedCount: null,
      publishedAt: generatedAt,
    },
  })),
};

if (payload.recipes.length !== 50) {
  throw new Error(`预期生成 50 道菜，实际生成 ${payload.recipes.length} 道`);
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`已生成 ${payload.recipes.length} 道家常菜：${outputPath}`);
