# Poker Now 风格私人扑克房间功能实现文档

版本：v1.0
目标产品：浏览器内私人朋友局扑克房间
默认玩法：Texas Hold'em No-Limit Cash Game
默认性质：娱乐用 play money，不接入真钱、充值、提现、抽水或赌博结算
建议技术栈：Next.js + TypeScript + Tailwind CSS + FastAPI WebSocket 或 Node.js Socket.IO + PostgreSQL + Redis

---

## 1. 产品目标

本项目目标是实现一个类似 Poker Now 的私人扑克房间体验，但视觉、品牌、图标、配色、文案和交互细节需要保持自有设计，避免直接复制原产品。

核心目标：

1. 用户可以不下载软件，直接在浏览器中创建私人牌桌。
2. 用户可以通过邀请链接加入房间。
3. 房间支持 2 到 10 名玩家进行 Texas Hold'em。
4. 游戏由服务端统一管理发牌、下注、推进轮次、结算和日志。
5. 页面提供实时同步体验，包括座位状态、筹码、下注动作、公共牌、底池、聊天和玩家连接状态。
6. 房主可以控制桌子设置、开始或暂停游戏、管理玩家和导出 session 数据。
7. 所有筹码仅为 play money，没有现实货币价值。

---

## 2. 产品边界

### 2.1 本期必须实现

本期实现私人朋友局 Cash Game，不实现真钱交易，不实现公开大厅，不实现随机匹配。

必须包含：

1. 创建房间
2. 通过链接加入房间
3. 设置昵称
4. 入座和离座
5. 2 到 10 人桌
6. Texas Hold'em 基础流程
7. 小盲、大盲、按钮位
8. Preflop、Flop、Turn、River、Showdown
9. Fold、Check、Call、Bet、Raise、All-in
10. 主池和边池
11. 自动判断牌型和赢家
12. 聊天
13. 房主控制
14. 游戏暂停
15. 下一手开始控制
16. Hand history
17. Session ledger
18. 断线重连
19. 旁观者模式
20. 基础响应式布局

### 2.2 本期不做

1. 真钱充值和提现
2. 平台抽水
3. KYC
4. 公开匹配大厅
5. 复杂锦标赛
6. 多桌锦标赛
7. Omaha、PLO8、Short Deck 等变体
8. AI 机器人玩家
9. 语音和视频，除非作为后续版本
10. 移动 App 原生端

### 2.3 后续可扩展

1. Club 系统
2. 语音和视频聊天
3. 多桌锦标赛
4. 自动升盲
5. Bomb Pot
6. Run It Twice
7. Straddle
8. Ante
9. Double Board
10. Rabbit Hunting
11. Hand replay
12. 数据分析和玩家统计
13. Discord Bot
14. 自定义头像、桌布、卡背

---

## 3. 用户角色

### 3.1 未入房用户 Guest

行为：

1. 打开首页
2. 输入昵称
3. 创建新房间
4. 输入邀请链接进入已有房间

权限：

1. 无牌局控制权
2. 不能查看房间内部信息

### 3.2 玩家 Player

行为：

1. 加入房间
2. 选择座位
3. 参与手牌
4. 执行下注动作
5. 聊天
6. 离座
7. 重新买入
8. 查看自己的手牌
9. 查看公共牌、底池、行动顺序、历史记录

权限：

1. 只能看到自己的 hole cards
2. 不能控制其他玩家
3. 不能修改房间设置，除非是房主

### 3.3 房主 Host

房主通常是创建房间的人。

行为：

1. 修改桌子设置
2. 开始游戏
3. 暂停游戏
4. 恢复游戏
5. 控制下一手开始
6. 踢出玩家
7. 给玩家调整筹码
8. 允许或拒绝玩家加入
9. 开启或关闭旁观者
10. 下载 session log
11. 结束 session

权限：

1. 拥有完整管理权
2. 不能作弊看其他玩家手牌
3. 不应该直接修改当前手牌中的牌序或结果

### 3.4 旁观者 Spectator

行为：

1. 通过链接进入房间
2. 不入座，只观看牌桌
3. 可聊天，是否允许由房主设置
4. 可查看公开信息

权限：

1. 默认不能看玩家手牌
2. 如果房主打开 face-up spectator mode，则可在手牌结束后查看摊牌信息
3. 不能下注
4. 不能影响游戏状态

---

## 4. 核心用户流程

## 4.1 创建房间流程

页面：`/`

流程：

1. 用户打开首页。
2. 页面显示输入框：Your Nickname。
3. 用户输入昵称。
4. 用户点击 Create Private Table。
5. 前端请求后端创建房间。
6. 后端生成 `room_id` 和 `host_token`。
7. 用户跳转到 `/table/{room_id}`。
8. 前端保存 `player_token` 和 `host_token` 到 localStorage 或 httpOnly cookie。
9. 页面显示邀请链接。
10. 房主可以复制链接给朋友。

验收标准：

1. 不登录也可以创建房间。
2. 每个房间有唯一短链接。
3. 房主刷新页面后仍然是房主。
4. 创建失败时显示错误提示。
5. 昵称为空时不允许创建。

---

## 4.2 加入房间流程

页面：`/table/{room_id}`

流程：

1. 用户打开邀请链接。
2. 如果本地没有 player_token，显示昵称输入弹窗。
3. 用户输入昵称。
4. 前端请求加入房间。
5. 后端创建 player 记录。
6. 用户进入牌桌，默认是旁观状态。
7. 用户点击空座位入座。
8. 如果游戏未开始，用户可以等待下一手。
9. 如果当前手牌已经开始，用户进入 waiting 状态，从下一手开始参与。

验收标准：

1. 通过链接可进入。
2. 同一用户刷新页面不会重复创建玩家。
3. 昵称重复时自动加后缀或提示修改。
4. 房间不存在时显示 Not Found。
5. 房间满员时只能旁观。
6. 房主关闭旁观时，非玩家不能进入房间内部。

---

## 4.3 入座流程

流程：

1. 用户点击空座位。
2. 前端发送 `seat.take` 事件。
3. 后端检查座位是否为空。
4. 后端检查玩家是否已经坐在其他座位。
5. 后端设置 `seat_number`。
6. 后端设置玩家初始筹码。
7. 广播新的 table state。

验收标准：

1. 一个玩家只能占一个座位。
2. 一个座位只能有一个玩家。
3. 当前手进行中入座的玩家不加入当前手。
4. 当前手结束后，waiting 玩家可以进入下一手。
5. 玩家离座后座位释放。

---

## 4.4 开始游戏流程

仅房主可操作。

前置条件：

1. 至少 2 名 active seated players。
2. 每名玩家 stack 大于 0。
3. 游戏没有处于当前手进行中。

流程：

1. 房主点击 Start Game。
2. 后端创建新的 hand。
3. 确定 dealer button。
4. 确定 small blind 和 big blind。
5. 服务端洗牌。
6. 服务端给每位 active 玩家发两张 hole cards。
7. 服务端收取 blinds。
8. 游戏进入 preflop。
9. 设置第一个行动玩家。
10. 广播 table state，私人手牌只发给对应玩家。

验收标准：

1. 服务端决定所有牌。
2. 客户端不能传入牌。
3. 不同玩家只能收到自己的手牌。
4. 每手牌都有唯一 hand_id。
5. 盲注正确扣除。
6. 按钮位每手顺时针移动。

---

## 4.5 玩家行动流程

玩家可用动作由服务端根据当前状态计算。

可能动作：

1. Fold
2. Check
3. Call
4. Bet
5. Raise
6. All-in

流程：

1. 当前行动玩家看到 action panel。
2. 前端展示合法动作。
3. 用户点击动作。
4. 前端发送 action 请求。
5. 后端校验是否轮到该玩家。
6. 后端校验金额是否合法。
7. 后端更新玩家筹码、当前下注、底池状态。
8. 后端判断是否进入下一位玩家或下一轮。
9. 广播新的 table state。
10. 记录 hand log。

验收标准：

1. 不是当前行动玩家不能行动。
2. 已 fold 玩家不能行动。
3. all-in 玩家不能继续行动。
4. raise 金额不能低于最小加注。
5. check 只在无需 call 时可用。
6. call 金额不能超过玩家 stack，stack 不足时自动 all-in。
7. 所有动作必须记录在 hand log。

---

## 4.6 街道推进流程

Texas Hold'em 街道：

1. Preflop
2. Flop
3. Turn
4. River
5. Showdown

每一轮下注结束条件：

1. 所有未 fold 且未 all-in 的玩家都已行动。
2. 所有未 fold 且未 all-in 的玩家当前下注额相等。
3. 或只剩一名未 fold 玩家。

推进规则：

1. Preflop 结束后发 Flop 三张公共牌。
2. Flop 结束后发 Turn 一张公共牌。
3. Turn 结束后发 River 一张公共牌。
4. River 结束后进入 Showdown。
5. 如果任意阶段只剩一名玩家未 fold，立即结算，该玩家赢得底池。

验收标准：

1. 每条街只发正确数量的公共牌。
2. 每条街开始时重置本轮下注额。
3. 每条街第一个行动玩家是按钮左侧第一个仍在局内且未 all-in 的玩家。
4. heads-up 规则正确，小盲是 button，preflop button 先行动，flop 后 big blind 先行动。
5. 所有街道状态同步到前端。

---

## 4.7 Showdown 结算流程

流程：

1. 进入 showdown。
2. 服务端对所有未 fold 玩家进行牌力评估。
3. 根据主池和边池分别确定有资格争夺的玩家。
4. 对每个 pot 找出赢家。
5. 如多名赢家同牌力，平分该 pot。
6. 奇数筹码按照规则给靠近 button 左侧的赢家，或使用固定 seat order。
7. 更新玩家 stack。
8. 展示赢家和牌型。
9. 写入 hand history。
10. 进入 waiting_next_hand 状态。

验收标准：

1. 能正确识别所有牌型。
2. 边池分配正确。
3. fold 玩家不能赢得任何 pot。
4. all-in 玩家只能赢得自己有资格争夺的 pot。
5. 平分 pot 时总筹码守恒。
6. 每手结束后所有玩家 stack 总和不变，除非房主进行 rebuy 或 cash out。

---

## 5. 页面和 UI 结构

## 5.1 首页

路径：`/`

组件：

1. Logo 区域
2. 产品一句话介绍
3. Nickname 输入框
4. Create Private Table 按钮
5. Join by Link 或 Enter Room Code
6. Demo 入口，可选
7. Footer

字段：

1. nickname
2. room_code，可选

交互：

1. 输入昵称后可创建房间。
2. 未输入昵称时按钮 disabled。
3. 创建中显示 loading。
4. 创建失败显示 toast。

---

## 5.2 牌桌页面

路径：`/table/{room_id}`

主区域：

1. 顶部栏 TopBar
2. 牌桌区 PokerTable
3. 玩家座位 PlayerSeats
4. 公共牌 CommunityCards
5. 底池 PotDisplay
6. 自己手牌 MyHoleCards
7. 行动按钮 ActionPanel
8. 右侧边栏 RightPanel
9. 设置弹窗 SettingsModal
10. 邀请弹窗 InviteModal

布局建议：

1. 桌子居中，椭圆形。
2. 2 到 10 个座位沿椭圆分布。
3. 当前行动玩家座位高亮。
4. 当前玩家自己的座位固定在底部或允许切换视角。
5. 小屏幕时右侧边栏折叠到底部 drawer。
6. 操作按钮始终固定在底部，避免用户找不到行动入口。

---

## 5.3 顶部栏 TopBar

显示：

1. 房间名
2. Blinds
3. Hand number
4. 当前游戏状态
5. 连接状态
6. Invite 按钮
7. Settings 按钮
8. Leave 按钮

房主额外显示：

1. Start Game
2. Pause
3. Resume
4. End Session

状态文案：

