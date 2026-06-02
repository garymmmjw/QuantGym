import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const bookRoot = path.resolve(process.env.QUANTGYM_BOOK_ROOT || path.join(projectRoot, "量化书籍"));
const bookDir = path.join(bookRoot, "有题目的", "Dudeney挑战谜题 Challenging Puzzles");
const englishPath = path.join(bookDir, "quant_dudeney_book.tex");
const chinesePath = path.join(bookDir, "quant_dudeney_book_zh.tex");

repairEnglishSource();
repairChineseSource();

function repairEnglishSource() {
  const entries = readEntries(englishPath);
  const tornNumber = entries[28];
  const circlingSquares = entries[29];
  if (!tornNumber || !circlingSquares) throw new Error("Dudeney English source is missing problem 29 or 30.");

  const marker = "30.CIRCLING THE SQUARES.";
  if (tornNumber.solution.includes(marker)) {
    const [problem29Solution, problem30Solution] = tornNumber.solution.split(marker);
    tornNumber.solution = problem29Solution.trim();
    circlingSquares.solution = problem30Solution.trim();
  }

  const pheasantShooting = entries[122];
  const extraPromptMarker = "\n\nto the left is understood";
  if (pheasantShooting?.prompt.includes(extraPromptMarker)) {
    pheasantShooting.prompt = pheasantShooting.prompt.split(extraPromptMarker)[0].trim();
  }
  const monstrosity = entries[93];
  const riverProblemsMarker = "\n\nCROSSING RIVER PROBLEMS";
  if (monstrosity?.prompt.includes(riverProblemsMarker)) {
    monstrosity.prompt = monstrosity.prompt.split(riverProblemsMarker)[0].trim();
  }
  entries[107].solution = "No matter whether he plays first or second, the player A, who starts the game at 55, must win. Assuming that B adopts the very best lines of play in order to prolong as much as possible his existence, A, if he has first move, can always on his 12th move capture B; and if he has the second move, A can always on his 14th move make the capture. His point is always to get diagonally in line with his opponent, and by going to 33, if he has first move, he prevents B getting diagonally in line with himself. Here are two good games. The number in front of the hyphen is always A's move; that after the hyphen is B's:— 33-8, 32-15, 31-22, 30-21, 29-14, 22-7, 15-6, 14-2, 7-3, 6-4, 11-, and A must capture on his next (12th) move. Or: -13, 54-20, 53-27, 52-34, 51-41, 50-34, 42-27, 35-20, 28-13, 21-6, 14-2, 7-3, 6-4, 11-, and A must capture on his next (14th) move.";
  entries[108].prompt = entries[108].prompt.split("\n\nMAGIC SQUARE PROBLEMS")[0].trim();
  entries[108].solution = [
    "If you form the three heaps (and are therefore the second to draw), any one of the following thirteen groupings will give you a win if you play correctly: 15, 14, 1; 15, 13, 2; 15, 12, 3; 15, 11, 4; 15, 10, 5; 15, 9, 6; 15, 8, 7; 14, 13, 3; 14, 11, 5; 14, 9, 7; 13, 11, 6; 13, 10, 7; 12, 11, 7.",
    "",
    "The beautiful general solution of this problem is as follows. Express the number in every heap in powers of 2, avoiding repetitions and remembering that 2^0 = 1. Then if you so leave the matches to your opponent that there is an even number of every power, you can win. And if at the start you leave the powers even, you can always continue to do so throughout the game.",
    "",
    "Take, as example, the last grouping given above, 12, 11, 7. Expressed in powers of 2 we have:",
    "12 = 8 4 - -",
    "11 = 8 - 2 1",
    "7 = - 4 2 1",
    "",
    "As there are thus two of every power, you must win. Say your opponent takes 7 from the 12 heap. He then leaves:",
    "5 = - 4 - 1",
    "11 = 8 - 2 1",
    "7 = - 4 2 1",
    "",
    "Here the powers are not all even in number, but by taking 9 from the 11 heap you immediately restore your winning position:",
    "5 = - 4 - 1",
    "2 = - - 2 -",
    "7 = - 4 2 1",
    "",
    "And so on to the end. This solution is quite general, and applies to any number of matches and any number of heaps. A correspondent informs me that this puzzle game was first propounded by Mr. W. M. F. Mellor, but when or where it was published I have not been able to ascertain."
  ].join("\n");
  entries[109].solution = "The rows, columns, and diagonals should each add up 15. Probably the reader at first set himself an impossible task through reading into these conditions something which is not there, a common error in puzzle-solving. If I had said \"a different figure,\" instead of \"a different number,\" it would have been quite impossible with the 8 placed anywhere but in a corner. And it would have been equally impossible if I had said \"a different whole number.\" But a number may, of course, be fractional, and therein lies the secret of the puzzle. The arrangement shown in the figure will be found to comply exactly with the conditions: all the numbers are different, and the square adds up 15 in all the required eight ways.";

  writeEntries(englishPath, entries);
}

