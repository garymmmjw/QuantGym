# QuantGym UI Reference Archive

这个目录保存用户提供过的 UI、品牌、吉祥物和模块插图参考图。它们用于后续设计迭代、重新切片、生成 WebP 资产或做 image-to-UI 对照，不直接作为线上 UI 依赖。

## 目录

```text
docs/ui-reference/
  2026-05-22-10-brand-direction/
  2026-05-22-11-mascot-rewards/
  2026-05-22-19-module-radar/
```

## 2026-05-22-10-brand-direction

第一轮品牌方向和白色高级感 UI 参考。

- `rewards-icons-sheet.png`: 奖励、XP、streak、奖牌、增长等图标方向。
- `mascot-pose-sheet.png`: 小鲨鱼多姿态参考。
- `challenges-streak-ui.png`: Challenges / streak 页面方向。
- `dashboard-ui.png`: Dashboard 页面方向。
- `mascot-closeup.png`: 小鲨鱼近景形象参考。

## 2026-05-22-11-mascot-rewards

更新后的 QuantGym logo、徽章、功能卡和透明素材方向参考。

- `badge-level-streak-sheet.png`: level、streak、gold/silver/bronze、XP、top rank 徽章合集。
- `feature-card-sheet.png`: Learn / Practice / Quest / Notebook 功能入口参考。
- `brand-q-mark.png`: Q mark 参考。
- `brand-wordmark.png`: QuantGym wordmark 参考。
- `mascot-teacher-chart.png`: 讲解/教学小鲨鱼。
- `mascot-trophy.png`: 拿奖杯小鲨鱼。
- `mascot-fire.png`: streak/fire 小鲨鱼。
- `mascot-calculator.png`: 计算器/思考小鲨鱼。
- `mascot-wave.png`: 挥手小鲨鱼。
- `mascot-laptop.png`: 笔记本电脑小鲨鱼。

## 2026-05-22-19-module-radar

后续模块插图和新版雷达图参考。

- `radar-glow-reference.png`: 发光雷达图视觉参考。
- `mascot-radar-reference.png`: 小鲨鱼 + 雷达图构图参考。
- `jobs-module-reference.png`: 求职模块插图参考。
- `resume-module-reference.png`: 简历模块插图参考。
- `network-module-reference.png`: 人脉/圈子模块插图参考。
- `news-module-reference.png`: 新闻模块插图参考。
- `pk-module-reference.png`: PK 模块插图参考。
- `interview-module-reference.png`: 模拟面试模块插图参考。
- `problem-bank-reference.png`: 题库模块插图参考。
- `community-module-reference.png`: 社区模块插图参考。
- `dashboard-analytics-reference.png`: Dashboard / analytics 插图参考。

## 使用注意

- 当前归档的 PNG 大多没有 alpha 通道，棋盘格背景是图片内容的一部分。需要接入产品 UI 时，优先重新抠图、转透明 WebP，或仅作为构图/风格参考。
- 已经接入页面的正式素材在 `assets/generated/`，不要从本目录直接引用到生产 UI。
- 2026-05-22 02:13 的早期 UI 参考图和两个系统临时截图目前不在可读路径中，可能已被系统清理；如果后续找回，可以补到 `2026-05-22-02-early-ui/`。