1. Waiting for players
2. Waiting to start
3. Preflop
4. Flop
5. Turn
6. River
7. Showdown
8. Paused
9. Waiting for next hand

---

## 5.4 玩家座位 PlayerSeat

每个座位显示：

1. 头像或昵称首字母
2. 昵称
3. Stack
4. 当前下注额
5. 玩家状态
6. Dealer button 标记
7. Small blind 标记
8. Big blind 标记
9. 当前行动倒计时
10. 连接状态
11. 手牌背面或摊牌手牌

玩家状态：

1. Empty
2. Seated
3. Waiting
4. In Hand
5. Folded
6. All-in
7. Sitting Out
8. Disconnected

交互：

1. 空座位：点击入座。
2. 自己座位：点击可打开个人菜单。
3. 房主点击他人座位：打开管理菜单。
4. 摊牌时显示对应玩家手牌和牌型。

---

## 5.5 公共牌 CommunityCards

显示：

1. Flop 三张
2. Turn 一张
3. River 一张

交互：

1. 未发出的牌用占位卡槽。
2. 发牌时可有翻牌动画。
3. Showdown 时可高亮组成最佳牌的公共牌。

---

## 5.6 自己手牌 MyHoleCards

显示：

1. 两张自己的 hole cards。
2. 如果未参与当前手，显示 Waiting for next hand。
3. 如果已 fold，可显示灰色手牌背面或隐藏。

规则：

1. 只有当前玩家本人能看到自己的 hole cards。
2. 其他玩家只能看到牌背。
3. 断线重连后仍可恢复自己的手牌。

---

## 5.7 行动面板 ActionPanel

显示条件：

1. 游戏进行中。
2. 当前用户是当前行动玩家。
3. 当前用户未 fold。
4. 当前用户未 all-in。
5. 游戏未暂停。

按钮：

1. Fold
2. Check
3. Call amount
4. Bet amount
5. Raise to amount
6. All-in

输入：

1. bet slider
2. amount input
3. quick buttons：1/2 pot、2/3 pot、pot、all-in
4. min raise 提示
5. 当前可操作时间倒计时

验收标准：

1. 非法按钮不显示或 disabled。
2. 金额输入超出范围时提示。
3. 点击按钮后立即 optimistic feedback，但最终以后端状态为准。
4. 网络慢时按钮进入 loading，避免重复提交。

---

## 5.8 右侧边栏 RightPanel

Tabs：

1. Chat
2. Hand History
3. Players
4. Ledger
5. Settings，房主可见

### Chat

功能：

1. 发送文字消息。
2. 显示系统消息。
3. 显示玩家行动摘要，可选。
4. 支持 emoji，可选。
5. 房主可以清空聊天，可选。

系统消息例子：

1. Gary joined the room.
2. Gary took seat 3.
3. Hand #12 started.
4. Gary folded.
5. Jiawei wins 320 with a flush.

### Hand History

显示：

1. hand_id
2. start_time
3. blinds
4. button seat
5. 玩家初始 stack
6. 所有动作
7. 公共牌
8. showdown 手牌
9. winner
10. pot 分配

操作：

1. 点击展开单手牌。
2. 复制手牌记录。
3. 导出 session log。

### Players

显示：

1. 当前房间所有玩家
2. 是否入座
3. 当前 stack
4. 是否在线
5. 是否 sitting out

房主操作：

1. Kick
2. Adjust stack
3. Mark sitting out
4. Restore player
5. Transfer host，可选

### Ledger

功能：

1. 记录每个玩家 buy-in。
2. 记录 cash out。
3. 记录当前 stack。
4. 计算净输赢。
5. 支持导出 CSV。

字段：

1. player_name
2. total_buy_in
3. total_cash_out
4. current_stack
5. net_result

公式：

```text
net_result = current_stack + total_cash_out - total_buy_in
```

---

## 6. 房间设置

房主可配置：

### 6.1 基础设置

1. room_name
2. max_players，默认 10
3. starting_stack，默认 1000
4. small_blind，默认 5
5. big_blind，默认 10
6. ante，默认 0
7. decision_time_limit，默认 30 秒
8. time_bank，默认 0 或 60 秒
9. allow_spectators，默认 true
10. spectator_chat，默认 true
11. require_host_approval，默认 false
12. auto_start_next_hand，默认 false
13. next_hand_delay_seconds，默认 5

### 6.2 玩法设置

1. no_limit_holdem，默认开启
2. live_straddle，后续版本
3. bomb_pot，后续版本
4. run_it_twice，后续版本
5. rabbit_hunting，后续版本
6. seven_two_bounty，后续版本
7. double_board，后续版本

### 6.3 管理设置

1. 房主是否可以调整 stack
2. 是否允许玩家自行 rebuy
3. 最小 rebuy
4. 最大 rebuy
5. 是否自动 sit out 断线玩家
6. 断线宽限时间
7. 是否隐藏 hand history 中未摊牌手牌

---

## 7. 游戏规则详细说明

## 7.1 桌子人数

支持 2 到 10 名玩家。

active player 定义：

1. 已入座
2. stack > 0
3. not sitting out
4. not disconnected over grace period
5. 当前手开始时在桌上

---

## 7.2 按钮位和盲注

普通多人局：

1. button 每手顺时针移动到下一个 active player。
2. small blind 是 button 左侧第一个 active player。
3. big blind 是 small blind 左侧第一个 active player。
4. preflop 第一个行动者是 big blind 左侧第一个 active player。
5. flop 后第一个行动者是 button 左侧第一个 active player。

Heads-up：

1. button 同时是 small blind。
2. 非 button 是 big blind。
3. preflop button 先行动。
4. flop 后 big blind 先行动。

---

## 7.3 发牌规则

1. 使用标准 52 张牌。
2. 每手开始时服务端生成并洗牌。
3. 按座位顺序从 small blind 开始，每人一张，发两轮。
4. 每位玩家获得 2 张 hole cards。
5. 公共牌依次发 flop 三张、turn 一张、river 一张。

说明：

1. 不需要实现 burn card，除非为了模拟线下规则。
2. 如果实现 burn card，burn card 只能存在于服务端日志，默认不展示。

---

## 7.4 下注规则

No-Limit Hold'em：

1. 玩家可下注任意合法金额，最多到自己的全部 stack。
2. Call 金额为当前最高下注减去该玩家本轮已下注。
3. Raise to 必须至少达到最小加注额。
4. 最小加注额通常等于上一轮有效 raise 的增量。
5. 第一次 bet 的最小金额等于 big blind。
6. stack 不足以 call 时，玩家可以 all-in。
7. all-in 金额不足以构成完整 raise 时，不重新打开其他玩家行动权，除非规则设置允许。

---

## 7.5 All-in 和边池

当玩家 all-in 且金额不同，需要创建 side pots。

算法原则：

1. 收集所有参与 pot 的玩家贡献额。
2. 按贡献额从小到大分层。
3. 每一层形成一个 pot。
4. 每个 pot 的 eligible players 是贡献至少达到该层金额且未 fold 的玩家。
5. fold 玩家贡献的筹码留在 pot 中，但没有资格赢得 pot。
6. 每个 pot 独立结算。

例子：

玩家 A all-in 100
玩家 B all-in 300
玩家 C call 300

pot 分层：

1. Main pot：100 × 3 = 300，A、B、C 都有资格。
2. Side pot：200 × 2 = 400，B、C 有资格。
3. A 最多只能赢 main pot。

---

## 7.6 摊牌牌型

从高到低：

1. Royal Flush
2. Straight Flush
3. Four of a Kind
4. Full House
5. Flush
6. Straight
7. Three of a Kind
8. Two Pair
9. One Pair
10. High Card

实现要求：

1. 每个玩家从 7 张牌中选择最佳 5 张牌。
2. 使用稳定的 hand evaluator。
3. 比较时包含 kicker。
4. A 可以作为最大，也可以在 A-2-3-4-5 中作为最小。
5. 平局时拆分 pot。

建议：

1. 后端使用成熟牌型评估库。
2. 如果自写 evaluator，必须做大量单元测试。
3. 不要在前端判断赢家。

---

## 8. 实时通信设计

实时状态建议使用 WebSocket。服务端是唯一状态源。

## 8.1 连接流程

1. 客户端打开 `/table/{room_id}`。
2. 客户端使用 token 连接 WebSocket。
3. 服务端验证 room_id 和 player_token。
4. 服务端返回 snapshot。
5. 客户端订阅 room channel。
6. 后端每次状态变更都广播 patch 或完整 state。

---

## 8.2 WebSocket 事件

### client.room.join

用途：加入房间。

payload：

```json
{
  "roomId": "abc123",
  "nickname": "Gary",
  "playerToken": "optional-existing-token"
}
```

response：

```json
{
  "type": "server.room.joined",
  "roomId": "abc123",
  "playerId": "p_001",
  "playerToken": "secure-token",
  "isHost": true
}
```

---

### client.seat.take

用途：入座。

payload：

```json
{
  "roomId": "abc123",
  "seatNumber": 3,
  "buyIn": 1000
}
```

校验：

1. seatNumber 在 1 到 max_players 内。
2. 座位为空。
3. 玩家未占其他座。
4. buyIn 合法。

---

### client.seat.leave

用途：离座。

payload：

```json
{
  "roomId": "abc123"
}
```

规则：

1. 如果当前玩家不在手牌中，立即离座。
2. 如果当前玩家在手牌中，默认下一手离座。
3. 如果玩家强制离座，当前手按 fold 处理，是否允许由设置决定。

---

### client.game.start

用途：房主开始游戏。

payload：

```json
{
  "roomId": "abc123"
}
```

校验：

1. 发送者必须是 host。
2. 当前没有 hand 进行中。
3. 至少 2 名 active players。

---

### client.game.pause

用途：暂停游戏。

payload：

```json
{
  "roomId": "abc123"
}
```

规则：

1. 只有 host 可操作。
2. 暂停后倒计时停止。
3. 玩家不能执行行动。
4. 聊天仍可用。

---

### client.game.resume

用途：恢复游戏。

payload：

```json
{
  "roomId": "abc123"
}
```

规则：

1. 只有 host 可操作。
2. 恢复后从暂停前行动玩家继续。

---

### client.action.submit

用途：提交玩家动作。

payload：

```json
{
  "roomId": "abc123",
  "handId": "h_1001",
  "action": "RAISE",
  "amount": 120,
  "clientActionId": "uuid"
}
```

action 枚举：

1. FOLD
2. CHECK
3. CALL
4. BET
5. RAISE
6. ALL_IN

校验：

1. handId 必须匹配当前 hand。
2. 必须轮到该玩家。
3. action 必须在 legalActions 中。
4. amount 必须合法。
5. clientActionId 用于防止重复提交。

---

### client.chat.send

用途：发送聊天消息。

payload：

```json
{
  "roomId": "abc123",
  "message": "nice hand"
}
```

校验：

1. message 长度限制，例如 500 字符。
2. 防刷屏。
3. 房主可禁言玩家，后续版本。

---

### client.host.updateSettings

用途：房主更新设置。

payload：

```json
{
  "roomId": "abc123",
  "settings": {
    "smallBlind": 5,
    "bigBlind": 10,
    "decisionTimeLimit": 30,
    "allowSpectators": true
  }
}
```

规则：

1. 只有 host 可更新。
2. 部分设置只能在手牌之间更新。
3. 当前手进行中不允许修改 blinds、starting_stack、max_players。

---

### client.host.adjustStack

用途：房主调整玩家筹码。

payload：

```json
{
  "roomId": "abc123",
  "playerId": "p_002",
  "delta": 500,
  "reason": "rebuy"
}
```

规则：

1. 只有 host 可操作。
2. 当前手进行中，正在参与手牌的玩家 stack 不允许直接调整，除非作为 rebuy pending。
3. 所有调整进入 ledger。

