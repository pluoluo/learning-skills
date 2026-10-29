# Learning Skills

把一个具体学习问题，做成孩子能操作、能得到解释、能换例验证的学习体验。

Portable teaching skills for AI agents. Generate an interactive lesson that opens in a browser, together with an editable content package a learning application can validate and consume.

首个 Skill 是 **[interactive-topic-lesson](skills/interactive-topic-lesson/SKILL.md)**。当前为 `0.1.1` 首版，支持数学、语文、英语的专题创作；随仓库提供的完整原创样例是“周长与面积”。通用创作能力仍需更多宿主与真实用户试用，已有样例不代表所有学科的生成质量都经过验证。

![周长与面积独立课程预览](https://github.com/pluoluo/learning-skills/releases/download/v0.1.1/perimeter-area-preview.png)

## 先体验一个完整样例

需要 Node.js 20 或更高版本。生成与打开样例不需要 API Key、平台账号，也不需要安装 npm 依赖。

```bash
git clone https://github.com/pluoluo/learning-skills.git
cd learning-skills
npm run example:check
npm run example:build
```

用浏览器打开 `dist/perimeter-area/index.html` 即可。也可以从仓库的 Releases 下载已经打包的样例，再打开其中的 `index.html`。

- [下载可直接打开的周长与面积样例](https://github.com/pluoluo/learning-skills/releases/download/v0.1.1/perimeter-area-demo-v0.1.1.zip)
- [下载完整 Skill 文件夹](https://github.com/pluoluo/learning-skills/releases/download/v0.1.1/interactive-topic-lesson-v0.1.1.zip)

孩子可以改变长方形的长与宽，切换“围一圈”和“铺满”，再用固定长度的围栏构造不同面积，最后换新例子核对。操作、提示、返回探索和本次测试均可独立运行。当前页面只保留本次输入，不建立学生档案，也不把一次得分解释为已经掌握。

## 使用 Skill 创作新课

将整个 `skills/interactive-topic-lesson` 文件夹放入宿主支持的技能目录，或让支持读取本地 Skill 的 Agent 加载该目录的 `SKILL.md`。脚本、参考资料和模板必须一起保留。Hermes 用户可将整个目录复制到 `~/.hermes/skills/interactive-topic-lesson`，在新会话中使用 `/interactive-topic-lesson`。

例如：

> 使用 interactive-topic-lesson。孩子会做角度加减，但在多线图中不知道先找哪些条件。请围绕“找条件并连接到目标角”做一节可操作的小课，保留按需提示，最后用一个新图验证。交付到我指定的目录。

> 请做一个分数比较小课：同样大小的纸条，为什么 1/2 比 1/3 大？希望孩子通过等分和比较发现原因，而不只背规则。

Skill 会组织需求、设计、制作与核对。模型由宿主提供，仓库脚本不自行调用模型或收费服务。实际创作质量取决于宿主能力和模型表现；已提供的确定性检查不能替代内容核对和浏览器试用。

## 交付文件

| 文件 | 用途 |
|---|---|
| `index.html` | 可直接打开的独立课程，包含隔离的教学画布和本地练习 |
| `lesson.json` | 原始需求、假设、教学目标和完整可编辑内容 |
| `special-study.json` | 可交给宿主服务端校验的 v2 画布内容与测试 |
| `validation.json` | 内容摘要和实际执行过的静态检查，明确未运行的验证 |
| `LICENSE` | 随复用运行外壳分发的 MIT 许可证，网页内部也保留完整声明 |

输入输出协议和限制见 [contract.md](skills/interactive-topic-lesson/references/contract.md)，教学核对标准见 [teaching.md](skills/interactive-topic-lesson/references/teaching.md)。

## 与学习平台共同迭代

教学规则、交付协议和工具在这个仓库维护。社区入口把内容包变成独立页面；平台入口消费内容包，再负责家庭权限、任务恢复、审核发布和正式作答记录。平台应固定所用版本，独立校验内容并保留历史版本。

本仓库首版与现有 `SpecialStudyContent` v2 对齐：画布不含正式测试答案，测试数据单独交给宿主。目前完成内容协议对齐与只读兼容检查；平台生成器尚未切换到这份 Skill。内容协议兼容不等于自动安装 Skill 或完成了线上导入；详细分工见 [host-integration.md](skills/interactive-topic-lesson/references/host-integration.md)。

## 开发与验证

```bash
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

有现成 Chromium 时，也可通过 `CHROMIUM_EXECUTABLE_PATH` 指定可执行文件。浏览器测试使用本地文件，不访问家庭服务或写入数据库，覆盖 1000×600 与 1920×1080 CSS 像素视口。测试输出和构建产物被 Git 忽略。

检查另一个内容包或构建到指定目录：

```bash
node skills/interactive-topic-lesson/scripts/validate.mjs /path/to/lesson.json
node skills/interactive-topic-lesson/scripts/build.mjs /path/to/lesson.json --out /path/to/delivery
```

构建器默认拒绝覆盖已有文件；有意重建时加 `--force`。修复规则或工具时，保留能复现问题的最小案例，并分别说明结构、浏览器、学科内容和真实学习效果的验证范围。共享样例使用原创或获得授权的材料，不上传家庭私有教材、孩子记录和密钥。

## 许可证

本仓库的原创 Skill、脚本、模板和随仓库发布的原创样例采用 **[MIT License](LICENSE)**，版权声明为 `Copyright (c) 2026 pluoluo`。允许使用、修改、分发和商用，复制或分发相关软件时需保留许可证要求的声明。

独立 Skill 文件夹内也附带许可证。构建出的网页内嵌运行外壳的完整 MIT 声明，并同时输出 `LICENSE`，便于单文件分享时保留声明。用户新创作的课程内容及提供的教材、插图等材料，仍按各自的权利和授权处理。
