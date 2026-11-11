# 学习证据：先保留作品，再说明怎样核对

0.5 起，课件可以完全不带选择题。用 evidenceTasks 声明要保留的构造、修改或解释，用目标和覆盖设计中的 evidenceIds 关联它们。主画布自由组织活动；播放器只接收主动提交的记录、核对声明的有限条件、展示和保存记录。

记录不等于答对，数值条件符合不等于解释成立，二者都不等于掌握或真实学习效果。不要用输入非空、点击保存或最终改对替代评价。多次记录保留为多次尝试，不覆盖首次。

## 两种评价方式

**human-review**：保留原文或作品状态，始终显示“待人工复核”。criteria 是供家长/老师阅读的检查问题，不由系统自动判断。可以保留空白草稿；它仍然是待复核内容，没有分数和完成标记。

**numeric-constraints**：对有限数值字段和声明的规则逐项计算，返回 checked/met、checked/not_met 或 invalid。只核对该作品的数值条件。文字理由即使同时被保存，也没有自动获得语义评价。检查式应从学习目标和独立验算得来，不能把展示文案当数值真相。

新任务声明放在 lesson.source.json 根部：

```json
{
  "evidenceTasks": [
    {
      "id": "garden",
      "title": "用28米围栏构造一个整米长方形",
      "kind": "construction",
      "evaluation": {
        "type": "numeric-constraints",
        "fields": [
          {"key":"w","label":"横边（米）","integer":true,"min":1,"max":13},
          {"key":"h","label":"竖边（米）","integer":true,"min":1,"max":13}
        ],
        "rules": [
          {
            "id":"fence","label":"长宽和为14米",
            "left":{"op":"add","args":[{"field":"w"},{"field":"h"}]},
            "relation":"eq","right":14
          }
        ]
      }
    },
    {
      "id":"reason","title":"说明这个构造为什么符合要求","kind":"explanation",
      "evaluation":{"type":"human-review","criteria":["是否引用实际构造","理由是否说明条件，而不是只写结论"]}
    }
  ]
}
```

kind 为 construction、revision 或 explanation，只描述保存的作品类别，不改变评价。每个任务用唯一 id、title、kind 和 evaluation；不传脚本或模型执行指令。

numeric-constraints 支持：

| 部分 | 合同 |
| --- | --- |
| fields | 1–8个，key、label 必填，integer/min/max 可选；只接受实际有限数字，不把字符串自动转数值 |
| rules | 1–8条，每条含 id、label、left、relation、right |
| 数值表达式 | 有限数字、`{"field":"字段名"}`，或二元 `{"op":"add/subtract/multiply/divide","args":[左,右]}`；不执行 JavaScript |
| 比较 | eq、lt、lte、gt、gte；eq 默认精确比较，可明确声明非负有限 tolerance，并审查其教学依据 |
| 边界 | 每条规则最多64个表达式节点、深度6；除零或非有限计算标为 invalid |

图形、标签与提交字段必须来自同一实际状态。该核对器不能验证自由文本含义、符号证明、未建模的几何关系或学生的隐藏思维。所需评价超出支持范围时保留人工复核，不编造正确性。

## 画布如何提交

先读取宿主 context.capabilities.evidence。为 true 才显示“记录作品”“保存解释”等对应操作。宿主会给出 evidenceTasks 的 id、title、kind 和 evaluationType，不会把所有判定规则塞入画布上下文。

在学生主动保存或核对时发送，不要每个按键都产生一条学习记录：

```js
parent.postMessage({
  channel: 'special-study',
  type: 'evidence',
  payload: {
    taskId: 'garden',
    response: {w: 9, h: 5, 我的理由: '先保存这个构造，再与另一种比较'},
    assistance: {hintIds: ['perimeter-help'], explanationViewed: false}
  }
}, '*');
```

response 是非空 JSON 对象；字段名可直接使用适合阅读的中文。数值评价字段使用声明的 key。可以用“初稿”“改稿”“我的理由”等保存修改事实和表达。图片/画布不自动截图；用有意义的结构化作品状态和文字记录，不声称保存了未捕获的画面。

assistance 可省略，省略时标为“未报告”，不能当作无帮助。提供时包含 hintIds 数组与 explanationViewed 布尔值，表示课件实际展示过什么；这仍不能证明学生读过，也不代表没有其他帮助。不要在修改答案时清除先前已展示帮助的事实。

宿主响应 evidence-result：

```js
{channel:'special-study', type:'evidence-result', payload:{ok:true, localOnly:true, record:{/* 本次记录与计算结果 */}}}
```

失败为 `{ok:false,error:'原因'}`；画布应保留学生输入并说明未保存。只接受来自 parent 的本频道响应。未知任务、超出大小限制或伪造 score/result 等顶层字段会被拒绝。每个记录由宿主补 sequence、taskId、title、kind、attempt、timestamp、response、assistance 和 result。

每页最多100条记录，满额不覆盖旧记录。单份 response 最多16000字符、500节点、深度6，数组最多100项，对象最多50项；单个字符串最多8000字符。超过限制时请先保存已有记录，再调整后续内容范围，不删除原稿。

画布可发送 `{channel:'special-study',type:'request-records'}` 打开宿主记录页。未提供 evidence 能力的宿主中活动仍应可操作，但不能假装已保存或完成自动评价。

## 记录和交付

“本次记录”展示首次作品和后续修改、帮助情况、逐条件结果或待人工复核说明。没有综合分、通过率或掌握诊断。辨析页的数据不自动冒充构造记录。

学生或家长可主动点击“保存本次记录”下载独立 HTML：可读内容之外，包含一份 `interactive-topic-lesson.record.v1` 的 JSON 快照，供后续复核；其中的 artifactSha256 关联原课件版本。它不是作者工程，不需要家长编辑 JSON。

记录在当前页面内存中；刷新、关闭或重开链接会清空，下载的文件则保留在用户设备。播放器不自动上传、写服务器或长期跟踪学生。不要采集姓名、账号等无关身份信息。需要跨设备、持久存储或正式 Activity/Attempt 时由宿主另行集成并验证；本地结果不是权威学习档案。

完整可运行例子见仓库 `examples/mean-evidence/lesson.source.json` 与同目录 canvas.html。它使用连续工作台、两个构造目标和开放解释，没有 content.test；可以据其消息接线方式实现其他教学形式，不要把它复制成全学科模板。