---

### server.table.snapshot

用途：服务端发送完整牌桌状态。

payload 包含：

1. room
2. seats
3. players
4. currentHand
5. communityCards
6. pots
7. legalActions
8. chatRecent
9. ledger
10. currentUserPrivateCards

---

### server.table.updated

用途：广播状态更新。

payload：

```json
{
  "roomId": "abc123",
  "version": 1024,
  "patch": {}
}
```

要求：

1. 每个状态更新有递增 version。
2. 客户端发现 version 缺失时请求 snapshot。
3. 私人手牌不要广播给全房间。

---

### server.private.cards

用途：给特定玩家发送自己的手牌。

payload：

```json
{
  "handId": "h_1001",
  "cards": ["Ah", "Kd"]
}
```

规则：

1. 只发给对应 player socket。
2. 断线重连时可重新发送。
3. 服务端日志记录已发送，但不能公开。

---

## 9. 后端 REST API 设计

实时动作走 WebSocket，非实时资源可走 REST。

### POST /api/rooms

创建房间。

request：

```json
{
  "nickname": "Gary",
  "settings": {
    "smallBlind": 5,
    "bigBlind": 10,
    "startingStack": 1000
  }
}
```

response：

```json
{
  "roomId": "abc123",
  "roomUrl": "https://yourdomain.com/table/abc123",
  "playerToken": "xxx",
  "hostToken": "yyy"
}
```

---

### GET /api/rooms/{roomId}

获取房间基础信息。

response：

```json
{
  "roomId": "abc123",
  "roomName": "Gary's Table",
  "status": "WAITING",
  "maxPlayers": 10,
  "seatedCount": 4,
  "allowSpectators": true
}
```

---

### GET /api/rooms/{roomId}/history

获取 hand history。

query：

1. limit
2. cursor

response：

```json
{
  "hands": [],
  "nextCursor": "optional"
}
```

---

### GET /api/rooms/{roomId}/ledger

获取 session ledger。

response：

```json
{
  "players": [
    {
      "playerId": "p_001",
      "nickname": "Gary",
      "buyIn": 1000,
      "cashOut": 0,
      "currentStack": 1250,
      "net": 250
    }
  ]
}
```

---

### GET /api/rooms/{roomId}/export

导出 session 数据。

格式：

1. JSON
2. CSV
3. TXT hand log

---

## 10. 数据库设计

## 10.1 rooms

字段：

1. id
2. room_code
3. name
4. host_player_id
5. status
6. max_players
7. settings_json
8. created_at
9. updated_at
10. ended_at

status 枚举：

1. WAITING
2. ACTIVE
3. PAUSED
4. ENDED

---

## 10.2 players

字段：

1. id
2. room_id
3. nickname
4. token_hash
5. is_host
6. seat_number
7. stack
8. status
9. connected
10. last_seen_at
11. created_at

status 枚举：

1. SPECTATOR
2. SEATED
3. WAITING_NEXT_HAND
4. IN_HAND
5. FOLDED
6. ALL_IN
7. SITTING_OUT
8. LEFT

---

## 10.3 hands

字段：

1. id
2. room_id
3. hand_number
4. status
5. button_seat
6. small_blind_seat
7. big_blind_seat
8. deck_encrypted_or_server_only
9. community_cards_json
10. started_at
11. ended_at
12. result_json

status 枚举：

1. PREFLOP
2. FLOP
3. TURN
4. RIVER
5. SHOWDOWN
6. FINISHED
7. CANCELLED

---

## 10.4 hand_players

字段：

1. id
2. hand_id
3. player_id
4. seat_number
5. starting_stack
6. ending_stack
7. hole_cards_encrypted
8. current_bet
9. total_contribution
10. status
11. best_hand_rank
12. best_hand_cards_json

status 枚举：

1. ACTIVE
2. FOLDED
3. ALL_IN
4. WON
5. LOST

---

## 10.5 actions

字段：

1. id
2. hand_id
3. player_id
4. street
5. action_type
6. amount
7. resulting_stack
8. resulting_pot
9. created_at
10. client_action_id

action_type 枚举：

1. POST_SMALL_BLIND
2. POST_BIG_BLIND
3. ANTE
4. FOLD
5. CHECK
6. CALL
7. BET
8. RAISE
9. ALL_IN
10. WIN
11. RETURN_UNCALLED_BET

---

## 10.6 pots

字段：

1. id
2. hand_id
3. amount
4. eligible_player_ids_json
5. winner_player_ids_json
6. pot_type

pot_type：

1. MAIN
2. SIDE

---

## 10.7 chat_messages

字段：

1. id
2. room_id
3. player_id
4. message_type
5. content
6. created_at

message_type：

1. USER
2. SYSTEM
3. ACTION_SUMMARY

---

## 10.8 ledger_entries

字段：

1. id
2. room_id
3. player_id
4. type
5. amount
6. reason
7. created_by_player_id
8. created_at

type：

1. BUY_IN
2. REBUY
3. CASH_OUT
4. STACK_ADJUSTMENT
5. BONUS
6. PENALTY

---

## 11. Redis 实时状态设计

Redis 用于保存当前房间实时状态，PostgreSQL 保存持久化记录。

Key 设计：

1. `room:{roomId}:state`
2. `room:{roomId}:sockets`
3. `room:{roomId}:players`
4. `room:{roomId}:current_hand`
5. `room:{roomId}:lock`
6. `room:{roomId}:version`

注意：

1. 所有修改 hand state 的操作需要加分布式锁。
2. action submit 必须幂等。
3. 每次状态变化递增 version。
4. 定期将关键状态落库。
5. hand 结束必须完整落库。

---

## 12. 前端组件设计

### 12.1 页面组件

1. `HomePage`
2. `TablePage`
3. `JoinRoomModal`
4. `NicknameModal`
5. `InviteModal`
6. `SettingsModal`
7. `HostControlsModal`

### 12.2 牌桌组件

1. `PokerTable`
2. `SeatRing`
3. `PlayerSeat`
4. `CommunityCards`
5. `PotDisplay`
6. `DealerButton`
7. `BlindBadge`
8. `ActionTimer`
9. `Card`
10. `ChipStack`

### 12.3 操作组件

1. `ActionPanel`
2. `BetSlider`
3. `AmountInput`
4. `QuickBetButtons`
5. `LegalActionButton`
6. `AllInButton`

### 12.4 右侧栏组件

1. `RightPanel`
2. `ChatTab`
3. `HandHistoryTab`
4. `PlayersTab`
5. `LedgerTab`
6. `SettingsTab`

### 12.5 状态管理

建议：

1. Zustand 或 Redux Toolkit 管理 table state。
2. React Query 管理 REST 请求。
3. WebSocket service 单独封装。
4. 所有前端状态以后端 snapshot 为准。
5. optimistic UI 只能用于按钮 loading，不直接改筹码结算。

---

## 13. 服务端核心模块

### 13.1 RoomService

职责：

1. createRoom
2. joinRoom
3. leaveRoom
4. updateSettings
5. endRoom
6. validateRoomAccess
7. transferHost，可选

---

### 13.2 SeatService

职责：

1. takeSeat
2. leaveSeat
3. switchSeat
4. markSittingOut
5. restoreFromSittingOut
6. getActivePlayers

---

### 13.3 GameEngine

职责：

1. startHand
2. shuffleDeck
3. dealHoleCards
4. postBlinds
5. calculateLegalActions
6. submitAction
7. advanceTurn
8. advanceStreet
9. detectBettingRoundComplete
10. createPots
11. evaluateShowdown
12. distributePots
13. finishHand
14. prepareNextHand

要求：

1. GameEngine 不依赖前端。
2. GameEngine 可以被单元测试直接调用。
3. 输入是当前 hand state 和 action。
4. 输出是新的 hand state 和 events。
5. 不允许客户端决定任何游戏结果。

---

### 13.4 HandEvaluator

职责：

1. evaluateBestFiveCards
2. compareHands
3. rankHand
4. detectStraight
5. detectFlush
6. breakTieWithKickers

建议：

1. 可引入成熟库。
2. 如果自写，必须覆盖所有牌型和边界条件。

---

### 13.5 PotService

职责：

1. trackContributions
2. buildMainAndSidePots
3. calculateEligiblePlayers
4. splitPot
5. handleOddChip
6. returnUncalledBet

---

### 13.6 LedgerService

职责：

1. recordBuyIn
2. recordRebuy
3. recordCashOut
4. recordStackAdjustment
5. calculateNetResult
6. exportLedger

---

### 13.7 ChatService

职责：

1. sendUserMessage
2. sendSystemMessage
3. sanitizeMessage
4. rateLimitMessage
5. loadRecentMessages

---

### 13.8 RealtimeGateway

职责：

1. handleConnect
2. handleDisconnect
3. authenticateSocket
4. joinRoomChannel
5. emitSnapshot
6. broadcastTableUpdate
7. emitPrivateCards
8. handleActionSubmit
9. handleReconnect

---

## 14. 状态机

## 14.1 Room State

```text
WAITING -> ACTIVE -> PAUSED -> ACTIVE -> ENDED
```

说明：

1. WAITING：房间创建后，未开始。
2. ACTIVE：游戏进行中或等待下一手。
3. PAUSED：房主暂停。
4. ENDED：session 结束，不能再操作。

---

## 14.2 Hand State

```text
NOT_STARTED
-> PREFLOP
-> FLOP
-> TURN
-> RIVER
-> SHOWDOWN
-> FINISHED
```

特殊路径：

```text
PREFLOP/FLOP/TURN/RIVER
-> FINISHED
```

当只剩一个未 fold 玩家时，直接结束。

---

## 15. 断线重连

## 15.1 断线处理

流程：

1. socket disconnect。
2. 标记 player.connected = false。
3. 记录 last_seen_at。
4. 广播玩家 disconnected。
5. 如果当前轮到该玩家，倒计时继续或暂停，按设置决定。
6. 超过 grace period 后，自动 fold 或 sit out，按设置决定。

建议默认：

1. 当前手中断线，不立即 fold。
2. 保留 60 秒 grace period。
3. 超时后如果面对 bet，则 fold。
4. 超时后如果可 check，则 check。
5. 下一手自动 sitting out。

---

## 15.2 重连处理

流程：

1. 客户端使用本地 player_token 重新连接。
2. 服务端验证 token。
3. 恢复 playerId。
4. 标记 connected = true。
5. 发送完整 snapshot。
6. 如果玩家在当前手中，重新发送自己的 hole cards。
7. 广播玩家 reconnected。

验收标准：

1. 刷新页面不丢失身份。
2. 多个标签页打开同一玩家时，允许只保留最新 socket 或允许多设备同步。
3. 不会因为重连重复入座。
4. 不会因为重连重复发牌。

---

## 16. 安全和公平性

## 16.1 服务端权威

必须遵守：

1. 洗牌在服务端。
2. 发牌在服务端。
3. 下注校验在服务端。
4. 轮次推进在服务端。
5. 赢家判断在服务端。
6. 客户端不能传入牌、赢家或 pot 分配。
7. 客户端只能提交意图，例如 RAISE 120。

---

## 16.2 私人信息隔离

1. hole cards 只发给对应玩家。
2. 未摊牌且未公开的手牌不进入公共 payload。
3. spectators 默认不能看 hole cards。
4. hand history 默认隐藏 mucked cards。
5. 后端日志可以保存完整信息，但接口返回要脱敏。

---

## 16.3 随机性

建议：

1. 使用密码学安全随机数生成器。
2. 每手生成新的 deck。
3. 洗牌算法使用 Fisher-Yates。
4. 可保存 deck seed hash，用于后续审计。
5. 不要把完整 deck 发给客户端。

---

## 16.4 防重复提交

1. 每个 action 带 clientActionId。
2. 服务端保存最近 action id。
3. 重复 action 返回同一个结果。
4. 按钮点击后前端 disabled。
5. 服务端以当前 turn 和 hand version 校验。

