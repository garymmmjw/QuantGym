import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/dudeney-puzzles/problems.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-quality-review/dudeney-reviewed-repairs-report.json");
const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const problemById = new Map(problems.map((problem) => [String(problem.id || ""), problem]));
const reviewSource = "llm-full-major-triage-reviewed-dudeney-repair-2026-06-02";

const repairs = [
  {
    id: "dudeney-puzzles-problem-008",
    reason: "Title and Chinese explanation mistranslated Rover's age and omitted Rover's current age.",
    fields: {
      titleEn: "8. Rover's Age.",
      titleZh: "8. 罗弗的年龄。",
      tags: ["Dudeney 经典挑战谜题", "Arithmetical and algebraical puzzles", "Mental Math", "Algebra", "Age word problem"],
      promptZh: "“那么，汤米，罗弗现在几岁了？”米尔德里德的一位年轻朋友问她的弟弟。男孩回答说：“五年前，姐姐的年龄是狗的五倍（也就是比狗大四倍）；可现在她只有狗的三倍大了。”你能算出罗弗的年龄吗？",
      answer: "Rover is 10 years old; Mildred is 30 years old.",
      answerEn: "Rover is 10 years old; Mildred is 30 years old.",
      answerZh: "罗弗现在 10 岁；米尔德里德现在 30 岁。",
      explanation: "Rover's present age is ten years and Mildred's thirty years. Five years ago their respective ages were five and twenty-five. Here “four times older than the dog” is interpreted as the dog's age plus four more dog-ages, i.e. “five times as old.”",
      explanationEn: "Rover's present age is ten years and Mildred's thirty years. Five years ago their respective ages were five and twenty-five. Here “four times older than the dog” is interpreted as the dog's age plus four more dog-ages, i.e. “five times as old.”",
      explanationZh: "罗弗现在 10 岁，米尔德里德现在 30 岁。五年前，他们分别是 5 岁和 25 岁。注意原题说的是“比狗大四倍”，也就是米尔德里德的年龄等于狗的年龄再加上狗年龄的四倍，即“是狗的五倍”。"
    }
  },
  {
    id: "dudeney-puzzles-problem-010",
    reason: "Prompt ratio sentence and solution text were corrupted by adjacent PDF text.",
    fields: {
      promptZh: "三个男孩收到一袋坚果作为圣诞礼物，大家约定按年龄比例分配。这三人的年龄合计为 17.5 岁。袋中共有 770 颗坚果；每当赫伯特拿 4 颗时，罗伯特拿 3 颗；每当赫伯特拿 6 颗时，克里斯托弗拿 7 颗。问题是：三人各分到多少颗坚果？他们各自多少岁？",
      answer: "Herbert received 264 nuts and was 6 years old; Robert received 198 nuts and was 4.5 years old; Christopher received 308 nuts and was 7 years old.",
      answerEn: "Herbert received 264 nuts and was 6 years old; Robert received 198 nuts and was 4.5 years old; Christopher received 308 nuts and was 7 years old.",
      answerZh: "赫伯特分到 264 颗，年龄 6 岁；罗伯特分到 198 颗，年龄 4.5 岁；克里斯托弗分到 308 颗，年龄 7 岁。",
      explanation: "The two ratios imply that when Herbert takes 12 nuts, Robert takes 9 and Christopher takes 14. Thus the basic share ratio is 12:9:14, whose sum is 35. Since 770/35=22, the shares are 12*22=264, 9*22=198, and 14*22=308. The age total is 17.5 years, which is half of 35, so the corresponding ages are 6, 4.5, and 7 years.",
      explanationEn: "The two ratios imply that when Herbert takes 12 nuts, Robert takes 9 and Christopher takes 14. Thus the basic share ratio is 12:9:14, whose sum is 35. Since 770/35=22, the shares are 12*22=264, 9*22=198, and 14*22=308. The age total is 17.5 years, which is half of 35, so the corresponding ages are 6, 4.5, and 7 years.",
      explanationZh: "两个比例可合并为：当赫伯特拿 12 颗时，罗伯特拿 9 颗，克里斯托弗拿 14 颗。因此基本分配比例是 12:9:14，总和为 35。由于 770/35=22，三人的坚果数分别为 12*22=264、9*22=198、14*22=308。年龄总和 17.5 岁正好是 35 的一半，所以三人的年龄分别是 6 岁、4.5 岁、7 岁。"
    }
  },
  {
    id: "dudeney-puzzles-problem-012",
    reason: "Chinese prompt distorted the time relation, and answer lacked derivation.",
    fields: {
      promptZh: "现在距离六点还有多少分钟，如果五十分钟前，超过三点的分钟数正好是这个数的四倍？",
      answer: "26 minutes.",
      answerEn: "26 minutes.",
      answerZh: "26 分钟。",
      explanation: "Let x be the number of minutes now remaining until six o'clock. Fifty minutes ago, the time was 130-x minutes past three o'clock. The condition gives 130-x=4x, hence 5x=130 and x=26. Therefore it is now 26 minutes until six.",
      explanationEn: "Let x be the number of minutes now remaining until six o'clock. Fifty minutes ago, the time was 130-x minutes past three o'clock. The condition gives 130-x=4x, hence 5x=130 and x=26. Therefore it is now 26 minutes until six.",
      explanationZh: "设现在距离六点还有 x 分钟。五十分钟前，距离三点已经过了 130-x 分钟。题意给出 130-x=4x，因此 5x=130，x=26。所以现在距离六点还有 26 分钟。"
    }
  },
  {
    id: "dudeney-puzzles-problem-023",
    reason: "Chinese prompt was replaced by unrelated card-puzzle text.",
    fields: {
      titleZh: "23. 三组数字。",
      promptZh: "《数学新年鉴》中曾刊出下面这个谜题，它是我《坎特伯雷谜题》中一道题的变形。请把 1 到 9 这九个数字分成三组，位数分别为两位、三位和四位，使前两个数相乘正好得到第三个数。例如，12 \\times 483 = 5,796。现在还要求把一位、四位、四位的情况也包括进来，例如 4 \\times 1,738 = 6,952。你能找出这两类情形下所有可能的解吗？",
      answer: "There are nine solutions.",
      answerEn: "There are nine solutions.",
      answerZh: "共有 9 个解。",
      explanationZh: "共有 9 个解，且没有更多：12 \\times 483 = 5,796；27 \\times 198 = 5,346；42 \\times 138 = 5,796；39 \\times 186 = 7,254；18 \\times 297 = 5,346；48 \\times 159 = 7,632；28 \\times 157 = 4,396；4 \\times 1,738 = 6,952；4 \\times 1,963 = 7,852。其中第七个解最容易被解题者遗漏。"
    }
  },
  {
    id: "dudeney-puzzles-problem-025",
    reason: "Chinese prompt ended with a broken sentence for the no-zero rule.",
    fields: {
      tags: ["Dudeney 经典挑战谜题", "Arithmetical and algebraical puzzles", "Mental Math", "Number theory", "Recreational math"],
      promptZh: "一天夜里，伦敦一名警察看到两辆出租车在可疑情形下朝相反方向驶离。这位警官格外细心警觉，便掏出记事本想记下两辆车的号码，却发现铅笔不见了。幸好他找到一小截粉笔，于是在附近码头的大门上写下了两个号码。等他巡逻回到同一地点时，他又看了看这些号码，并注意到一个奇特性质：1 到 9 这九个数字全部用到，没有任何数字重复；而这两个数相乘后，乘积亦恰好包含 1 到 9 这九个数字，且每个数字只出现一次。清晨码头的一名职员看到粉笔字后，把它们仔细擦掉了。警察已经记不起原来的号码，于是人们请教数学家，是否有已知方法可以找出所有具有这种性质的数字对，但他们也不知道。不过这个研究很有意思，于是提出了下面这个问题：哪两个数合起来正好包含 1 到 9 这九个数字，并且相乘后能得到也包含 1 到 9 这九个数字的最大乘积？数字 0 不允许出现在任何地方。",
      answer: "8,745,231 * 96 = 839,542,176.",
      answerEn: "8,745,231 * 96 = 839,542,176.",
      answerZh: "8,745,231 * 96 = 839,542,176。",
      explanation: "The maximum product is obtained from the pair \\(8,745,231\\) and \\(96\\): \\(8,745,231 \\times 96 = 839,542,176\\). One way to cut down the search is to use digital roots. Since the two factors together use the digits 1 through 9 exactly once, and the product must also use the digits 1 through 9 exactly once, the digital roots of the factors and product impose strong restrictions. The possible factor-root cases reduce to \\((3,6)\\), \\((9,9)\\), \\((2,2)\\), and \\((5,8)\\). Checking the remaining candidate splits under these restrictions gives the largest valid product above.",
      explanationEn: "The maximum product is obtained from the pair \\(8,745,231\\) and \\(96\\): \\(8,745,231 \\times 96 = 839,542,176\\). One way to cut down the search is to use digital roots. Since the two factors together use the digits 1 through 9 exactly once, and the product must also use the digits 1 through 9 exactly once, the digital roots of the factors and product impose strong restrictions. The possible factor-root cases reduce to \\((3,6)\\), \\((9,9)\\), \\((2,2)\\), and \\((5,8)\\). Checking the remaining candidate splits under these restrictions gives the largest valid product above.",
      explanationZh: "最大乘积由 \\(8,745,231\\) 与 \\(96\\) 得到：\\(8,745,231 \\times 96 = 839,542,176\\)。减少搜索量的一种方法是使用数字根。由于两个因子合起来必须恰好使用 1 到 9，乘积也必须恰好使用 1 到 9，因子和乘积的数字根会给出很强的限制。可能的因子数字根组合只剩 \\((3,6)\\)、\\((9,9)\\)、\\((2,2)\\)、\\((5,8)\\)。在这些限制下检查剩余拆分，即可得到上面的最大合法乘积。"
    }
  },
  {
    id: "dudeney-puzzles-problem-089",
    reason: "Prompt and general formulas were broken by OCR/math conversion.",
    fields: {
      category: "mentalMath",
      tags: ["Dudeney 经典挑战谜题", "Chessboard puzzles", "Mental Math"],
      promptZh: "你能准确说出棋盘上一共包含多少个正方形和其他矩形吗？换句话说，沿着分隔棋盘方格的线，能用多少种不同方式圈出一个正方形或非正方形矩形？",
      answer: "The 8 by 8 chessboard contains 1,296 rectangles in total: 204 squares and 1,092 non-square rectangles.",
      answerEn: "The 8 by 8 chessboard contains 1,296 rectangles in total: 204 squares and 1,092 non-square rectangles.",
      answerZh: "8×8 棋盘共有 1,296 个矩形，其中 204 个是正方形，1,092 个是非正方形矩形。",
      explanation: "An n by n board has n+1 vertical grid lines and n+1 horizontal grid lines. A rectangle is determined by choosing two vertical and two horizontal lines, so the total number of rectangles is \\(\\binom{n+1}{2}^2 = \\left(\\frac{n(n+1)}{2}\\right)^2\\). The number of k by k squares is \\((n-k+1)^2\\), so the number of squares is \\(\\sum_{k=1}^{n} k^2 = \\frac{n(n+1)(2n+1)}{6}\\). For n=8, this gives total rectangles \\(36^2=1296\\), squares \\(1^2+\\cdots+8^2=204\\), and non-square rectangles \\(1296-204=1092\\). In general, the non-square count is \\(\\frac{3n^4+2n^3-3n^2-2n}{12}\\).",
      explanationEn: "An n by n board has n+1 vertical grid lines and n+1 horizontal grid lines. A rectangle is determined by choosing two vertical and two horizontal lines, so the total number of rectangles is \\(\\binom{n+1}{2}^2 = \\left(\\frac{n(n+1)}{2}\\right)^2\\). The number of k by k squares is \\((n-k+1)^2\\), so the number of squares is \\(\\sum_{k=1}^{n} k^2 = \\frac{n(n+1)(2n+1)}{6}\\). For n=8, this gives total rectangles \\(36^2=1296\\), squares \\(1^2+\\cdots+8^2=204\\), and non-square rectangles \\(1296-204=1092\\). In general, the non-square count is \\(\\frac{3n^4+2n^3-3n^2-2n}{12}\\).",
      explanationZh: "一个 n×n 棋盘有 n+1 条竖线和 n+1 条横线。任意一个矩形由两条竖线和两条横线决定，所以矩形总数为 \\(\\binom{n+1}{2}^2 = \\left(\\frac{n(n+1)}{2}\\right)^2\\)。k×k 正方形有 \\((n-k+1)^2\\) 个，因此正方形总数为 \\(\\sum_{k=1}^{n} k^2 = \\frac{n(n+1)(2n+1)}{6}\\)。当 n=8 时，矩形总数为 \\(36^2=1296\\)，正方形数为 \\(1^2+\\cdots+8^2=204\\)，非正方形矩形数为 \\(1296-204=1092\\)。一般地，非正方形矩形数为 \\(\\frac{3n^4+2n^3-3n^2-2n}{12}\\)。"
    }
  },
  {
    id: "dudeney-puzzles-problem-093",
    reason: "Chinese chess terminology mistranslated mate as biological mating and omitted the move sequence.",
    fields: {
      titleZh: "93. 中国古代谜题。",
      category: "mentalMath",
      tags: ["Dudeney 经典挑战谜题", "Chessboard puzzles", "Mental Math"],
      promptZh: "下一题据说是一个有数百年历史的中国古老谜题，而且总能引起人们的兴趣。在这个棋局中，白方先走并完成将死，要求三个白子各移动一次，且只能移动一次。",
      answer: "1. R-Q6; 2. K-R7; 3. R(R6)-B6 mate.",
      answerEn: "1. R-Q6; 2. K-R7; 3. R(R6)-B6 mate.",
      answerZh: "1. R-Q6；2. K-R7；3. R(R6)-B6，将死。",
      explanationZh: "着法如下：1. R-Q6；2. K-R7；3. R(R6)-B6，将死。黑方的应着都是被迫的，因此原书没有逐一列出。"
    }
  },
  {
    id: "dudeney-puzzles-problem-098",
    reason: "Chinese prompt was machine-like, category/tags were unrelated, and answer fields were empty.",
    fields: {
      category: "mentalMath",
      tags: ["Dudeney 经典挑战谜题", "Crossing river problems", "Logic puzzle", "Mental Math"],
      promptZh: "B 上校是一位性格沉默的鳏夫，对四个女儿异常严厉，几乎到了残酷的程度。四个女儿自然心生反感。她们各有一位追求者，但父亲禁止这些年轻人登门，拦截所有信件，并把女儿看管得比以往更严。于是四位年轻人合谋，计划让四对恋人一起私奔。花园尽头的网球草坪下方流过泰晤士河。某天夜里，四个女孩从宿舍窗户安全下到地面后，众人悄悄来到河岸，那里系着上校的一条小船。他们打算乘船到对岸，再去小路上搭乘等候的车辆逃走。可是到了水边，困难立刻出现了：四个年轻人都极其嫉妒，任何人都不允许自己的未婚妻在自己不在场时与别的男子同处。小船一次只能载两个人，当然也可以由一个人划行；河中央还有一座小岛，可以临时停留。请找出让八个人最快全部过河的方法。这里“陆地”指任一河岸或小岛；船不一定每次都停岛，但必须保证任何可能停靠时也不违反嫉妒条件。",
      answer: "17 land-to-land passages are necessary and sufficient.",
      answerEn: "17 land-to-land passages are necessary and sufficient.",
      answerZh: "从一个陆地点到另一个陆地点共需 17 段，且不能更少。",
      explanation: "Dudeney's solution uses the island; with four or more jealous couples the island is necessary. One valid construction completes the transfer in 17 land-to-land passages, and no construction can do it in fewer under the stated jealousy rule. Let A, B, C, D be the men and a, b, c, d their respective partners. The source-table records the positions on the lawn, island, and far shore after each passage; the key conclusion for the question is the minimum count: 17 passages. The construction also avoids ever leaving a woman with another man unless her partner is present.",
      explanationEn: "Dudeney's solution uses the island; with four or more jealous couples the island is necessary. One valid construction completes the transfer in 17 land-to-land passages, and no construction can do it in fewer under the stated jealousy rule. Let A, B, C, D be the men and a, b, c, d their respective partners. The source-table records the positions on the lawn, island, and far shore after each passage; the key conclusion for the question is the minimum count: 17 passages. The construction also avoids ever leaving a woman with another man unless her partner is present.",
      explanationZh: "Dudeney 的解法必须使用河中的小岛；当有四对或更多情侣时，在这些嫉妒条件下小岛是必要的。设 A、B、C、D 为四位男子，a、b、c、d 为各自的未婚妻。原书给出了一张“草坪—小岛—对岸”的状态表，展示每一段之后各人的位置。核心结论是：存在一种安排可在 17 个陆地点到陆地点的 passage 内完成全部转移，而且不能更少。整个过程中，任何女子都不会在未婚夫不在场时与别的男子同处。"
    }
  },
  {
    id: "dudeney-puzzles-problem-099",
    reason: "Prompt and explanation included unrelated adjacent chapter/card-frame text.",
    fields: {
      promptEn: "The ingenious manner in which a box of treasure, consisting principally of jewels and precious stones, was stolen from Gloomhurst Castle has been handed down as a tradition in the De Gourney family. The thieves consisted of a man, a youth, and a small boy, whose only mode of escape with the box of treasure was by means of a high window. Outside the window was fixed a pulley, over which ran a rope with a basket at each end. When one basket was on the ground the other was at the window. The rope was so disposed that the persons in the basket could neither help themselves by means of it nor receive help from others. In short, the only way the baskets could be used was by placing a heavier weight in one than in the other. Now, the man weighed 195 lbs., the youth 105 lbs., the boy 90 lbs., and the box of treasure 75 lbs. The weight in the descending basket could not exceed that in the other by more than 15 lbs. without causing a descent so rapid as to be most dangerous to a human being, though it would not injure the stolen property. Only two persons, or one person and the treasure, could be placed in the same basket at one time. How did they all manage to escape and take the box of treasure with them? The puzzle is to find the shortest way of performing the feat, which in itself is not difficult. Remember, a person cannot help himself by hanging on to the rope, the only way being to go down 'with a bump,' with the weight in the other basket as a counterpoise.",
      promptZh: "格卢姆赫斯特城堡曾有一箱主要由珠宝和宝石组成的财宝被巧妙盗走，这个故事在德古尼家族中流传下来。盗贼共有三人：一名成年男子、一名青年和一个小男孩。他们带着宝箱逃走的唯一通道是一扇高窗。窗外装有一个滑轮，绳子绕过滑轮，两端各系一个篮子；一个篮子在地面时，另一个就在窗口。篮中人既不能借绳子帮助自己，也不能接受他人帮助。也就是说，篮子只能靠一边重量比另一边更大来运作。男子重 195 磅，青年重 105 磅，男孩重 90 磅，宝箱重 75 磅。若下降篮子的重量比另一边多超过 15 磅，下降速度就会快到足以危及人命；不过这不会损坏财物。每个篮子一次最多放两个人，或一人与宝箱。三人怎样全部逃走，并把宝箱也带走？要求找出最短操作方法。注意，人不能靠抓住绳子来帮自己，唯一方式是在另一篮作为配重时“颠簸”下降。",
      answer: "11 manipulations.",
      answerEn: "11 manipulations.",
      answerZh: "共 11 次操作。",
      explanation: "The best answer uses eleven manipulations: 1. Treasure down. 2. Boy down, treasure up. 3. Youth down, boy up. 4. Treasure down. 5. Man down, youth and treasure up. 6. Treasure down. 7. Boy down, treasure up. 8. Treasure down. 9. Youth down, boy up. 10. Boy down, treasure up. 11. Treasure down. Each human descent is balanced within the allowed 15 lb difference.",
      explanationEn: "The best answer uses eleven manipulations: 1. Treasure down. 2. Boy down, treasure up. 3. Youth down, boy up. 4. Treasure down. 5. Man down, youth and treasure up. 6. Treasure down. 7. Boy down, treasure up. 8. Treasure down. 9. Youth down, boy up. 10. Boy down, treasure up. 11. Treasure down. Each human descent is balanced within the allowed 15 lb difference.",
      explanationZh: "最短方法共 11 次操作：1. 宝箱下降。2. 男孩下降，宝箱上升。3. 青年下降，男孩上升。4. 宝箱下降。5. 成年男子下降，青年和宝箱上升。6. 宝箱下降。7. 男孩下降，宝箱上升。8. 宝箱下降。9. 青年下降，男孩上升。10. 男孩下降，宝箱上升。11. 宝箱下降。每一次有人下降时，两边重量差都不超过允许的 15 磅。"
    }
  },
  {
    id: "dudeney-puzzles-problem-101",
    reason: "Explanation was contaminated by the river-crossing table; source solution image was missing.",
    fields: {
      promptZh: "图中有一个由十张方块牌 A 到 10 组成的框。摆牌的孩子们希望四条边的点数和都相同，但尝试失败后以为这是不可能的。可以看到，上边、下边和左边的点数和都是 14，而右边的和是 23。其实他们想做的事是可以做到的。你能把这十张牌重新排列成同样的框形，使四条边的点数和相同吗？四边和不必是 14，可以是你选择的任何数。",
      answer: "Yes. One arrangement has side sum 18.",
      answerEn: "Yes. One arrangement has side sum 18.",
      answerZh: "可以。源书给出的一种排列使四条边的和均为 18。",
      explanation: "The ten cards have total pip sum 55. If every side summed to 14, then the four side sums would total 56. Since each corner card is counted twice, the four corners would have to sum to 56-55=1, which is impossible. Trying a side sum of 18 gives total side sum 72, so the four corner cards must sum to 72-55=17. With the corners constrained this way, a valid arrangement is shown in the source solution image. The two middle cards on the vertical sides may be interchanged without making a fundamentally different solution, and reflections are also not counted as different.",
      explanationEn: "The ten cards have total pip sum 55. If every side summed to 14, then the four side sums would total 56. Since each corner card is counted twice, the four corners would have to sum to 56-55=1, which is impossible. Trying a side sum of 18 gives total side sum 72, so the four corner cards must sum to 72-55=17. With the corners constrained this way, a valid arrangement is shown in the source solution image. The two middle cards on the vertical sides may be interchanged without making a fundamentally different solution, and reflections are also not counted as different.",
      explanationZh: "十张牌的点数总和为 55。若四条边都等于 14，则四边总和为 56；由于四张角牌各被计算两次，四个角的点数和必须为 56-55=1，这显然不可能，所以边和 14 不可能。若尝试边和 18，则四边总和为 72，四个角必须合计 72-55=17。在这个约束下可以找到有效排列，源书解答图中给出了一例。左右两条竖边的中间牌可以互换而不算本质不同；镜像排列也不算不同。",
      solutionImages: ["assets/problem-media/dudeney-puzzles/dudeney-problem-101-solution-card-frame.png"]
    }
  },
  {
    id: "dudeney-puzzles-problem-119",
    reason: "Chinese explanation omitted the subject Biggs and read as a fragment.",
    fields: {
      category: "mentalMath",
      tags: ["Dudeney 经典挑战谜题", "Unclassified problems", "Mental Math"],
      promptZh: "安德森、比格斯和卡彭特三人一起住在海边。一天，他们乘船出海，离岸约一英里时，岸上有人朝他们的方向开了一枪。枪是谁开的、为什么开枪并不重要，也没有相关信息；但我听到的事实足以构成一道有趣的小谜题。安德森只听到了枪声，比格斯只看到了枪烟，卡彭特只看到子弹击中他们附近的水面。那么问题是：他们三人中谁最先知道步枪已经开火？",
      answer: "Biggs first, Carpenter second, Anderson last.",
      answerEn: "Biggs first, Carpenter second, Anderson last.",
      answerZh: "比格斯最先知道，卡彭特第二，安德森最后。",
      explanationZh: "比格斯看到枪烟，因此最先知道；卡彭特看到子弹击中水面，因此第二个知道；安德森只听到枪声，而声音传播最慢，所以最后才知道。"
    }
  }
];