function repairChineseSource() {
  const entries = readEntries(chinesePath);
  if (entries.length !== 123) {
    throw new Error(`Expected 123 Chinese Dudeney entries; found ${entries.length}.`);
  }

  let splitCount = 0;
  for (const entry of entries) {
    const split = splitChineseTitleTail(entry.title);
    if (!split) continue;
    entry.title = split.title;
    entry.prompt = `${split.tail}\n${entry.prompt.trim()}`.trim();
    splitCount += 1;
  }

  entries[0].solution = "杰克斯带了 7 头动物到市场，霍奇带了 11 头，杜兰特带了 21 头。因此三人一共带了 39 头动物。";
  entries[5].solution = "妈妈的年龄是 29 年 2 个月，爸爸的年龄是 35 岁，孩子汤米的年龄是 5 年 10 个月。三人的年龄相加正好是 70 年。爸爸的年龄是儿子的 6 倍；再过 23 年 4 个月，三人的年龄总和将达到 140 年，而汤米也正好是父亲年龄的一半。";
  entries[17].solution = "一列火车的速度正好是另一列的两倍。";
  entries[28].prompt = "有一天，我手里有一张标签，上面用大号数字写着 3 0 2 5。它不小心从中间撕成两半，一片上是 3 0，另一片上是 2 5，如图所示。我看着这两片标签时无意中算了一下，发现一个小小的奇特性质：如果把 30 和 25 相加再平方，得到的正是标签上原来的完整数字。因此，30 加 25 等于 55，而 55 乘以 55 等于 3025。是不是很有趣？现在的问题是：找出另一个由四个互不相同的数字组成的数，它也可以从中间分开并产生同样的结果。";
  entries[28].solution = [
    "满足题目全部条件的另一个数是 9,801。把它从中间分成 98 和 01，相加得 99；99 的平方正是 9,801。2,025 其实也有同样性质，只是题目要求四个数字各不相同，所以排除了它。",
    "",
    "一般解法也很有趣。设撕开标签后每一半有 n 位。若把 10^n - 1 的质因数中除 3 以外的每个指数都加 1（并把 1 看作指数恒为 1 的因子），所得乘积就是解的个数。六位标签时 n=3，10^3 - 1 = 999；不计其中的 3^3，只剩因子 37，因此共有 2 x 2 = 4 个解。它们包括特殊情形 98-01、00-01、998-001、000-001 等。",
    "",
    "求解时，把 10^3 - 1 按所有可能方式分解，并始终把 3 的幂放在一起，例如 37 x 27 和 999 x 1。由方程 37x = 27y + 1 得 x = 19, y = 26，于是 19 x 37 = 703，其平方给出标签 494,209。互补解可由 10^3 - 703 = 297 得到，平方为 088,209（左侧这些无意义的零必须保留）。特殊情形 999 x 1 可直接得到 998,001；其互补数是前面带五个零的 000,001。这样就得到四个解。"
  ].join("\n");
  entries[29].prompt = "这个谜题要求在十个方格中各放入一个不同的数，使任意两个相邻数字的平方和，都等于与它们直径相对的两个数字的平方和。题中已经作为例子放好的四个数字必须保持不动。16 的平方是 256，2 的平方是 4，两者相加为 260；14 的平方是 196，8 的平方是 64，两者相加也为 260。照同样方式，B 与 C 的平方和应等于 G 与 H 的平方和（总和不一定是 260），A 与 K 应等于 F 与 E，H 与 I 应等于 C 与 D，依此类推。你要做的就是填入余下六个数字。不允许使用分数，并且可以证明没有任何数字需要超过两位。";
  entries[29].solution = [
    "这个题初看似乎有些困难，实际上相当直接，而且已经给出的四个数字会让它更容易。首先可以发现，直径相对的两个方格有相同的平方差。例如图中 14 的平方与 2 的平方之差是 192，16 的平方与 8 的平方之差也是 192；任何合法排列都必须满足这一点。",
    "",
    "还要记住：两个连续整数平方的差，总是较小数的两倍再加 1；任意两个数平方的差，都等于两数之差乘以两数之和。因此 5^2 - 4^2 = (2 x 4) + 1 = 9，而 7^2 - 3^2 = (7 + 3)(7 - 3) = 40。",
    "",
    "上面的 192 可以分成五对不同的偶因数：2 x 96、4 x 48、6 x 32、8 x 24、12 x 16。各自除以 2 后得到 1 x 48、2 x 24、3 x 16、4 x 12、6 x 8。每一对的差与和依次给出 47、49；22、26；13、19；8、16；2、14。这些就是所需数字，其中四个已经在图中给出。余下六个数可以用六种方式放置；其中一种按顺时针读为：16、2、49、22、19、8、14、47、26、13。",
    "",
    "还有一点值得注意：在这种圆形排列中，直径相对数字的差按固定节奏增加；除 6 格圆外，最初的差为 4 和 6，后面的差由隔一个的前项加倍得到。在本例中，第一个差是 2，之后增加 4、6、8、12。若允许分数，当然可以得到无限多个解。不过这种圆中的方格数必须形如 4n + 6，也就是 6 加上 4 的倍数。"
  ].join("\n");
  entries[90].prompt = "按图中所示摆好局面。题目的条件是：白方先走，并在六步内将死。虽然变化相当复杂，但走法可以压缩成很少几行来说明；这里只先指出，白方前两步不能改变。";
  entries[90].solution = [
    "走法如下：",
    "",
    "白方：1. P to K 4th；黑方：任意一步。",
    "白方：2. Q to Kt 4th；黑方：除 KB 线以外任意一步。",
    "白方：3. Q to Kt 7th；若黑王走到 royal row，白方 4. B to Kt 5th，黑方任意，随后两步内将死。",
    "若第 3 手黑王没有走到 royal row，则白方 4. P to Q 4th，黑方任意，随后两步内将死。",
    "",
    "注 (a)：如果黑方第 2 手走在 KB 线上，则白方 3. Q to Q 7th。若黑王走到 royal row，白方 4. P to Q Kt 3rd，黑方任意，随后两步内将死；若黑王没有走到 royal row，则白方 4. P to Q 4th，黑方任意，随后两步内将死。",
    "",
    "这里的 royal row 指棋局开始时国王所在的那一横行。当然，如果黑方应对很差，在某些位置可能更早被将死；但上述路线覆盖了黑方可能造成的所有变化。"
  ].join("\n");
  entries[93].prompt = "一个圣诞夜，我乘火车去南部某郡的一个小地方。车厢里挤满了人，乘客们紧紧挤在一起。我坐在角落座位旁边的那位乘客，正在一个便于放进口袋的小折叠棋盘上仔细研究黑白双方摆出的一个局面（见第 92 题“将死！”），我也几乎无法避免看见它。局面就是这样：我的同行者忽然转过头，看见我脸上困惑的表情。'你会下棋吗？'他问。'会一点。那是什么？一个问题吗？' '问题？不，是一盘棋。' '不可能！'我相当粗鲁地叫道，'这个局面简直是个怪物！'他从口袋里拿出一张明信片给我。一面写着地址，另一面写着：'43. K to Kt 8。' '这是一盘通信棋，'他叫道，'这是我朋友最后一步，我正在考虑怎么回。'他继续滔滔不绝地解释这种奇特局面；后来我发现，确实可以在四十三步后达到这个局面。读者能构造出这样的着法序列吗？注意黑方的王翼象永远不能移动；白方又是怎样让自己的车和王翼象到达现在位置的？没有让子，每一步都必须完全合法。";
  entries[93].solution = [
    "白方、黑方走法如下：1. P to KB 4 / P to QB 3；2. K to B 2 / Q to R 4；3. K to K 3 / K to Q sq；4. P to B 5 / K to B 2；5. Q to K sq / K to Kt 3；6. Q to Kt 3 / Kt to QR 3；7. Q to Kt 8 / P to KR 4；8. Kt to KB 3 / R to R 3；9. Kt to K 5 / R to Kt 3；10. Q takes B / R to Kt 6, ch；11. P takes R / K to Kt 4；12. R to R 4 / P to B 3；13. R to Q 4 / P takes Kt；14. P to QKt 4 / P takes R, ch；15. K to B 4 / P to R 5；16. Q to K 8 / P to R 6；17. Kt to B 3, ch / P takes Kt；18. B to R 3 / P to R 7；19. R to Kt sq / P to R 8 (Q)；20. R to Kt 2 / P takes R；21. K to Kt 5 / Q to KKt 8；22. Q to R 5 / K to R 5；23. P to Kt 5 / R to B sq；24. P to Kt 6 / R to B 2；25. P takes R / P to Kt 8 (B)；",
    "",
    "26. P to B 8 (R) / Q to B 2；27. B to Q 6 / Kt to Kt 5；28. K to Kt 6 / K to R 6；29. R to R 8 / K to Kt 7；30. P to R 4 / Q (Kt 8) to Kt 3；31. P to R 5 / K to B 8；32. P takes Q / K to Q 8；33. P takes Q / K to K 8；34. K to B 7 / Kt to KR 3, ch；35. K to K 8 / B to R 7；36. P to B 6 / B to Kt sq；37. P to B 7 / K takes B；38. P to B 8 (B) / Kt to Q 4；39. B to Kt 8 / Kt to B 3, ch；40. K to Q 8 / Kt to K sq；41. P takes Kt (R) / Kt to B 2, ch；42. K to B 7 / Kt to Q sq；43. Q to B 7, ch / K to Kt 8。",
    "",
    "这样就到达题中局面。具体走法顺序并非唯一，可以有很大变化；但虽然已有许多人尝试，目前还没有人能把我的步数再减少。"
  ].join("\n");
  entries[107].solution = "无论 A 先走还是后走，从 55 开始的 A 都必胜。假设 B 采用最佳路线，尽量延长自己的存活时间：若 A 先走，他总能在第 12 步吃掉 B；若 A 后走，他总能在第 14 步吃掉 B。关键始终是让自己与对手处在同一条对角线上；如果 A 先走，他走到 33 就能防止 B 与自己形成对角线。下面给出两局最佳示例。连字符前的数字总是 A 的着法，连字符后的数字是 B 的着法：33-8, 32-15, 31-22, 30-21, 29-14, 22-7, 15-6, 14-2, 7-3, 6-4, 11-，A 下一步（第 12 步）必吃。另一局为：-13, 54-20, 53-27, 52-34, 51-41, 50-34, 42-27, 35-20, 28-13, 21-6, 14-2, 7-3, 6-4, 11-，A 下一步（第 14 步）必吃。";
  entries[108].prompt = "这是一个规则简单得近乎幼稚、但很值得研究的小游戏。斯塔布斯先生在自己和朋友威尔逊先生之间拉过一张小桌子，拿出一盒火柴，数出三十根。'这里有三十根火柴，'他说，'我把它们分成三堆不相等的堆。让我看看，碰巧是 14、11 和 5。现在，两名玩家轮流从任意一堆中拿走任意数量的火柴，拿走最后一根火柴的人输。就这些！我来和你玩，威尔逊。我已经分好了堆，所以你先拿。'威尔逊先生说：'既然我可以拿任意数量，那我就表现一下我一贯的克制，把 14 那一堆全拿走吧。'斯塔布斯说：'这是最糟糕的走法，因为马上就输了。我从 11 那堆中拿走 6 根，留下两堆相等的 5；留下两堆相等的火柴就是必胜局面（唯一例外是 1,1），因为你在一堆中怎么拿，我都能在另一堆中照做。你留下一堆 4，我就在另一堆也留下 4；你留下一堆 2，我就在另一堆也留下 2；如果你只在一堆中留下 1，那我就把另一堆全拿走；如果你拿光一堆，我就把另一堆拿到只剩 1。你绝不能留下两堆，除非它们是相等且大于 1,1 的两堆。我们重新开始。'威尔逊说：'很好，那我从 14 中拿走 6，留给你 8、11、5。'随后斯塔布斯留下 8、11、3；威尔逊留下 8、5、3；斯塔布斯留下 6、5、3；威尔逊留下 4、5、3；斯塔布斯留下 4、5、1；威尔逊留下 4、3、1；斯塔布斯留下 2、3、1；威尔逊留下 2、1、1；斯塔布斯把它变成 1、1、1。'现在很清楚我必赢，'斯塔布斯说，'因为你必须拿 1，然后我拿 1，把最后一根留给你。你从来没有机会。开局时共有十三种不同分组可以保证必胜。事实上，14、11、5 这组三堆就是必胜的，因为无论对手怎样走，你总能转到另一个必胜分组，如此一直推进到最后一根火柴。'";
  entries[108].solution = [
    "如果你负责分成三堆（因此由对方先拿），只要正确应对，下面十三种分组中的任意一种都会使你获胜：15, 14, 1；15, 13, 2；15, 12, 3；15, 11, 4；15, 10, 5；15, 9, 6；15, 8, 7；14, 13, 3；14, 11, 5；14, 9, 7；13, 11, 6；13, 10, 7；12, 11, 7。",
    "",
    "这个问题漂亮的一般解法如下：把每一堆的数量表示成 2 的幂之和，不重复使用同一个幂，并记住 2^0 = 1。若你能把局面留给对方，使每一种 2 的幂出现偶数次，你就能赢；如果开局时这些幂已经成偶数次出现，你就总能在整个游戏中保持这一点。",
    "",
    "以上面最后一组 12、11、7 为例。写成 2 的幂：",
    "12 = 8 4 - -",
    "11 = 8 - 2 1",
    "7 = - 4 2 1",
    "",
    "每一种幂都出现两次，所以你必胜。假设对手从 12 那堆拿走 7 根，留下：",
    "5 = - 4 - 1",
    "11 = 8 - 2 1",
    "7 = - 4 2 1",
    "",
    "这时各幂出现次数不再全为偶数，但你只要从 11 那堆拿走 9 根，就立刻恢复必胜局面：",
    "5 = - 4 - 1",
    "2 = - - 2 -",
    "7 = - 4 2 1",
    "",
    "如此继续直到结束。这个解法完全一般，适用于任意数量的火柴和任意数量的堆。有通信者告诉我，这个游戏最早由 W. M. F. Mellor 先生提出，但我无法确定它发表的时间和地点。"
  ].join("\n");
  entries[109].solution = "各行、各列和两条对角线的和都应为 15。读者一开始很可能把题目中并不存在的限制读进去了，于是给自己设定了不可能完成的任务，这是解谜时常见的错误。如果我说的是'不同的数字字符'而不是'不同的数'，那么 8 不在角上时就完全不可能；如果我说的是'不同的整数'，同样不可能。但数当然可以是分数，这正是本题的秘密。图中所示排列完全符合条件：所有数都不同，并且这个方阵在要求的八个方向上和都为 15。";
  entries[117].prompt = "我偶然读到一本法国数学著作，其中有如下说法：'M. Pfeffermann 构造了一个非常了不起的 8 阶二度幻方。'换句话说，他把前 64 个正整数排在棋盘格中，使每一行、每一列以及两条主对角线的数字之和都相同；更进一步，如果把所有数字都替换成它们的平方，这个方阵仍然是幻方。我立刻着手研究这个问题。虽然它相当困难，但在求解过程中可以发现一些奇特而美丽的规律。读者也可以试着解一解。";
  entries[117].solution = [
    "下面是我构造出的方阵。按原数计算，幻方常数为 260；如果把每个位置上的数都换成它的平方，新的幻方常数为 11,180。读者可以自行写出这个二次幻方。",
    "",
    "解法的关键在于一个漂亮规律：如果八个数的和为 260，平方和为 11,180，那么把这八个数分别换成与 65 互补的数后，仍有同样性质。例如 1 + 18 + 23 + 26 + 31 + 48 + 56 + 57 = 260，这些数的平方和为 11,180。因此用 65 分别减去这些数，得到的 64 + 47 + 42 + 39 + 34 + 17 + 9 + 8 也会和为 260，平方和为 11,180。",
    "",
    "注意十六个小方阵中，每一个小方阵的两条对角线之和都是 65。全阵中有四列、四行，以及与它们互补的四列、四行。取第 2、1、4、3 行中的数，可排列为：",
    "",
    "1 8 28 29 42 47 51 54\n2 7 27 30 41 48 52 53\n3 6 26 31 44 45 49 56\n4 5 25 32 43 46 50 55",
    "",
    "这里每一列都含有四个连续数字，并以循环方式排列，其中四列朝一个方向运行，另外四列朝相反方向运行。方阵的第 2、5、3、8 列也可以作类似分组。真正困难的部分，在于发现这些数组的约束、四阶小方阵中互补数的配对，以及对角线的形成方式。不过一旦给出正确解，如上所示，它便揭示了这个谜题最重要的线索。我倾向于认为，这个二度幻方是幻方中最优雅的构造之一；我也相信低于 8 阶时无法构造这样的幻方。"
  ].join("\n");

  writeEntries(chinesePath, entries);
  console.log(`Split ${splitCount} Chinese subsection title tail(s).`);
}