---

## 16.5 基础风控

1. 限制房间创建频率。
2. 限制聊天频率。
3. 限制昵称长度。
4. 过滤恶意 HTML。
5. 所有输入做 sanitize。
6. WebSocket 鉴权。
7. 房主 token 不在 URL 中明文暴露。
8. 导出数据前验证 host 权限。

---

## 17. 合规边界

本项目应明确：

1. 只提供娱乐性质 play money。
2. 筹码没有现实货币价值。
3. 不提供充值。
4. 不提供提现。
5. 不提供玩家之间资金转账。
6. 不收取 rake。
7. 不组织真钱赌博。
8. 不承诺中奖或收益。
9. 不在产品内记录外部结算。
10. 如未来加入真钱或奖品，需要重新做法律合规、地区限制、年龄验证和支付合规。

建议页面 footer 加一句：

```text
This product is for entertainment with play money only. Chips have no monetary value.
```

---

## 18. 可选高级功能

## 18.1 Spectator Mode

功能：

1. 用户不入座也可观看。
2. 房主可开启或关闭旁观。
3. 房主可允许或禁止旁观者聊天。
4. 默认旁观者不能看手牌。
5. 可选 face-up mode：手牌结束后展示所有仍在 showdown 的手牌。

---

## 18.2 Session Ledger

功能：

1. 记录 buy-in。
2. 记录 rebuy。
3. 记录 cash out。
4. 当前 stack 实时更新。
5. 计算 net。
6. 支持导出 CSV。

注意：

1. 不处理真实付款。
2. 不显示支付二维码。
3. 只是记录 play money session。

---

## 18.3 Hand Replay

功能：

1. 用户点击历史手牌。
2. 按时间顺序回放动作。
3. 显示每一步 pot、下注额、公共牌。
4. Showdown 时展示赢家。

本期可以只做 textual replay，后续再做动画 replay。

---

## 18.4 Time Bank

功能：

1. 每位玩家每局有额外思考时间。
2. 普通倒计时结束后自动使用 time bank。
3. time bank 用完后执行默认动作。
4. 面对 bet 默认 fold。
5. 无需 call 时默认 check。

---

## 18.5 Auto Next Hand

功能：

1. 手牌结束后自动倒计时开始下一手。
2. 房主可设置延迟秒数。
3. 如果关闭，则需要房主手动点击 Start Next Hand。

---

## 18.6 Straddle，后续版本

功能：

1. 允许 UTG straddle。
2. straddle 金额通常为 2 倍 big blind。
3. straddle 后 preflop 行动顺序调整。
4. 需要在发牌前或特定时机确认。

---

## 18.7 Run It Twice，后续版本

功能：

1. 只在所有剩余玩家 all-in 后触发。
2. 玩家同意后，后续公共牌发两次。
3. pot 分为两份分别结算。
4. 需要处理多玩家 all-in 场景。

---

## 18.8 Club 系统，后续版本

Club 目标：

1. 创建长期私人社群。
2. 管理成员。
3. 管理多张桌。
4. 统计成员战绩。
5. 保存长期 ledger。

Club 页面：

1. Club Home
2. Members
3. Tables
4. Sessions
5. Leaderboard
6. Club Settings

Club 数据：

1. club_id
2. owner_id
3. members
4. roles
5. tables
6. sessions
7. stats

---

## 19. 错误处理

常见错误：

1. ROOM_NOT_FOUND
2. ROOM_FULL
3. INVALID_TOKEN
4. NOT_HOST
5. SEAT_TAKEN
6. PLAYER_ALREADY_SEATED
7. GAME_ALREADY_STARTED
8. NOT_ENOUGH_PLAYERS
9. NOT_YOUR_TURN
10. INVALID_ACTION
11. INVALID_BET_AMOUNT
12. HAND_VERSION_CONFLICT
13. ROOM_ENDED
14. RATE_LIMITED

前端展示原则：

1. 用户能理解原因。
2. 不暴露服务端内部错误。
3. 操作失败后自动拉取最新 snapshot。
4. 关键错误用 toast。
5. 严重错误用 modal。

---

## 20. 测试清单

## 20.1 单元测试

GameEngine：

1. 2 人局按钮和盲注。
2. 3 到 10 人局按钮和盲注。
3. fold 后行动顺序。
4. all-in 后行动顺序。
5. preflop 到 flop 推进。
6. flop 到 turn 推进。
7. turn 到 river 推进。
8. river 到 showdown 推进。
9. 只剩一人时立即结算。
10. 最小 raise 规则。
11. all-in 不足额 raise。
12. main pot。
13. side pot。
14. 多边池。
15. 平分 pot。
16. 奇数筹码。
17. 手牌牌型判断。
18. kicker 比较。
19. A2345 straight。
20. flush 比较。
21. full house 比较。

RoomService：

1. 创建房间。
2. 加入房间。
3. 重复昵称。
4. host 权限。
5. 房间结束。

SeatService：

1. 入座。
2. 离座。
3. 座位已占。
4. 重复入座。
5. sitting out。

Realtime：

1. 连接。
2. 断线。
3. 重连。
4. 私人手牌只发送给本人。
5. action 幂等。

---

## 20.2 集成测试

场景：

1. 两名玩家完整打一手到 showdown。
2. 三名玩家，一人 fold，二人 showdown。
3. 三名玩家 all-in，产生边池。
4. 房主暂停后恢复。
5. 玩家断线后重连。
6. 当前行动玩家刷新页面后继续行动。
7. 房主调整设置后下一手生效。
8. 房间满员后新用户只能旁观。
9. 房主导出 session。
10. 用户离座后下一手不参与。

---

## 20.3 前端测试

1. 首页创建房间。
2. 邀请链接加入。
3. 空座位点击入座。
4. 行动按钮显示合法动作。
5. 非当前行动玩家不显示 action panel。
6. 聊天发送和接收。
7. hand history 展开。
8. settings modal 校验。
9. 小屏幕布局。
10. 重连后状态恢复。

---

## 21. UI 风格建议

为了避免直接复制 Poker Now，建议使用自己的视觉语言。

方向一：现代 dark poker room

1. 深色背景
2. 半透明玻璃面板
3. 柔和高光
4. 圆角卡片
5. 动态筹码
6. 清晰行动按钮

方向二：QuantGym 风格娱乐化

1. 鲨鱼 mascot
2. 游戏化徽章
3. 卡片式面板
4. 轻量成就
5. 更年轻的 UI 语言

方向三：Discord room 风格

1. 左侧房间信息
2. 中间牌桌
3. 右侧聊天
4. 成员在线状态
5. 简洁、社交感强

必须避免：

1. 复制 Poker Now logo。
2. 复制 Poker Now 原始配色。
3. 复制完整页面布局。
4. 复制专有文案。
5. 复制图标和动画素材。

---

## 22. 开发里程碑

## 22.1 Milestone 1：静态 UI 原型

目标：

1. 首页
2. 牌桌页面
3. 10 人座位布局
4. 手牌、公共牌、pot、action panel
5. 右侧 chat/history/ledger panel

验收：

1. 无后端也能展示 mock table。
2. 桌子布局在桌面端美观。
3. 小屏幕能基本使用。

---

## 22.2 Milestone 2：房间和 WebSocket

目标：

1. 创建房间
2. 加入房间
3. 入座
4. 离座
5. 在线状态
6. 实时广播

验收：

1. 多浏览器打开同一链接能看到同一桌。
2. 一个用户入座后其他用户实时看到。
3. 刷新后身份恢复。

---

## 22.3 Milestone 3：完整 Texas Hold'em 引擎

目标：

1. 发牌
2. 盲注
3. 行动顺序
4. 合法动作
5. 街道推进
6. showdown
7. pot 结算

验收：

1. 2 到 10 人可以完整打一手。
2. 所有筹码结算正确。
3. 单元测试覆盖主要规则。

---

## 22.4 Milestone 4：房主管理和日志

目标：

1. 设置面板
2. 暂停和恢复
3. 下一手控制
4. stack adjustment
5. hand history
6. ledger
7. export

验收：

1. 房主能完整管理一场 session。
2. 普通玩家无法执行 host 操作。
3. 导出的记录可读。

---

## 22.5 Milestone 5：稳定性和体验优化

目标：

1. 断线重连
2. action 幂等
3. 防重复提交
4. 移动端适配
5. 动画优化
6. 错误提示
7. 基础安全

验收：

1. 刷新页面不破坏手牌。
2. 网络波动后能恢复。
3. 所有非法动作被服务端拒绝。

---

## 23. MVP 最小实现优先级

如果开发时间有限，优先级如下：

P0，必须做：

1. 创建房间
2. 加入房间
3. 入座
4. WebSocket 同步
5. Texas Hold'em 基础流程
6. Fold、Check、Call、Bet、Raise、All-in
7. Showdown 和 pot 结算
8. 房主开始下一手
9. 聊天
10. 断线重连

P1，强烈建议：

1. 房主设置
2. 暂停和恢复
3. Hand history
4. Ledger
5. 旁观者
6. 时间倒计时
7. 响应式布局

P2，后续优化：

1. Time bank
2. Hand replay
3. 自定义头像
4. Straddle
5. Ante
6. Run It Twice
7. Club
8. 语音和视频

---

## 24. 给 AI 编程工具的开发提示词

你可以把下面这段直接交给 Cursor、Codex 或其他 AI 编程工具：

```text
Build a browser-based private poker room application inspired by Poker Now, but with original branding and UI. The product is play-money only and must not include real-money gambling, deposits, withdrawals, rake, or payment settlement.

Use Next.js, TypeScript, Tailwind CSS for frontend. Use FastAPI with WebSocket or Node.js with Socket.IO for backend. Use PostgreSQL for persistent data and Redis for realtime room state.

Implement a private Texas Hold'em No-Limit cash game MVP:
1. Create room without registration.
2. Join room by invite link.
3. Set nickname.
4. Take and leave seats.
5. Support 2 to 10 players.
6. Server-authoritative shuffle, deal, betting, street progression, showdown, pot and side-pot settlement.
7. Player actions: fold, check, call, bet, raise, all-in.
8. Host controls: start game, pause, resume, start next hand, update settings, adjust stack, kick player.
9. Realtime WebSocket table synchronization.
10. Private hole cards must only be sent to the corresponding player.
11. Chat, hand history, session ledger, and export.
12. Reconnect support using player tokens.
13. Do not let the client decide cards, winners, legal actions, or pot distribution.

Follow the implementation document section by section. Prioritize P0 features first, then P1, then P2.
```

---

## 25. 最终验收标准

产品达到可用状态需要满足：

1. 用户可以在 30 秒内创建房间并分享链接。
2. 朋友打开链接后可以输入昵称并加入。
3. 2 到 10 人可以入座。
4. 房主可以开始游戏。
5. 每位玩家只能看到自己的手牌。
6. 所有玩家实时看到公共牌、下注、pot、行动顺序。
7. 玩家可以完成所有合法 poker actions。
8. 服务端可以正确推进所有街道。
9. 服务端可以正确结算 main pot 和 side pot。
10. hand history 可以回看每手牌。
11. ledger 可以查看每个玩家 play money 输赢。
12. 刷新页面后玩家身份和手牌不会丢失。
13. 断线重连后能继续游戏。
14. 普通玩家不能使用 host 权限。
15. 产品明确声明 chips have no monetary value。
16. 视觉和品牌是自有设计，不直接复制 Poker Now。


---

# v2 增强补充：接近 Poker Now 完整产品的规则、功能和 UI 细化

本补充文档用于把 v1.0 的私人 Texas Hold'em MVP 扩展为更接近 Poker Now 的完整产品规格。

重要边界：

