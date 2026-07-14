# 下厨房食谱爬虫

Node.js 编写的下厨房分类菜谱爬虫。支持列表与详情抓取、分类映射、字段标准化、数据校验、清洗和质量报告，清洗结果可由 `eatwhat-api` 的导入脚本写入 PostgreSQL。

> 要求 Node.js ≥ 18。请遵守目标网站的使用条款并控制抓取频率。

## 快速开始

安装依赖：

```bash
npm install
```

抓取已经确认的“家常菜”分类，并获取详情：

```bash
npm run crawl -- --category 家常菜 --start 1 --end 3 --detail
```

未加入预置的分类必须显式提供真实数字 ID、来源名称、API 分类和标签：

```bash
npm run crawl -- \
  --category <已核实的分类ID> \
  --source-category-name 川菜 \
  --api-category 地方菜 \
  --category-tag 川菜 \
  --start 1 \
  --end 3 \
  --detail
```

## 输出文件

每次任务生成四类文件：

```text
output/
├── raw/       # 列表页和详情页原始解析结果，用于追溯
├── clean/     # 已转换为 API 导入结构的有效菜谱
├── rejected/  # 校验失败的菜谱及具体原因
└── reports/   # 本批总数、有效数、拒绝数和警告项
```

只有 `clean` 文件用于数据库导入。缺少详情、食材、步骤、封面或来源 ID 的记录会进入 `rejected`，不会直接入库。

## 清洗后的结构

```json
{
  "name": "麻婆豆腐",
  "category": "地方菜",
  "tags": ["川菜", "辣", "麻", "高蛋白"],
  "steps": ["豆腐切块焯水。", "炒香肉末和豆瓣酱后加入豆腐。"],
  "image": "https://i2.chuimg.com/cover.jpg",
  "suggestions": "豆腐不要频繁翻动。",
  "nutrition": null,
  "difficulty": "medium",
  "cookingTime": 30,
  "servings": 4,
  "ingredients": [
    {
      "name": "嫩豆腐",
      "amount": "1块",
      "unit": "块",
      "type": "ingredient"
    },
    {
      "name": "豆瓣酱",
      "amount": "2勺",
      "unit": "",
      "type": "seasoning"
    }
  ],
  "source": {
    "site": "xiachufang",
    "id": "107578876",
    "url": "https://www.xiachufang.com/recipe/107578876/"
  }
}
```

菜系、口味和“高蛋白/低脂”等描述会合并到 `tags`。`nutrition` 只保留真实数值营养数据，爬虫不会用推断标签伪造热量或蛋白质数值。

## CLI 参数

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `--category, -c` | `家常菜` | 已确认的预置名称或真实数字分类 ID |
| `--source-category-name` | - | 来源分类名，使用未预置 ID 时必填 |
| `--api-category` | - | API 一级分类，使用未预置 ID 时必填 |
| `--category-tag` | - | 每条菜谱附加标签，可重复传入 |
| `--start, -s` | `1` | 起始页 |
| `--end, -e` | `1` | 结束页，包含该页 |
| `--detail, -d` | `false` | 抓取食材、步骤和小贴士；正式导入必须开启 |
| `--max-recipes` | `0` | 本次最多处理多少条，0 表示不限制；适合小批联调 |
| `--concurrency, -n` | `2` | 详情并发数，建议不超过 2～3 |
| `--min-delay` | `1000` | 请求最小延迟，毫秒 |
| `--max-delay` | `2200` | 请求最大延迟，毫秒 |
| `--output, -o` | `output` | 输出根目录 |
| `--cookie` | `XCF_COOKIE` | 登录 Cookie；优先使用环境变量，避免出现在命令历史中 |

## Cookie 与反爬

建议先在 Chrome 中登录并完成可能出现的验证，然后通过环境变量运行：

```bash
export XCF_COOKIE='<浏览器会话 Cookie>'
npm run crawl -- --category 家常菜 --start 1 --end 3 --detail
```

Cookie 不会写入输出 JSON。命中验证码、限流或详情解析失败的记录会在报告中体现；不要通过提高并发规避验证。

## 导入数据库

在 API 项目中先校验：

```bash
cd ../eatwhat-api
npm run import:recipes -- ../spider-cookbook/output/clean/<文件名>.json --dry-run
```

再正式导入：

```bash
npm run import:recipes -- ../spider-cookbook/output/clean/<文件名>.json
```

导入脚本根据 `source.site + source.id` 创建或更新菜谱，并同步食材及 `RecipeIngredient` 关联，因此同一文件可以安全重复执行。

## 测试

```bash
npm test
```

## 项目结构

```text
src/
├── categoryConfig.js # 已核实分类预置和 API 分类映射
├── crawler.js        # 抓取、原始输出、清洗和报告编排
├── detailParser.js   # 详情页解析
├── enrich.js         # API 字段转换和标签推断
├── http.js           # 请求、重试、限流和验证码识别
├── index.js          # CLI
├── listParser.js     # 列表页解析
└── validate.js       # 清洗、去重和质量校验
```