function splitChineseTitleTail(title) {
  const match = String(title || "").match(/^(\d+\.\s*[^。！？]+[。！？])(.{2,})$/);
  if (!match) return null;
  const normalizedTitle = match[1].trim();
  const tail = match[2].trim();
  if (!tail) return null;
  return { title: normalizedTitle, tail };
}

function readEntries(filePath) {
  const tex = fs.readFileSync(filePath, "utf8").replace(/\0/g, "");
  const regex = /\\subsection\{([^}]*)\}\s*\n\s*\\begin\{problembox\}\s*([\s\S]*?)\\end\{problembox\}\s*\n\s*\\solution\s*([\s\S]*?)(?=\n\\subsection\{|\n\\end\{document\}|$)/g;
  const entries = [];
  let match;
  while ((match = regex.exec(tex))) {
    entries.push({
      matchStart: match.index,
      matchEnd: regex.lastIndex,
      title: match[1].trim(),
      prompt: match[2].trim(),
      solution: match[3].trim()
    });
  }
  if (!entries.length) throw new Error(`No problem entries found in ${filePath}`);
  const prefix = tex.slice(0, entries[0].matchStart).replace(/\s+$/, "");
  const suffix = tex.slice(entries.at(-1).matchEnd).replace(/^\s+/, "");
  return Object.assign(entries, { prefix, suffix });
}

function writeEntries(filePath, entries) {
  const body = entries.map((entry) => [
    `\\subsection{${entry.title}}`,
    "",
    "\\begin{problembox}",
    entry.prompt.trim(),
    "\\end{problembox}",
    "",
    "\\solution",
    entry.solution.trim()
  ].join("\n")).join("\n\n");
  const next = `${entries.prefix}\n\n${body}\n\n${entries.suffix.trim()}\n`;
  const current = fs.readFileSync(filePath, "utf8");
  if (next !== current) fs.writeFileSync(filePath, next);
}
