# 下厨房食谱爬虫 (xiachufang-spider)

Node.js 写的下厨房（[xiachufang.com](https://www.xiachufang.com/)）食谱爬虫，
支持按分类抓取列表（标题、食材、评分、作者、封面、链接），可选抓取详情页（食材表、步骤、发布时间等），
自动翻页，请求间随机延时，详情页带并发控制，遇到反爬自动降级保留基础信息。

## 安装

```bash
npm install
```

> 要求 Node.js ≥ 18（项目使用 ESM 与顶层 `await`）。

## 快速开始

抓取「家常菜」分类（id=40076）第 1 页：

```bash
npm run crawl -- --category 40076 --start 1 --end 1
```

抓取第 1~3 页，并尝试抓取每个食谱的详情页：

```bash
npm run crawl -- -c 40076 -s 1 -e 3 --detail
```

结果会写入 `output/recipes-<category>-p<start>-<end>-<timestamp>.json`。

## CLI 参数

| 参数              | 简写 | 默认值   | 说明                                                |
| ----------------- | ---- | -------- | --------------------------------------------------- |
| `--category`      | `-c` | `40076`  | 分类 ID（如家常菜=40076）                            |
| `--start`         | `-s` | `1`      | 起始页码                                             |
| `--end`           | `-e` | `1`      | 结束页码（包含）                                     |
| `--detail`        | `-d` | `false`  | 是否抓取详情页                                       |
| `--concurrency`   | `-n` | `2`      | 详情页并发数（建议 ≤ 3 以免触发滑动验证）             |
| `--min-delay`     |      | `1000`   | 请求最小间隔（毫秒）                                 |
| `--max-delay`     |      | `2200`   | 请求最大间隔（毫秒）                                 |
| `--output`        | `-o` | `output` | 输出目录                                             |
| `--cookie`        |      | (空)     | 浏览器 Cookie，用于详情页绕过滑动验证（亦可读环境变量 `XCF_COOKIE`） |

## 输出格式

每条记录都会被 `src/enrich.js` 统一加工成下面这种「业务结构」：

```json
{
  "name": "麻婆豆腐",
  "region": "川菜",
  "ingredients": [
    { "name": "嫩豆腐", "amount": 1, "unit": "块" },
    { "name": "猪瘦肉", "amount": 50, "unit": "g" }
  ],
  "seasoning": [
    { "name": "郫县豆瓣酱", "amount": "3勺" },
    { "name": "盐", "amount": "少许" },
    { "name": "蒜末", "amount": "0.5茶匙" }
  ],
  "steps": [
    {
      "title": "豆腐切小块,加盐水焯1分钟",
      "description": "豆腐切小块,加盐水焯1分钟",
      "images": ["https://i2.chuimg.com/step1.jpg"]
    },
    {
      "title": "步骤2",
      "description": "热锅冷油,下肉末炒散。炒到变色后盛出,加入豆瓣酱炒出红油",
      "images": ["https://i2.chuimg.com/step2.jpg"]
    }
  ],
  "taste": ["辣", "麻"],
  "nutrition": ["高蛋白", "低脂"],
  "time": "约60分钟",
  "difficulty": "中等",
  "source": {
    "site": "xiachufang",
    "id": "107578876",
    "url": "https://www.xiachufang.com/recipe/107578876/",
    "cover": "https://i2.chuimg.com/...",
    "author": "小鱼妈妈美食记",
    "authorUrl": "https://www.xiachufang.com/cook/172383526/",
    "score": 7.8,
    "cookedCount": 66,
    "publishedAt": "2025-07-08 22:24:27",
    "detailFetched": true,
    "detailError": null
  }
}
```

字段含义与生成方式：

| 字段          | 说明                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------ |
| `name`        | 菜名，详情页优先，否则用列表页标题。                                                       |
| `region`      | 地区/菜系。基于菜名/步骤的关键词规则推断（川/粤/湘/鲁/苏/浙/闽/徽/东北/西北/京/本帮/日/韩/西餐/东南亚），未命中则为 `家常`。 |
| `ingredients` | 主食材列表，元素为 `{ name, amount(数字或字符串), unit }`。从详情页 `ings table` 解析；详情缺失时回落到列表页的合并字符串并自动拆分。 |
| `seasoning`   | 调料列表，元素为 `{ name, amount }`。通过调料关键词词典（盐/酱油/醋/料酒/葱姜蒜/豆瓣等）从食材中分离。 |
| `steps`       | 步骤数组，元素为 `{ title, description, images[] }`。`title` 取首句（≤18 字），过长则回退为 `步骤N`；`images` 为图片 URL 列表（无图为 `[]`）。 |
| `taste`       | 口味标签：`辣 / 麻 / 酸 / 甜 / 咸 / 鲜 / 清淡`，可多选。                                    |
| `nutrition`   | 营养标签：`高蛋白 / 低脂 / 快手 / 主食 / 甜点 / 素食 / 重口 / 家常`，可多选。               |
| `time`        | 耗时。优先从标题里识别 `xx分钟 / xx小时`；含「炖煲焖卤」等慢炖词或步骤多则增大估值；否则按步骤数粗估。 |
| `difficulty`  | 难度：`简单 / 中等 / 困难`。基于步骤数、食材+调料总数及是否含「打发/揉面/挂浆」等技法。     |
| `source`      | 元信息：原站 ID、URL、封面、作者、评分、做过人数、发布时间，以及详情是否抓到、错误码。     |

> 详情页若被反爬拦截，`source.detailFetched=false` 且 `source.detailError="CAPTCHA_REQUIRED"`，但 `ingredients/seasoning` 仍可由列表页字段降级生成，不影响整批任务。

## 关于反爬

下厨房列表页基本无反爬，但**详情页**有阿里云滑动验证，纯 HTTP 抓取很容易被拦截。建议：

1. 在浏览器登录后，从 DevTools → Application → Cookies 复制 `xiachufang.com` 域下的全部 Cookie，传给 `--cookie` 或设置环境变量 `XCF_COOKIE`。
2. 控制 `--concurrency`（≤ 3）和 `--min-delay/--max-delay`（≥ 1s）。
3. 若仍频繁失败，可改为对失败列表二次重跑，或使用代理 IP 池。

## 项目结构

```
src/
├── index.js          # CLI 入口
├── crawler.js        # 主流程编排（翻页、并发详情、enrich、写文件）
├── http.js           # axios 客户端 + 重试 + 429/验证码识别 + 随机延时
├── listParser.js     # 列表页 cheerio 解析（原始字段）
├── detailParser.js   # 详情页 cheerio 解析（原始字段）
└── enrich.js         # 把原始字段加工为业务结构
                      #   ├─ splitNameAmount/parseAmount  数量+单位拆分
                      #   ├─ isSeasoning                  调料识别
                      #   └─ inferRegion/Taste/Nutrition/Time/Difficulty 标签推断
```

## 自定义标签规则

所有标签词典都集中在 `src/enrich.js` 里，可以按需修改：

- `SEASONING_TOKENS` / `NOT_SEASONING_TOKENS`：调料识别词典与排除词
- `REGION_RULES`：菜系关键词
- `TASTE_RULES`、`PROTEIN_KWS`、`LIGHT_COOK_KWS`、`STAPLE_KWS`、`DESSERT_KWS`、`VEG_KWS`：口味与营养标签
- `SLOW_COOK_KWS`、`HARD_TECHNIQUE_KWS`：影响耗时与难度的关键词

## 常见分类 ID 参考

可访问 <https://www.xiachufang.com/category/> 找到分类 URL 中的数字 ID。例如：

| 分类   | ID    |
| ------ | ----- |
| 家常菜 | 40076 |
| 下午茶 | 40078 |
| 烘焙   | 40077 |
| 早餐   | 40847 |

## 提示

请遵守网站的 robots 协议与使用条款，控制抓取频率，仅用于学习/个人使用。