1. 本产品仍然定位为 play money 娱乐产品。
2. 不接入真钱充值、提现、抽水、奖池或外部支付结算。
3. 功能可以参考线上私人扑克房的产品逻辑，但品牌、视觉、文案、图标、动效和布局必须使用自有设计。
4. 所有游戏结果必须由服务端生成和判定。
5. 所有高级玩法必须可以由房主在手牌之间开启或关闭。
6. 涉及特殊玩法时，hand history 必须完整记录开启状态和结算逻辑。

---

## 26. 接近 Poker Now 的功能完整度目标

### 26.1 完整产品功能清单

为了接近 Poker Now 类产品，本项目应覆盖以下功能层级。

P0：基础可玩

1. 创建私人房间
2. 链接邀请
3. 昵称加入
4. 入座和离座
5. Texas Hold'em No-Limit
6. 服务端洗牌和发牌
7. 玩家行动
8. 主池和边池
9. Showdown 结算
10. 聊天
11. 房主开始下一手
12. 断线重连

P1：稳定朋友局

1. 暂停和恢复
2. 自定义 blinds
3. 自定义 starting stack
4. 自定义行动时间
5. Time Bank
6. Ante
7. Live Straddle
8. 旁观者模式
9. Hand history
10. Full session log download
11. Session ledger
12. 多设备登录
13. Sit out
14. Wait for big blind
15. Host approval
16. Player kick
17. Stack adjustment
18. 移动端适配

P2：增强玩法

1. Rabbit Hunting
2. Run It Twice
3. 7-2 Bounty
4. Bomb Pot
5. Double Board
6. NIT Game
7. Hand Replay
8. Save and tag hands
9. Player notes
10. Custom avatars
11. Custom table felt
12. Post-game statistics
13. Enhanced hand replayer with filters
14. AI-powered game analysis

P3：扩展牌种和社群

1. Pot Limit Omaha Hi
2. Pot Limit Omaha Hi/Lo 8 or Better
3. One-table tournament
4. Multi-table tournament
5. Sit & Go
6. Club system
7. Club member management
8. Club transaction log
9. Club tournaments
10. Discord bot integration

---

## 27. Texas Hold'em 规则边界补丁

本节补齐 v1.0 中没有完全展开的德州扑克规则。后端 GameEngine 必须按照这些规则执行。

---

## 27.1 Showdown 顺序

### 27.1.1 基本原则

进入 showdown 后，服务端需要确定亮牌顺序。

规则：

1. 如果 river 有下注或加注，则最后一个主动下注或加注的玩家 first to show。
2. 如果 river 没有下注，则从 button 左侧第一个仍在手牌中的玩家开始亮牌。
3. 如果所有玩家在 river 之前 all-in，则按照最后一个形成 all-in 对抗的 aggressor 先亮牌。
4. 如果没有 aggressor，则按座位顺序从 button 左侧开始。
5. 玩家亮牌动作只影响 UI 展示，不影响服务端已完成的赢家判定。

### 27.1.2 Showdown 状态

hand state 增加：

```text
SHOWDOWN_PENDING_REVEAL
SHOWDOWN_REVEALING
SHOWDOWN_FINISHED
```

字段：

```json
{
  "showdown": {
    "revealOrder": ["p_003", "p_005", "p_001"],
    "revealedPlayerIds": [],
    "muckedPlayerIds": [],
    "autoRevealAllIn": true,
    "allowMuckLosingHands": true
  }
}
```

### 27.1.3 验收标准

1. river 最后 aggressor 先亮牌。
2. 没有 river aggressor 时，从 button 左侧开始。
3. all-in showdown 可以自动亮牌。
4. 服务端赢家判断不依赖用户是否手动亮牌。
5. hand history 清楚记录每位玩家是 shown 还是 mucked。

---

## 27.2 Muck 规则

Muck 指玩家选择不公开自己的输牌手牌。

### 27.2.1 默认规则

1. 赢得 pot 的玩家必须 show cards。
2. 输牌玩家可以 muck。
3. 如果玩家 all-in 并进入 showdown，默认自动 show cards。
4. 如果房主开启 casual reveal mode，则所有 showdown 玩家自动亮牌。
5. mucked cards 默认不展示给其他玩家和旁观者。
6. host 也不能通过 UI 看到 mucked cards，除非后端导出的审计日志包含加密记录。

### 27.2.2 Hand history 记录

公开 hand history：

```json
{
  "playerId": "p_002",
  "showdownStatus": "MUCKED",
  "holeCards": null,
  "bestHand": null
}
```

私有审计日志：

```json
{
  "playerId": "p_002",
  "showdownStatus": "MUCKED",
  "holeCardsEncrypted": "encrypted-value"
}
```

### 27.2.3 UI 行为

1. 轮到某玩家展示时，显示 Show Cards 和 Muck 按钮。
2. 如果玩家明显赢得 pot，Muck 按钮 disabled。
3. 如果玩家超时，默认 muck losing hand。
4. 如果 all-in auto reveal 开启，直接展示该玩家手牌。
5. muck 后座位上显示 Mucked。

---

## 27.3 最小下注和最小加注规则

### 27.3.1 核心字段

每条街维护：

```json
{
  "street": "FLOP",
  "currentBet": 100,
  "lastFullRaiseAmount": 60,
  "minBet": 20,
  "minRaiseTo": 160,
  "lastAggressorPlayerId": "p_003"
}
```

字段含义：

1. currentBet：本街当前最高需要跟注到的金额。
2. lastFullRaiseAmount：上一笔完整加注的增量。
3. minBet：本街首次下注最小额，通常为 big blind。
4. minRaiseTo：当前最小 raise to 金额。
5. lastAggressorPlayerId：最近一次 bet 或完整 raise 的玩家。

### 27.3.2 首次 bet

如果当前街 currentBet = 0：

1. 玩家可以 check。
2. 玩家可以 bet。
3. bet 最小额 = big blind，除非玩家 stack 小于 big blind，此时可以 all-in。
4. bet 最大额 = 玩家剩余 stack。

### 27.3.3 Raise

如果当前街 currentBet > 0：

1. callAmount = currentBet - player.currentStreetContribution。
2. raiseToAmount 必须大于 currentBet。
3. raiseIncrement = raiseToAmount - currentBet。
4. 如果玩家不是 all-in，raiseIncrement 必须 >= lastFullRaiseAmount。
5. 如果玩家 all-in 且 raiseIncrement < lastFullRaiseAmount，则这是不足额 all-in raise。
6. 不足额 all-in raise 不更新 lastFullRaiseAmount。
7. 不足额 all-in raise 通常不 reopen action。

### 27.3.4 Reopen action 规则

完整 raise 会重新打开行动权。

定义：

```text
full_raise = raiseIncrement >= lastFullRaiseAmount
```

规则：

1. full raise 后，所有仍在手牌中、未 all-in、未 fold 的玩家都需要重新响应。
2. short all-in raise 不会给已经行动过且已经面对完整下注的玩家重新行动权。
3. 还没有对当前最高下注做出响应的玩家仍然需要行动。
4. 如果实现困难，MVP 可以简化为 short all-in 不改变 minRaiseTo，但仍继续行动到所有玩家下注相等或 all-in。

### 27.3.5 例子

场景：

1. Blinds 5/10。
2. A bet 100。
3. B all-in 150。
4. C call 150。
5. A 是否可以 re-raise？

判断：

1. A 的 bet 是 100。
2. B 的 raise increment 是 50。
3. lastFullRaiseAmount 是 100，因为首次 bet 100。
4. 50 < 100，所以 B 是不足额 all-in raise。
5. B 没有 reopen action。
6. 如果 A 已经完成下注响应，A 不能再次 raise，只能 call 差额或按规则结算。

---

## 27.4 Uncalled Bet Return

### 27.4.1 问题定义

当最后一笔下注或加注没有被其他玩家完全跟注时，未被跟注的部分需要退回下注者。

例子：

1. A bet 100。
2. B all-in call 60。
3. 没有其他玩家。
4. A 的 40 没有被任何人匹配。
5. 40 应退回 A。
6. pot 只有 120。

### 27.4.2 算法

在每条街结束或 hand 结束前执行：

```text
for each player:
  contribution = player.totalContribution

sort active contributions ascending

build pots by matched layers

if highest contribution only belongs to one player:
  uncalled = highest contribution - secondHighestContribution
  return uncalled to highestContributor
  remove uncalled from pot contribution
```

### 27.4.3 Action log

记录：

```json
{
  "actionType": "RETURN_UNCALLED_BET",
  "playerId": "p_001",
  "amount": 40,
  "street": "RIVER"
}
```

### 27.4.4 验收标准

1. 没有被匹配的下注必须退回。
2. 退回后总筹码守恒。
3. side pot 计算前必须处理未跟注部分。
4. hand history 中要显示 returned uncalled bet。

---

## 27.5 Wait for Big Blind 和 Post Blind Immediately

新玩家入座后不应该总是免费加入下一手。需要处理 blind fairness。

### 27.5.1 新玩家状态

新增状态：

```text
SEATED_WAITING_FOR_BB
SEATED_CAN_POST
SEATED_POSTED_BLIND
SEATED_ACTIVE_NEXT_HAND
```

### 27.5.2 玩家选项

当玩家坐下但还没有支付 blind 时，显示：

1. Wait for Big Blind
2. Post Big Blind Now
3. Sit Out

### 27.5.3 规则

1. 如果玩家选择 Wait for Big Blind，则等到自己自然轮到 big blind 时进入手牌。
2. 如果玩家选择 Post Big Blind Now，则下一手开始前额外支付一个 big blind，然后可以立即参与。
3. 如果玩家在 small blind 和 button 之间入座，不能通过 post blind 获得不公平优势，具体规则由房间设置决定。
4. 房主可以关闭 wait for blind，允许 casual mode 中任何 seated player 下一手直接进入。
5. casual mode 默认更适合朋友局，strict blind mode 更适合长期 ledger。

### 27.5.4 UI

在玩家座位上显示：

```text
Waiting for BB
Post BB to join now
Sitting out
```

---

## 27.6 Sit Out 规则

### 27.6.1 玩家主动 sit out

玩家点击 Sit Out：

1. 如果不在当前手中，立即 sit out。
2. 如果在当前手中，默认标记为 Sit Out Next Hand。
3. 如果玩家强制离桌，当前手仍按正常流程处理，不能直接从 hand 中删除。
4. 如果当前轮到该玩家且他主动离开，系统按 timeout 默认动作处理。

### 27.6.2 自动 sit out

以下情况自动 sit out：

1. 断线超过 grace period。
2. 连续 timeout 达到设置次数。
3. stack = 0。
4. 房主手动设置。
5. 玩家在移动端后台太久且无法响应。

### 27.6.3 恢复

玩家点击 I am back：

1. 如果 strict blind mode 开启，按 wait for big blind 处理。
2. 如果 casual mode 开启，下一手可直接加入。
3. 如果当前手进行中，只能等待下一手。

---

## 27.7 Timeout 和 Time Bank 完整规则

### 27.7.1 字段

```json
{
  "decisionTimeLimit": 30,
  "timeBankEnabled": true,
  "timeBankInitialSeconds": 60,
  "timeBankRefillPerHand": 0,
  "timeBankMaxSeconds": 120,
  "playerTimeBanks": {
    "p_001": 45
  }
}
```

### 27.7.2 流程

1. 轮到玩家行动时，先使用 normal decision timer。
2. normal timer 用完后，如果 time bank > 0，自动进入 time bank。
3. time bank 用完后执行默认动作。
4. 如果玩家面对 bet，默认 fold。
5. 如果玩家不需要 call，默认 check。
6. 如果玩家 all-in 或 fold，不再消耗 time bank。
7. 暂停游戏时 timer 冻结。
8. 断线时 timer 是否继续，由 room setting 决定。

### 27.7.3 UI

显示：