const changes = [];
const missing = [];
for (const repair of repairs) {
  const problem = problemById.get(repair.id);
  if (!problem) {
    missing.push(repair.id);
    continue;
  }

  const changedFields = [];
  for (const [field, value] of Object.entries(repair.fields)) {
    if (!sameValue(problem[field], value)) {
      problem[field] = value;
      changedFields.push(field);
    }
  }
  if (repair.fields.explanation && !repair.fields.explanationEn) {
    problem.explanationEn = repair.fields.explanation;
    if (!changedFields.includes("explanationEn")) changedFields.push("explanationEn");
  }
  if (repair.fields.answer && !repair.fields.answerEn) {
    problem.answerEn = repair.fields.answer;
    if (!changedFields.includes("answerEn")) changedFields.push("answerEn");
  }
  if (repair.fields.category || repair.fields.tags) {
    problem.classificationReviewed = true;
    problem.classificationReviewSource = "dudeney-major-triage-repair-v1";
  }

  problem.manualContentReviewed = true;
  problem.manualContentReviewSource = reviewSource;
  problem.manualContentReviewReason = repair.reason;
  problem.updatedAt = new Date().toISOString();
  changes.push({
    id: repair.id,
    titleEn: problem.titleEn,
    changedFields,
    reason: repair.reason
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  dryRun: !options.apply,
  source: relativePath(sourcePath),
  changedProblemCount: changes.length,
  missing,
  changes
};

if (options.apply) {
  fs.writeFileSync(sourcePath, `${JSON.stringify(payload, null, 2)}\n`);
  if (options.syncSource) {
    runNodeScript("scripts/rebuild-dudeney-source.mjs");
  }
  if (options.rebuild) {
    runNodeScript("scripts/build-problem-catalog.mjs");
  }
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  dryRun: report.dryRun,
  changedProblemCount: report.changedProblemCount,
  missing: report.missing.length,
  report: relativePath(reportPath)
}, null, 2));

function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [path.join(projectRoot, scriptPath)], {
    cwd: projectRoot,
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function sameValue(a, b) {
  if (Array.isArray(a) || Array.isArray(b) || (a && typeof a === "object") || (b && typeof b === "object")) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
    if (key === "apply" || key === "rebuild" || key === "syncSource") {
      parsed[key] = true;
      continue;
    }
    parsed[key] = args[index + 1];
    index += 1;
  }
  return parsed;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function relativePath(filePath) {
  return path.relative(projectRoot, filePath) || ".";
}