1. 普通倒计时环。
2. Time Bank 进度条。
3. 最后 5 秒闪烁提醒。
4. 玩家断线时显示 reconnect grace timer。
5. 行动超时时显示 Auto-folded 或 Auto-checked。

---

## 27.8 Odd Chip 规则

当 pot 无法被赢家平均分配时，会产生 odd chip。

规则：

1. pot 按整数筹码单位分配。
2. remainder = potAmount % winnerCount。
3. 每个赢家先获得 floor(potAmount / winnerCount)。
4. 剩余 odd chips 按座位顺序从 button 左侧第一个赢家开始发放。
5. 每个赢家最多先获得一个 odd chip，直到 remainder 用完。
6. hand history 必须记录 odd chip 分配。

---

## 27.9 Burn Card 可选规则

为了模拟线下 Texas Hold'em，可以开启 burn card。

规则：

1. flop 前 burn 一张。
2. turn 前 burn 一张。
3. river 前 burn 一张。
4. burn cards 不展示给玩家。
5. Rabbit Hunting 可以在手牌结束后按设置展示未发牌和 burn cards。
6. 如果不开启 burn card，发牌逻辑更简单，适合 MVP。

字段：

```json
{
  "burnCardEnabled": true,
  "burnCardsEncrypted": ["xx", "yy", "zz"]
}
```

---

## 28. 高级玩法规则

---

## 28.1 Ante

### 28.1.1 功能定义

Ante 是每手牌开始前所有 active players 都必须支付的小额强制下注。

### 28.1.2 设置

```json
{
  "anteEnabled": true,
  "anteAmount": 1,
  "anteType": "EVERY_PLAYER"
}
```

anteType：

1. EVERY_PLAYER：每位 active player 支付 ante。
2. BIG_BLIND_ANTE：只有 big blind 支付一个总 ante。
3. BUTTON_ANTE：button 支付一个总 ante。

### 28.1.3 规则

1. ante 在 blinds 之前收取。
2. 如果玩家 stack 不足 ante，则 all-in ante。
3. ante 计入 player totalContribution。
4. ante 不影响 preflop 行动顺序。
5. ante 必须写入 action log。

Action：

```json
{
  "actionType": "ANTE",
  "playerId": "p_001",
  "amount": 1
}
```

---

## 28.2 Live Straddle

### 28.2.1 功能定义

Live straddle 是通常由 UTG 在 preflop 前自愿支付的额外 blind，金额通常是 big blind 的 2 倍。开启后，straddler 在 preflop 获得最后行动权。

### 28.2.2 设置

```json
{
  "straddleEnabled": true,
  "straddleAmountMode": "DOUBLE_BIG_BLIND",
  "maxStraddleCount": 1,
  "allowButtonStraddle": false,
  "straddleDecisionWindowSeconds": 8
}
```

### 28.2.3 流程

1. hand 开始。
2. 收取 small blind 和 big blind。
3. 如果 straddle 开启，UTG 获得 straddle 选择弹窗。
4. UTG 在时间内选择 Straddle 或 Skip。
5. 如果 straddle，服务端从 UTG stack 扣除 straddle amount。
6. currentBet 设置为 straddle amount。
7. preflop 第一个行动者变成 straddler 左侧第一个 active player。
8. straddler 在 preflop 最后行动。

### 28.2.4 边界

1. UTG stack 不足完整 straddle 时，可不允许 straddle，或允许 all-in straddle，由房间设置决定。
2. 如果多个 straddle，行动顺序按最后 straddle 的左侧开始。
3. MVP 建议只支持一个 UTG straddle。
4. straddle 必须记录在 hand history。

---

## 28.3 Rabbit Hunting

### 28.3.1 功能定义

Rabbit Hunting 是手牌提前结束后，玩家可以查看如果继续发牌会出现什么牌。

例子：

1. 玩家在 flop all fold。
2. 获胜者可以选择 rabbit hunt turn 和 river。
3. 系统展示原本会发出的 turn 和 river。
4. Rabbit Hunting 不影响 pot 和结果。

### 28.3.2 设置

```json
{
  "rabbitHuntingEnabled": true,
  "rabbitHuntingMode": "WINNER_ONLY",
  "showBurnCards": false,
  "requestWindowSeconds": 10
}
```

mode：

1. WINNER_ONLY：只有赢家可以请求。
2. ANY_PLAYER：任何参与手牌的玩家可以请求。
3. HOST_ONLY：只有房主可以请求。
4. DISABLED：关闭。

### 28.3.3 流程

1. hand 提前结束。
2. 如果还有未发公共牌，显示 Rabbit Hunt 按钮。
3. 玩家请求。
4. 服务端从剩余 deck 中按原本顺序发出未发公共牌。
5. UI 以灰色或特殊样式显示 rabbit cards。
6. hand history 标记这些牌是 rabbit cards。
7. rabbit cards 不参与结算。

### 28.3.4 验收标准

1. Rabbit cards 不改变赢家。
2. Rabbit cards 不改变 hand result。
3. 只能在 hand finished 后请求。
4. 不能泄露当前手仍在进行中的 deck。

---

## 28.4 Run It Twice

### 28.4.1 功能定义

Run It Twice 指所有剩余玩家 all-in 后，后续公共牌发两次，pot 分成两部分分别结算。

### 28.4.2 触发条件

1. 当前手还有至少两个未 fold 玩家。
2. 所有未 fold 玩家都 all-in。
3. 还没有发完所有公共牌。
4. 房间开启 run it twice。
5. 所有 eligible all-in 玩家同意。

### 28.4.3 设置

```json
{
  "runItTwiceEnabled": true,
  "runItTwiceRequiresUnanimousConsent": true,
  "runItTwiceDefault": "ASK",
  "runItTwiceBoards": 2
}
```

### 28.4.4 流程

1. 触发 all-in lock。
2. 服务端暂停自动发牌。
3. 对所有 eligible players 发送 Run It Twice 投票。
4. 如果所有人同意，pot splitFactor = 2。
5. 服务端发 Board 1 剩余公共牌。
6. 服务端发 Board 2 剩余公共牌。
7. 每个 pot 分成两个等额部分。
8. Board 1 独立评估赢家。
9. Board 2 独立评估赢家。
10. 如果 pot 金额不能整除 2，odd chip 按规则处理。
11. hand history 显示两块 board 和各自赢家。

### 28.4.5 边界

1. 如果有人拒绝，则只 run once。
2. 如果已经到 river，不允许 run it twice。
3. 如果 side pot 中 eligible players 不同，每个 side pot 仍需分别按两块 board 结算。
4. 对 fold 玩家没有投票权。
5. 多人 all-in 时，所有未 fold 且有 pot eligibility 的玩家都需要同意。

### 28.4.6 数据结构

```json
{
  "runoutMode": "TWICE",
  "boards": [
    {
      "boardNumber": 1,
      "communityCards": ["As", "Kd", "7h", "2c", "9s"],
      "potResults": []
    },
    {
      "boardNumber": 2,
      "communityCards": ["As", "Kd", "7h", "Jc", "3d"],
      "potResults": []
    }
  ]
}
```

---

## 28.5 Double Board

### 28.5.1 功能定义

Double Board 是一手牌使用两套公共牌，通常从 flop 开始就是两块 board。最终每块 board 独立产生赢家，pot 通常分成两半。

### 28.5.2 设置

```json
{
  "doubleBoardEnabled": true,
  "doubleBoardMode": "FULL_HAND",
  "splitPotByBoard": true
}
```

### 28.5.3 发牌

FULL_HAND 模式：

1. Flop 发 Board A 三张，Board B 三张。
2. Turn 发 Board A 一张，Board B 一张。
3. River 发 Board A 一张，Board B 一张。
4. 玩家用同一组 hole cards 分别结合每块 board 评估牌力。

### 28.5.4 结算

1. 每个 pot 分成 Board A 和 Board B 两部分。
2. Board A 找赢家。
3. Board B 找赢家。
4. 同一玩家可能赢两块 board，称为 scoop。
5. 每块 board 内仍可能 split。
6. odd chip 先按 board 分配，再按赢家分配。

### 28.5.5 UI

1. CommunityCards 组件改成双行。
2. 上方显示 Board A。
3. 下方显示 Board B。
4. 每块 board 用标签区分。
5. Showdown 时分别高亮 Board A winner 和 Board B winner。

---

## 28.6 Bomb Pot

### 28.6.1 功能定义

Bomb Pot 是所有玩家在手牌开始前支付固定金额，然后通常直接发 flop，再从 flop 后开始下注。

### 28.6.2 设置

```json
{
  "bombPotEnabled": true,
  "bombPotTrigger": "MANUAL",
  "bombPotAmount": 20,
  "bombPotFrequencyHands": 0,
  "bombPotDoubleBoardDefault": false
}
```

trigger：

1. MANUAL：房主手动指定下一手为 bomb pot。
2. EVERY_N_HANDS：每 N 手自动 bomb pot。
3. RANDOM：随机触发，后续版本。

### 28.6.3 流程

1. hand 开始前判断是否 bomb pot。
2. 所有 active players 支付 bomb pot amount。
3. 不收取 normal blinds，除非房主设置同时收取。
4. 每位玩家发 hole cards。
5. 直接发 flop。
6. 从 flop 开始第一个玩家行动。
7. 如果 double board bomb pot 开启，发两块 flop。
8. 后续按正常下注和结算。

### 28.6.4 边界

1. stack 不足 bomb amount 的玩家 all-in。
2. 如果所有玩家因 bomb pot all-in，直接发完公共牌并 showdown。
3. bomb pot 必须在 hand history 顶部标记。
4. bomb pot 不应和 live straddle 同时启用，除非明确支持。

---

## 28.7 7-2 Bounty

### 28.7.1 功能定义

如果玩家使用 7-2 起手牌赢得一手牌，该玩家获得额外 bounty。该功能用于增加 bluff 动机。

### 28.7.2 设置

```json
{
  "sevenTwoBountyEnabled": true,
  "bountyAmount": 20,
  "bountyPaidBy": "EACH_OTHER_PLAYER",
  "requiresShowCards": true,
  "offsuitOnly": false
}
```

bountyPaidBy：

1. EACH_OTHER_PLAYER：其他每名玩家支付 bounty。
2. POT_BONUS：从系统记录中加 bonus play chips。
3. HOST_LEDGER_ONLY：只记录 ledger，不自动扣 stack。

### 28.7.3 判断条件

玩家获得 7-2 bounty 需要满足：

1. 玩家 hole cards 是 7 和 2。
2. 玩家赢得该手至少一个 pot。
3. 玩家需要 show cards。
4. 如果 offsuitOnly = true，则必须是不同花色 7-2。
5. 如果 double board 开启，赢得至少一块 board 即可触发，具体由设置决定。

### 28.7.4 结算

推荐 play money 实现：

1. bounty 不从当前 pot 中扣除。
2. 手牌正常结算后，额外执行 bounty ledger action。
3. 如果 bountyPaidBy = EACH_OTHER_PLAYER，则从其他 active players stack 中扣除 bountyAmount。
4. 如果其他玩家 stack 不足，则扣到 0 或只记录欠款，由房间设置决定。
5. hand history 记录 bounty winner。

---

## 28.8 NIT Game

### 28.8.1 功能定义

NIT Game 通常用于惩罚或标记过于紧的玩法，具体规则不同房间可能不同。建议本产品把它做成可配置的趣味规则，而不是固定扑克标准。

### 28.8.2 推荐实现

定义一个 NIT Token：

1. 开局时某玩家持有 NIT token。
2. 当持有者赢得一手达到条件的 pot 时，可以把 token 传给别人。
3. 结束时持有 NIT token 的玩家在 ledger 中被记录 penalty。
4. penalty 不涉及真钱，只是 play money 或娱乐记录。

### 28.8.3 设置

```json
{
  "nitGameEnabled": true,
  "nitPenaltyAmount": 20,
  "transferCondition": "WIN_HAND_WITH_SHOWDOWN",
  "initialNitPlayerSelection": "RANDOM"
}
```

### 28.8.4 UI

1. 玩家座位上显示 NIT badge。
2. Hand history 记录 token transfer。
3. Ledger 显示 NIT penalty 或 bonus。

---

## 28.9 Pot Limit Omaha Hi

### 28.9.1 功能定义

Pot Limit Omaha Hi 是四张手牌的 Omaha。玩家必须从自己的 4 张 hole cards 中使用恰好 2 张，再从 5 张公共牌中使用恰好 3 张组成最佳 5 张牌。

### 28.9.2 规则差异

1. 每位玩家发 4 张 hole cards。
2. 必须使用 exactly 2 hole cards。
3. 必须使用 exactly 3 community cards。
4. 下注结构是 Pot Limit，不是 No-Limit。
5. 最大 bet 或 raise 由当前 pot size 计算。

### 28.9.3 Pot Limit 最大加注算法

面对 currentBet 时：

```text
callAmount = currentBet - player.currentStreetContribution
potAfterCall = currentPot + callAmount
maxRaiseTo = currentBet + potAfterCall
```

更严格写法：

1. 玩家先完成 call。
2. 然后最多 raise 一个 pot。
3. raise 后总额不能超过 stack。

### 28.9.4 Hand evaluator

Omaha evaluator 不能直接用 Hold'em evaluator。

必须枚举：

1. 从 4 张 hole cards 中选 2 张。
2. 从 5 张 community cards 中选 3 张。
3. 共 C(4,2) × C(5,3) = 60 种组合。
4. 评估每个 5-card hand。
5. 取最大牌力。

---

## 28.10 Omaha Hi/Lo 8 or Better

### 28.10.1 功能定义

Omaha Hi/Lo 把 pot 分成 high half 和 low half。low hand 必须满足 8 or better。

### 28.10.2 Low hand 条件

1. 玩家必须使用 exactly 2 hole cards 和 exactly 3 community cards。
2. Low hand 由 5 张不同点数的牌组成。
3. 最大点数必须 <= 8。
4. A 视为 low 的最小牌。
5. 顺子和同花不影响 low。
6. 最佳 low 是 A-2-3-4-5。

### 28.10.3 结算

1. high winner 获得 pot 的 high half。
2. 如果有 qualified low，low winner 获得 low half。
3. 如果没有 qualified low，high winner scoop 整个 pot。
4. high 和 low 都可能 split。
5. 同一个玩家可以同时赢 high 和 low。
6. 每个 side pot 单独判断 high 和 low eligibility。

### 28.10.4 UI

1. Showdown 结果显示 High Winner。
2. 如果存在 low，显示 Low Winner。
3. 每个玩家展示 high hand 和 low hand。
4. 如果 no qualifying low，显示 No qualified low。

---

## 29. Hand Replay 和高级历史记录

---

## 29.1 Hand Replay 数据模型

每一手牌保存 replay events，而不只是保存最终文本。

```json
{
  "handId": "h_1001",
  "events": [
    {
      "seq": 1,
      "type": "HAND_STARTED",
      "timestamp": "2026-06-02T12:00:00Z",
      "payload": {}
    },
    {
      "seq": 2,
      "type": "DEAL_HOLE_CARDS",
      "visibility": "PRIVATE",
      "playerId": "p_001",
      "payload": {
        "cards": ["Ah", "Kd"]
      }
    },
    {
      "seq": 3,
      "type": "ACTION",
      "payload": {
        "playerId": "p_002",
        "action": "RAISE",
        "amount": 60
      }
    }
  ]
}
```

### 29.1.1 可见性

visibility：

1. PUBLIC：所有人可见。
2. PRIVATE：仅对应玩家可见。
3. HOST_AUDIT：仅后端审计。
4. REVEALED_AFTER_SHOWDOWN：摊牌后可见。

### 29.1.2 Replay UI

功能：

1. Play
2. Pause
3. Step forward
4. Step backward
5. Jump to preflop/flop/turn/river/showdown
6. 0.5x、1x、2x speed
7. 显示每一步 pot 和 stack
8. 显示玩家行动字幕
9. 高亮当前行动玩家
10. Showdown 时显示赢家和最佳五张牌

### 29.1.3 Enhanced Replayer Filters

筛选：

1. player
2. hand number
3. date
4. pot size
5. won hands
6. lost hands
7. all-in hands
8. showdown hands
9. tagged hands
10. 7-2 bounty hands
11. bomb pot hands
12. double board hands
13. net earning positive or negative

---

## 29.2 Save and Tag Hands

### 29.2.1 功能

用户可以保存重要手牌并打标签。

标签例子：

1. bluff
2. bad beat
3. all-in
4. review later
5. interesting river
6. bounty
7. side pot
8. mistake

### 29.2.2 数据表

```text
hand_tags
- id
- hand_id
- player_id
- tag_name
- note
- created_at
```

### 29.2.3 UI

1. Hand history 每手牌右侧有 star 按钮。
2. 点击后打开 Tag modal。
3. 支持添加多个标签。
4. 支持写私人 note。
5. 私人 note 仅自己可见。
6. 房主可导出公共 tags，不导出私人 notes。

---

## 30. 多设备和多标签页

Poker Now 类产品支持同时在多个设备使用。这里需要明确身份和 socket 策略。

### 30.1 设备模型

```text
player
  └── device_sessions
        ├── device A
        ├── device B
        └── browser tab C
```

数据表：

```text
device_sessions
- id
- player_id
- device_id
- socket_id
- user_agent
- last_seen_at
- is_primary
- created_at
```

### 30.2 策略

推荐策略：多设备都可观看，但只有 primary device 可以行动。

规则：

1. 同一 player_token 可以在多个设备连接。
2. 所有设备都收到 table update。
3. 私人手牌可以在所有已验证设备显示。
4. 只有 primary device 显示 action buttons。
5. 其他设备显示 View Only。
6. 用户可以点击 Make this device primary。
7. primary device 变更需要二次确认，避免误触。
8. action submit 必须包含 deviceSessionId。
9. 服务端拒绝非 primary device 的 action。

### 30.3 冲突处理

1. 如果两个设备同时提交 action，只接受最早到达且合法的 action。
2. 后到 action 返回 HAND_VERSION_CONFLICT。
3. 所有设备收到最新 snapshot。
4. 如果 primary device 断线超过 10 秒，可自动允许其他设备接管，或要求手动接管。

---

## 31. Full Session Log Download

### 31.1 导出格式

支持：

1. TXT：适合人类阅读。
2. JSON：适合后续分析和 replay。
3. CSV：适合 ledger 和 action records。
4. ZIP：包含 hands.json、actions.csv、ledger.csv、chat.txt。

### 31.2 TXT 格式示例

```text
Session: Gary's Table
Started: 2026-06-02 20:00
Blinds: 5/10
Game: No-Limit Hold'em

Hand #12
Button: Seat 4
SB: Gary 5
BB: Alex 10

Hole cards:
Gary: [hidden or shown if revealed]
Alex: [shown Ah Kd]

Preflop:
Gary calls 10
Alex raises to 40
Gary calls 40

Flop: As 7d 2c
Gary checks
Alex bets 60
Gary folds

Result:
Alex wins 80
Uncalled bet returned to Alex: 60
```

### 31.3 导出权限

1. 房主可以导出完整 session。
2. 普通玩家可以导出自己参与过的公开信息。
3. 私有 mucked cards 默认不导出。
4. 审计级导出需要管理员权限，不在普通产品 UI 暴露。

---

## 32. 视频和语音聊天

### 32.1 范围

v2 可以先设计接口，真正实现可以放到 P2 或 P3。

### 32.2 方案

推荐使用 WebRTC 或集成 Jitsi。

组件：

1. VideoChatPanel
2. PlayerVideoTile
3. MuteButton
4. CameraToggle
5. ScreenShare，可选
6. PushToTalk，可选

### 32.3 规则

1. 用户默认关闭摄像头和麦克风。
2. 加入前需要浏览器权限。
3. 房主可以 mute 某玩家。
4. 旁观者是否可以加入语音由房主设置。
5. 移动端默认收起 video panel。
6. 视频不影响牌局状态。
7. 视频连接失败不应踢出牌局。

---

## 33. Player Notes 和颜色标记

### 33.1 功能

用户可以给其他玩家添加私人 notes 和颜色标签。

字段：

```text
player_notes
- id
- room_id
- author_player_id
- target_player_id
- color
- note
- created_at
- updated_at
```

颜色标签：

1. red：aggressive
2. blue：tight
3. green：loose
4. yellow：fun player
5. purple：custom

### 33.2 UI

1. 点击玩家头像打开 Player Profile Popover。
2. 显示 Add Note。
3. 选择颜色。
4. notes 仅作者本人可见。
5. Hand replay 和 history 中可显示自己给玩家的颜色标签。

---

## 34. Custom Avatar 和 Custom Table Felt

### 34.1 Avatar

功能：

1. 用户上传头像。
2. 支持裁剪。
3. 支持默认首字母头像。
4. 支持预设 avatar pack。
5. 图片需要审核或基础安全过滤。
6. 支持移除头像。

技术要求：

1. 限制文件大小。
2. 限制格式 png/jpg/webp。
3. 上传到对象存储。
4. 生成缩略图。
5. 不允许 SVG 直接上传，避免脚本风险。

### 34.2 Table Felt

功能：

1. 房主选择桌布主题。
2. 支持颜色。
3. 支持图案。
4. 支持自定义背景图，后续版本。
5. 移动端和桌面端分别适配。

设计字段：

```json
{
  "theme": {
    "feltColor": "emerald",
    "backgroundStyle": "dark-room",
    "cardBack": "classic-red",
    "chipStyle": "modern",
    "seatStyle": "rounded"
  }
}
```

---

## 35. UI 高保真实现补充

---

## 35.1 桌面端布局

目标分辨率：1440 × 900。

布局：

```text
┌──────────────────────────────────────────────────────────────┐
│ TopBar: room name, blinds, hand number, invite, settings      │
├──────────────────────────────────────────────┬───────────────┤
│                                              │ RightPanel    │
│              Poker Table Area                │ Chat          │
│                                              │ History       │
│                                              │ Ledger        │
├──────────────────────────────────────────────┴───────────────┤
│ Bottom Action Area: hole cards, legal actions, bet slider     │
└──────────────────────────────────────────────────────────────┘
```

尺寸建议：

1. TopBar 高度：56px。
2. RightPanel 宽度：320px 到 380px。
3. Bottom Action Area 高度：150px 到 190px。
4. PokerTableArea 使用剩余空间。
5. 椭圆桌宽度：min(820px, 70vw)。
6. 椭圆桌高度：min(420px, 46vh)。

---

## 35.2 10 人座位坐标

使用相对坐标，方便响应式。

以牌桌中心为 `(50%, 50%)`，座位围绕椭圆分布。

```json
{
  "10max": [
    {"seat": 1, "x": "50%", "y": "92%"},
    {"seat": 2, "x": "25%", "y": "84%"},
    {"seat": 3, "x": "10%", "y": "62%"},
    {"seat": 4, "x": "10%", "y": "34%"},
    {"seat": 5, "x": "25%", "y": "12%"},
    {"seat": 6, "x": "50%", "y": "8%"},
    {"seat": 7, "x": "75%", "y": "12%"},
    {"seat": 8, "x": "90%", "y": "34%"},
    {"seat": 9, "x": "90%", "y": "62%"},
    {"seat": 10, "x": "75%", "y": "84%"}
  ]
}
```

6-max 可以使用：

```json
{
  "6max": [
    {"seat": 1, "x": "50%", "y": "92%"},
    {"seat": 2, "x": "15%", "y": "70%"},
    {"seat": 3, "x": "15%", "y": "28%"},
    {"seat": 4, "x": "50%", "y": "8%"},
    {"seat": 5, "x": "85%", "y": "28%"},
    {"seat": 6, "x": "85%", "y": "70%"}
  ]
}
```

---

## 35.3 PlayerSeat 视觉状态

状态样式：

1. Empty：虚线边框，显示 Take Seat。
2. Seated：正常亮度。
3. Current Turn：外圈高亮，倒计时环。
4. Folded：透明度 45%，卡牌灰色。
5. All-in：显示 ALL-IN badge。
6. Sitting Out：灰色遮罩，显示 Sitting out。
7. Disconnected：红点或断链图标。
8. Winner：金色发光和筹码流入动画。
9. Host：昵称旁显示 crown icon。
10. Spectator：不在座位上，在 right panel member list 中显示。

PlayerSeat 内部信息：

```text
[avatar]
nickname
stack: 1,240
bet: 80
badges: D / SB / BB / STR / ALL-IN
timer ring
```

---

## 35.4 ActionPanel 高保真

桌面端：

```text
[Hole Cards]      [Fold] [Check/Call 80] [Raise] [All-in]
                  [1/2 Pot] [2/3 Pot] [Pot] [Max]
                  [slider] [amount input]
```

移动端：

1. 固定在底部。
2. 手牌在按钮上方。
3. 三个主按钮占满宽度。
4. Raise 点击后展开 bottom sheet。
5. Bet slider 放在 bottom sheet 中。
6. 防止按钮太小，最小触控高度 44px。

按钮状态：

1. Fold：危险但不要过度醒目。
2. Check：中性。
3. Call：主按钮。
4. Bet/Raise：主按钮。
5. All-in：二级危险按钮，需要二次确认，可由设置关闭。

---

## 35.5 RightPanel 移动端

当屏幕宽度 < 900px：

1. RightPanel 不固定右侧。
2. 改成底部 Tab Drawer。
3. 默认只显示小按钮 Chat、History、Players。
4. 点击后从底部弹出 70vh 高度 panel。
5. ActionPanel 优先级高于 Chat panel。
6. 当前轮到玩家行动时，自动最小化 Chat panel。

---

## 35.6 动画

基础动画：

1. 发手牌：从 deck 飞到玩家座位。
2. 发 flop/turn/river：卡牌翻转。
3. 下注：筹码从玩家座位移动到 pot。
4. 赢 pot：筹码从 pot 移动到赢家座位。
5. Fold：手牌滑入 muck 区。
6. All-in：座位短暂震动或发光。
7. Showdown：手牌翻开。
8. Rabbit hunting：灰色卡牌慢翻。
9. Run it twice：Board 1 和 Board 2 分区展开。
10. Bomb pot：开局显示 Bomb Pot banner。

注意：

1. 动画不能阻塞游戏状态更新。
2. 网络延迟时以服务端 state 为准。
3. 玩家可在设置中关闭动画。
4. 移动端减少复杂动画。

---

## 35.7 Accessibility

必须支持：

1. 键盘可操作主要按钮。
2. 当前行动有文本提示，不只靠颜色。
3. 卡牌有 aria-label，例如 Ace of Spades。
4. 色盲用户可以区分花色，使用符号和颜色双重提示。
5. 倒计时最后阶段有文字提示。
6. 按钮触控区域不小于 44px。
7. 聊天消息可被屏幕阅读器读取。
8. 错误提示不只用 toast，还要在相关区域保留文本。

---

## 36. 新增 WebSocket 事件

---

## 36.1 Run It Twice 投票

client.game.runItTwiceVote：

```json
{
  "roomId": "abc123",
  "handId": "h_1001",
  "vote": "YES"
}
```

server.game.runItTwiceVoteUpdated：

```json
{
  "handId": "h_1001",
  "votes": {
    "p_001": "YES",
    "p_002": "PENDING"
  }
}
```

---

## 36.2 Rabbit Hunting

client.hand.rabbitHuntRequest：

```json
{
  "roomId": "abc123",
  "handId": "h_1001",
  "requestedCards": "REMAINING_BOARD"
}
```

server.hand.rabbitHuntResult：

```json
{
  "handId": "h_1001",
  "rabbitCards": ["Qc", "Ts"],
  "doesNotAffectResult": true
}
```

---

## 36.3 Hand Replay

client.replay.load：

```json
{
  "roomId": "abc123",
  "handId": "h_1001"
}
```

server.replay.loaded：

```json
{
  "handId": "h_1001",
  "events": []
}
```

---

## 36.4 Device Primary Claim

client.device.claimPrimary：

```json
{
  "roomId": "abc123",
  "playerId": "p_001",
  "deviceSessionId": "d_002"
}
```

server.device.primaryUpdated：

```json
{
  "playerId": "p_001",
  "primaryDeviceSessionId": "d_002"
}
```

---

## 36.5 Host Feature Toggle

client.host.toggleFeature：

```json
{
  "roomId": "abc123",
  "feature": "DOUBLE_BOARD",
  "enabled": true,
  "applyFrom": "NEXT_HAND"
}
```

server.host.featureUpdated：

```json
{
  "roomId": "abc123",
  "feature": "DOUBLE_BOARD",
  "enabled": true,
  "effectiveFromHandNumber": 24
}
```

---

## 37. 新增数据库表

---

## 37.1 hand_replay_events

```text
id
hand_id
seq
event_type
visibility
player_id_nullable
payload_json
created_at
```

索引：

1. hand_id + seq
2. hand_id + visibility

---

## 37.2 device_sessions

```text
id
player_id
room_id
device_id
socket_id
user_agent
is_primary
last_seen_at
created_at
updated_at
```

---

## 37.3 player_notes

```text
id
room_id
author_player_id
target_player_id
color
note
created_at
updated_at
```

---

## 37.4 hand_tags

```text
id
hand_id
player_id
tag_name
note
created_at
```

---

## 37.5 feature_activations

记录高级玩法在每手牌中的开启状态，确保 replay 和 history 不受后续设置变化影响。

```text
id
hand_id
feature_name
enabled
config_json
created_at
```

---

## 37.6 bounty_events

```text
id
hand_id
player_id
bounty_type
amount
paid_by_json
created_at
```

---

## 38. 增强测试清单

### 38.1 德州扑克边界测试

1. river last aggressor first show。
2. no river bet 时 button 左侧先 show。
3. losing player muck。
4. all-in player auto reveal。
5. short all-in raise 不 reopen action。
6. full raise reopen action。
7. uncalled bet return。
8. odd chip 分配。
9. wait for big blind。
10. post big blind immediately。
11. sit out next hand。
12. timeout facing bet auto-fold。
13. timeout with check option auto-check。
14. disconnect grace period。
15. primary device action only。

### 38.2 高级玩法测试

1. ante every player。
2. big blind ante。
3. live straddle changes preflop order。
4. rabbit hunting does not affect result。
5. run it twice unanimous yes。
6. run it twice one player rejects。
7. run it twice with side pot。
8. double board scoop。
9. double board split board A and board B。
10. bomb pot skips preflop betting。
11. bomb pot with double board。
12. 7-2 bounty triggers。
13. 7-2 bounty does not trigger if player mucks。
14. 7-2 bounty with offsuitOnly。
15. NIT token transfer。

### 38.3 Omaha 测试

1. Omaha exactly 2 hole cards。
2. Omaha exactly 3 board cards。
3. Omaha flush cannot use 1 hole card only。
4. Omaha full house selection。
5. Pot Limit max raise。
6. Omaha Hi/Lo qualified low。
7. Omaha Hi/Lo no qualified low。
8. Omaha Hi/Lo scoop。
9. Omaha Hi/Lo side pot high and low。

### 38.4 UI 测试

1. 10-max seat coordinates on desktop。
2. 6-max layout。
3. mobile bottom action panel。
4. mobile chat drawer。
5. current turn highlight。
6. folded visual state。
7. all-in badge。
8. disconnected badge。
9. double board UI。
10. run it twice UI。
11. rabbit hunting UI。
12. replay stepper。
13. accessibility labels。
14. reduced motion setting。

---

## 39. 更新后的开发优先级

### Phase 1：稳定 Texas Hold'em

1. 补齐 showdown/muck。
2. 补齐 min raise/reopen action。
3. 补齐 uncalled bet return。
4. 补齐 wait for big blind。
5. 补齐 sit out。
6. 补齐 time bank。
7. 补齐 session log download。
8. 补齐移动端基本 UI。

### Phase 2：Poker Now 风格朋友局增强

1. Ante。
2. Live Straddle。
3. Rabbit Hunting。
4. Run It Twice。
5. Spectator face-up mode。
6. Hand Replay。
7. 多设备 primary device。
8. Player notes。
9. Custom avatar。
10. Custom table felt。

### Phase 3：娱乐玩法

1. Bomb Pot。
2. Double Board。
3. 7-2 Bounty。
4. NIT Game。
5. Enhanced hand replay filters。
6. Save and tag hands。
7. Post-game stats。
8. AI analysis。

### Phase 4：扩展牌种和社群

1. Pot Limit Omaha Hi。
2. Omaha Hi/Lo 8 or Better。
3. One-table tournament。
4. Multi-table tournament。
5. Club system。
6. Club reporting。
7. Discord bot。

---

## 40. 给 AI 编程工具的增强提示词

如果你要让 Cursor、Codex 或其他 AI 编程工具继续开发，可以使用下面这段补充提示词：

```text
Extend the existing private poker room specification into a near Poker Now feature-complete product, while keeping original branding and play-money only constraints.

Add the following Texas Hold'em rule patches:
1. Showdown order.
2. Muck and reveal rules.
3. All-in auto reveal.
4. Minimum bet and minimum raise.
5. Full raise vs short all-in raise.
6. Reopen action logic.
7. Uncalled bet return.
8. Odd chip distribution.
9. Wait for big blind.
10. Post big blind immediately.
11. Sit out and sit out next hand.
12. Timeout and time bank behavior.

Add the following advanced gameplay modules:
1. Ante.
2. Live Straddle.
3. Rabbit Hunting.
4. Run It Twice.
5. Double Board.
6. Bomb Pot.
7. 7-2 Bounty.
8. NIT Game.
9. Pot Limit Omaha Hi.
10. Omaha Hi/Lo 8 or Better.

Add product modules:
1. Hand Replay with event timeline.
2. Enhanced hand history filters.
3. Save and tag hands.
4. Player notes with colors.
5. Multi-device support with primary device action control.
6. Full session log download.
7. Custom avatars.
8. Custom table felt.
9. Mobile responsive UI.

All gameplay decisions must remain server-authoritative. The client must never decide cards, legal actions, winners, pot distribution, side pots, bounty eligibility, or runout results.
```

---

## 41. v2 最终验收标准

达到 v2 后，产品应满足：

1. Texas Hold'em 规则不只可玩，而且能处理主流线上扑克边界场景。
2. 玩家可以选择 wait for big blind 或 post blind。
3. all-in、side pot、uncalled bet、odd chip 都能正确结算。
4. showdown 展示顺序、muck、all-in reveal 都有清晰规则。
5. 房主可以开启 Ante、Straddle、Rabbit Hunting、Run It Twice。
6. 房主可以开启 Bomb Pot、Double Board、7-2 Bounty、NIT Game。
7. 系统可以 replay 任意一手牌。
8. 玩家可以保存和标记手牌。
9. 玩家可以给对手做私人 note。
10. 同一玩家可以多设备观看，但只有 primary device 能操作。
11. session 可以导出完整日志。
12. 桌面和移动端都有明确 UI 布局。
13. 所有高级玩法都写入 hand history 和 replay events。
14. 产品仍然明确是 play money，没有现实货币价值。
15. UI 和品牌不是 Poker Now 的复制品，而是自己的私人扑克房间产品。
