import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const raw = String.raw;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/red-book/problems.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-quality-review/red-book-batch-003-reviewed-repairs-report.json");
const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const problemById = new Map(problems.map((problem) => [String(problem.id || ""), problem]));
const reviewSource = "llm-full-major-triage-reviewed-repair-red-book-batch-003-2026-06-02";

const algorithmTags = [
  "红宝书 Quant Job Interview Questions And Answers",
  "Chapter 5",
  "Numerical Techniques and Algorithms",
  "LeetCode",
  "algorithm"
];
const cppTags = [
  "红宝书 Quant Job Interview Questions And Answers",
  "Chapter 7",
  "Coding in C++",
  "C++ Programming",
  "cpp"
];
const probabilityTags = [
  "红宝书 Quant Job Interview Questions And Answers",
  "Chapter 7",
  "Coding in C++",
  "Probability/Expectation",
  "probability"
];
const optionTags = [
  "红宝书 Quant Job Interview Questions And Answers",
  "Chapter 5",
  "Numerical Techniques and Algorithms",
  "Option",
  "monte-carlo"
];

const repairs = [
  {
    id: "red-book-problem-119",
    reason: "Missing-number solution had corrupted Chinese code and no direct answer field.",
    fields: {
      titleEn: "Question 5.4 - Find the missing number among 1 to 10000",
      titleZh: "问题 5.4 - 在 1 到 10000 中找出缺失数字",
      category: "leetcode",
      tags: algorithmTags,
      answer: "Use the checksum identity. For numbers 1 through N with one value missing, return N(N+1)/2 minus the sum of the supplied values. This is O(N) time and O(1) extra memory.",
      answerZh: "使用求和恒等式。若 1 到 N 中缺失一个数，则返回 N(N+1)/2 减去输入数组之和。时间复杂度 O(N)，额外空间 O(1)。",
      promptZh: "给定 1 到 10000 中的 9999 个不同整数，写一个在内存和计算时间上都高效的例程，找出缺失的那个数。",
      explanation: raw`Let $N=10000$. The sum of all integers from $1$ to $N$ is
$$\frac{N(N+1)}{2}.$$
If exactly one value is missing, the input sum is lower than this total by precisely that missing value. Therefore:

    int findMissing(const std::vector<int>& numbers) {
        long long n = static_cast<long long>(numbers.size()) + 1;
        long long total = n * (n + 1) / 2;
        long long seen = 0;
        for (int x : numbers) seen += x;
        return static_cast<int>(total - seen);
    }

The algorithm makes one pass through the data and stores only two sums. For larger integer ranges, use a sufficiently wide integer type to avoid overflow.`,
      explanationZh: raw`令 $N=10000$。从 $1$ 到 $N$ 的整数和为
$$\frac{N(N+1)}{2}.$$
如果恰好缺失一个值，输入数组之和会比完整总和少这个缺失值。因此：

    int findMissing(const std::vector<int>& numbers) {
        long long n = static_cast<long long>(numbers.size()) + 1;
        long long total = n * (n + 1) / 2;
        long long seen = 0;
        for (int x : numbers) seen += x;
        return static_cast<int>(total - seen);
    }

该算法只扫描一遍数组，只保存两个求和值。若整数范围更大，应使用足够宽的整数类型以避免溢出。`
    }
  },
  {
    id: "red-book-problem-120",
    reason: "Date-increment algorithm translation contained broken C++ fragments and leap-year logic needed a clean presentation.",
    fields: {
      titleEn: "Question 5.5 - Increment a date by n days",
      titleZh: "问题 5.5 - 将日期增加 n 天",
      category: "leetcode",
      tags: algorithmTags,
      answer: "Use a leap-year helper, a days-in-month helper, and repeatedly consume the remaining days in the current month. This handles leap years, century years, and month/year rollover.",
      answerZh: "使用闰年判断函数、每月天数函数，并逐段消耗当前月份剩余天数。这样可以正确处理闰年、世纪年以及月/年进位。",
      promptZh: "写一个算法，将给定日期增加 n 天。算法应正确处理闰年以及不能被 400 整除的世纪年。",
      explanation: raw`The leap-year rule is: a year divisible by $4$ is a leap year, except years divisible by $100$ are not leap years unless they are also divisible by $400$.

    bool isLeap(int y) {
        return (y % 4 == 0) && (y % 100 != 0 || y % 400 == 0);
    }

    int daysInMonth(int y, int m) {
        static const int days[] = {31,28,31,30,31,30,31,31,30,31,30,31};
        if (m == 2 && isLeap(y)) return 29;
        return days[m - 1];
    }

    void addDays(int& y, int& m, int& d, int n) {
        while (n > 0) {
            int left = daysInMonth(y, m) - d;
            if (n <= left) {
                d += n;
                return;
            }
            n -= left + 1;
            d = 1;
            if (++m == 13) {
                m = 1;
                ++y;
            }
        }
    }

This version is faster than adding one day at a time when $n$ is large, because it jumps month by month.`,
      explanationZh: raw`闰年规则是：能被 $4$ 整除的年份是闰年；但能被 $100$ 整除的世纪年不是闰年，除非它也能被 $400$ 整除。

    bool isLeap(int y) {
        return (y % 4 == 0) && (y % 100 != 0 || y % 400 == 0);
    }

    int daysInMonth(int y, int m) {
        static const int days[] = {31,28,31,30,31,30,31,31,30,31,30,31};
        if (m == 2 && isLeap(y)) return 29;
        return days[m - 1];
    }

    void addDays(int& y, int& m, int& d, int n) {
        while (n > 0) {
            int left = daysInMonth(y, m) - d;
            if (n <= left) {
                d += n;
                return;
            }
            n -= left + 1;
            d = 1;
            if (++m == 13) {
                m = 1;
                ++y;
            }
        }
    }

当 $n$ 较大时，这个版本比逐日累加更快，因为它按月份跳转。`
    }
  },
  {
    id: "red-book-problem-122",
    reason: "Histogram-maker code and Chinese explanation had OCR variable-name corruption.",
    fields: {
      titleEn: "Question 5.7 - Build a histogram",
      titleZh: "问题 5.7 - 实现直方图生成器",
      category: "leetcode",
      tags: algorithmTags,
      answer: "Find min and max, choose a bucket width, initialize bucket counts, and place each value into its bucket with clamping for the maximum value. The runtime is O(n+b) for n values and b buckets.",
      answerZh: "先找最小值和最大值，再确定桶宽，初始化桶计数，并把每个数放入对应桶；最大值需要做边界截断。对 n 个数和 b 个桶，时间复杂度为 O(n+b)。",
      promptZh: "实现一个直方图生成器。",
      explanation: raw`A robust uniform-bucket histogram has three steps:

    void histogram(const std::vector<double>& values, int bucketCount,
                   std::vector<double>& bucketLeft,
                   std::vector<int>& count) {
        double lo = *std::min_element(values.begin(), values.end());
        double hi = *std::max_element(values.begin(), values.end());
        double width = (hi - lo) / bucketCount;

        bucketLeft.resize(bucketCount);
        count.assign(bucketCount, 0);
        for (int i = 0; i < bucketCount; ++i) {
            bucketLeft[i] = lo + i * width;
        }

        for (double x : values) {
            int k = width == 0.0 ? 0 : static_cast<int>((x - lo) / width);
            if (k < 0) k = 0;
            if (k >= bucketCount) k = bucketCount - 1;
            ++count[k];
        }
    }

The clamping matters because the maximum value would otherwise fall just outside the last bucket when the index is computed by division.`,
      explanationZh: raw`一个稳健的等宽桶直方图可以分三步：

    void histogram(const std::vector<double>& values, int bucketCount,
                   std::vector<double>& bucketLeft,
                   std::vector<int>& count) {
        double lo = *std::min_element(values.begin(), values.end());
        double hi = *std::max_element(values.begin(), values.end());
        double width = (hi - lo) / bucketCount;

        bucketLeft.resize(bucketCount);
        count.assign(bucketCount, 0);
        for (int i = 0; i < bucketCount; ++i) {
            bucketLeft[i] = lo + i * width;
        }

        for (double x : values) {
            int k = width == 0.0 ? 0 : static_cast<int>((x - lo) / width);
            if (k < 0) k = 0;
            if (k >= bucketCount) k = bucketCount - 1;
            ++count[k];
        }
    }

截断边界很重要，因为用除法计算桶编号时，最大值可能刚好落在最后一个桶之外。`
    }
  },
  {
    id: "red-book-problem-124",
    reason: "Airplane seating prompt and Monte Carlo answer were corrupted and answer fields were empty.",
    fields: {
      titleEn: "Question 5.9 - Simulate the airplane seating problem",
      titleZh: "问题 5.9 - 模拟飞机座位问题",
      category: "probabilityExpectation",
      tags: [
        "红宝书 Quant Job Interview Questions And Answers",
        "Chapter 5",
        "Numerical Techniques and Algorithms",
        "Probability/Expectation",
        "monte-carlo"
      ],
      answer: "The true probability is 1/2. A Monte Carlo simulation should randomly seat passenger 1, then let each passenger take their own seat if available and otherwise choose uniformly among open seats; the simulated frequency converges to about 0.5.",
      answerZh: "真实概率为 1/2。蒙特卡罗模拟中，先让第 1 位乘客随机选座；之后每位乘客若自己的座位空着就坐自己的座位，否则在空座中均匀随机选择。模拟频率会收敛到约 0.5。",
      promptEn: "In the airplane seating problem, the first of 100 passengers sits in a random seat. Each later passenger sits in their own seat if it is free and otherwise chooses a random free seat. What is the probability that the last passenger sits in their own seat? Write C++-style pseudo-code for a Monte Carlo simulation.",
      promptZh: "飞机座位问题：100 位乘客依次登机，第 1 位乘客随机选一个座位；之后每位乘客若自己的座位空着就坐自己的座位，否则在所有空座中随机选一个。最后一位乘客坐到自己座位的概率是多少？请写 C++ 风格伪代码做蒙特卡罗模拟。",
      explanation: raw`The known analytic answer is $1/2$: at each relevant step, the process only cares whether seat 1 or seat 100 is taken first.

A simulation should choose uniformly among currently empty seats:

    double simulate(int passengers, int trials) {
        int success = 0;
        for (int t = 0; t < trials; ++t) {
            std::vector<int> freeSeats(passengers);
            std::iota(freeSeats.begin(), freeSeats.end(), 0);

            auto takeRandomSeat = [&]() {
                int k = rand() % freeSeats.size();
                int seat = freeSeats[k];
                freeSeats.erase(freeSeats.begin() + k);
                return seat;
            };

            takeRandomSeat(); // passenger 0
            for (int p = 1; p < passengers - 1; ++p) {
                auto it = std::find(freeSeats.begin(), freeSeats.end(), p);
                if (it != freeSeats.end()) freeSeats.erase(it);
                else takeRandomSeat();
            }
            if (std::find(freeSeats.begin(), freeSeats.end(), passengers - 1) != freeSeats.end()) {
                ++success;
            }
        }
        return static_cast<double>(success) / trials;
    }

For a large number of trials, the estimate should be close to $0.5$.`,
      explanationZh: raw`解析答案为 $1/2$：在关键过程中，只需要看第 1 个座位和第 100 个座位哪一个先被占用。

模拟时应在当前空座中均匀随机选择：

    double simulate(int passengers, int trials) {
        int success = 0;
        for (int t = 0; t < trials; ++t) {
            std::vector<int> freeSeats(passengers);
            std::iota(freeSeats.begin(), freeSeats.end(), 0);

            auto takeRandomSeat = [&]() {
                int k = rand() % freeSeats.size();
                int seat = freeSeats[k];
                freeSeats.erase(freeSeats.begin() + k);
                return seat;
            };

            takeRandomSeat(); // 第 1 位乘客
            for (int p = 1; p < passengers - 1; ++p) {
                auto it = std::find(freeSeats.begin(), freeSeats.end(), p);
                if (it != freeSeats.end()) freeSeats.erase(it);
                else takeRandomSeat();
            }
            if (std::find(freeSeats.begin(), freeSeats.end(), passengers - 1) != freeSeats.end()) {
                ++success;
            }
        }
        return static_cast<double>(success) / trials;
    }

试验次数足够大时，估计值应接近 $0.5$。`
    }
  },
  {
    id: "red-book-problem-125",
    reason: "Kadane algorithm code was garbled and answer fields were empty.",
    fields: {
      titleEn: "Question 5.10 - Maximum subarray sum",
      titleZh: "问题 5.10 - 最大子数组和",
      category: "leetcode",
      tags: algorithmTags,
      answer: "Use Kadane's algorithm: scan left to right, keep the best subarray ending at the current position, and update the global best. This is O(n) time and O(1) extra space.",
      answerZh: "使用 Kadane 算法：从左到右扫描，维护“以当前位置结尾的最佳子数组”，并更新全局最优。时间复杂度 O(n)，额外空间 O(1)。",
      promptZh: "给定一个包含正数和负数的实数数组，找出元素和最大的连续子数组。",
      explanation: raw`At index $i$, either the best subarray ending at $i$ extends the best subarray ending at $i-1$, or it starts fresh at $i$.

    double bestSubarraySum(const std::vector<double>& a) {
        double best = a[0];
        double endingHere = a[0];
        for (size_t i = 1; i < a.size(); ++i) {
            endingHere = std::max(a[i], endingHere + a[i]);
            best = std::max(best, endingHere);
        }
        return best;
    }

This version handles the all-negative case correctly: it returns the least negative single element, not zero.`,
      explanationZh: raw`在位置 $i$，以 $i$ 结尾的最佳子数组要么延续以 $i-1$ 结尾的最佳子数组，要么从 $i$ 重新开始。

    double bestSubarraySum(const std::vector<double>& a) {
        double best = a[0];
        double endingHere = a[0];
        for (size_t i = 1; i < a.size(); ++i) {
            endingHere = std::max(a[i], endingHere + a[i]);
            best = std::max(best, endingHere);
        }
        return best;
    }

这个版本能正确处理全为负数的情况：返回最大的那个负数，而不是返回零。`
    }
  },
  {
    id: "red-book-problem-126",
    reason: "Sorting lower-bound proof had corrupted formulas and mistranslated symbols.",
    fields: {
      titleEn: "Question 5.11 - Lower bound for comparison sorting",
      titleZh: "问题 5.11 - 比较排序的下界",
      category: "leetcode",
      tags: algorithmTags,
      answer: raw`For arbitrary comparable keys, any comparison sort needs
$$\Omega(n\log n)$$
comparisons in the worst case, because it must distinguish among $n!$ possible input orders. Linear-time sorting is only possible under extra assumptions, such as bounded integer keys for counting sort.`,
      answerZh: raw`对任意可比较元素，任何比较排序在最坏情况下都需要
$$\Omega(n\log n)$$
次比较，因为它必须区分 $n!$ 种可能输入顺序。线性时间排序只有在有额外假设时才可能，例如整数键范围有界时可用计数排序。`,
      promptZh: "假设有人声称可以在 O(n) 时间内对 n 个任意数字排序。证明这个说法在比较排序模型下是错的。",
      explanation: raw`A comparison sort can be represented as a decision tree. Each comparison has two outcomes, so a decision tree with $m$ comparisons has at most $2^m$ leaves.

For $n$ distinct arbitrary inputs, there are $n!$ possible orderings. A correct sorter must be able to produce a different ordering for each possible permutation, so its decision tree must have at least $n!$ leaves:
$$2^m\ge n!.$$
Therefore
$$m\ge \log_2(n!).$$
By Stirling's approximation, $\log(n!)=\Theta(n\log n)$, hence $m=\Omega(n\log n)$.

This lower bound applies to comparison sorting. It does not rule out linear-time non-comparison methods such as counting sort, radix sort, or bucket sort when the input has special structure.`,
      explanationZh: raw`比较排序可以表示成一棵决策树。每次比较有两个结果，所以做 $m$ 次比较的决策树最多有 $2^m$ 个叶子。

对 $n$ 个互不相同的任意输入，一共有 $n!$ 种可能顺序。正确排序必须能区分每一种排列，因此决策树至少需要 $n!$ 个叶子：
$$2^m\ge n!.$$
所以
$$m\ge \log_2(n!).$$
由 Stirling 近似，$\log(n!)=\Theta(n\log n)$，因此 $m=\Omega(n\log n)$。

这个下界只适用于比较排序。若输入有特殊结构，例如整数键范围有界，则计数排序、基数排序或桶排序等非比较排序仍可能达到线性时间。`
    }
  },
  {
    id: "red-book-problem-127",
    reason: "Fisher-Yates shuffle code had OCR variable-name corruption and no direct answer.",
    fields: {
      titleEn: "Question 5.12 - Randomly permute integers 1 to 100",
      titleZh: "问题 5.12 - 随机排列 1 到 100",
      category: "leetcode",
      tags: algorithmTags,
      answer: "Use the Fisher-Yates shuffle: initialize the array 1..100, then for i from 99 down to 1 swap a[i] with a uniformly chosen a[j] for 0 <= j <= i.",
      answerZh: "使用 Fisher-Yates 洗牌：先初始化数组 1..100，然后从 i=99 递减到 1，每次把 a[i] 与 0 <= j <= i 中均匀随机选出的 a[j] 交换。",
      promptZh: "使用 rand() 函数随机排列 1 到 100 之间的整数。",
      explanation: raw`The Fisher-Yates shuffle produces each permutation with equal probability:

    std::vector<int> randomPermutation(int n) {
        std::vector<int> a(n);
        for (int i = 0; i < n; ++i) a[i] = i + 1;
        for (int i = n - 1; i > 0; --i) {
            int j = rand() % (i + 1);
            std::swap(a[i], a[j]);
        }
        return a;
    }

At step $i$, each remaining value is equally likely to be placed into position $i$. In production code, avoid modulo bias by using a random-number API that samples uniformly from an integer range, rather than using rand() % m blindly.`,
      explanationZh: raw`Fisher-Yates 洗牌可以让每个排列等概率出现：

    std::vector<int> randomPermutation(int n) {
        std::vector<int> a(n);
        for (int i = 0; i < n; ++i) a[i] = i + 1;
        for (int i = n - 1; i > 0; --i) {
            int j = rand() % (i + 1);
            std::swap(a[i], a[j]);
        }
        return a;
    }

在第 $i$ 步，每个剩余元素都等概率被放到位置 $i$。生产代码中应避免取模偏差，最好使用能直接从整数区间均匀采样的随机数 API，而不是盲目使用 rand() % m。`
    }
  },
  {
    id: "red-book-problem-129",
    reason: "Sorted-matrix search explanation had malformed loop code and inconsistent Chinese variable names.",
    fields: {
      titleEn: "Question 5.14 - Search a row-and-column sorted matrix",
      titleZh: "问题 5.14 - 搜索行列递增矩阵",
      category: "leetcode",
      tags: algorithmTags,
      answer: "Start from the top-right corner. If the current value is larger than x, move left; if it is smaller, move down; if equal, return the position. The runtime is O(rows + columns).",
      answerZh: "从右上角开始。若当前值大于 x，就向左移动；若小于 x，就向下移动；若相等则返回位置。时间复杂度为 O(行数 + 列数)。",
      promptZh: "给定一个每行递增、每列也递增的矩阵。已知数字 x 在矩阵中，请给出一个高效算法定位它。",
      explanation: raw`At the top-right corner, all values below are larger and all values to the left are smaller. This makes each comparison eliminate one row or one column:

    std::pair<int,int> findSortedMatrix(const Matrix& a, double x) {
        int r = 0;
        int c = a.cols() - 1;
        while (r < a.rows() && c >= 0) {
            if (a(r, c) == x) return {r, c};
            if (a(r, c) > x) --c;
            else ++r;
        }
        return {-1, -1};
    }

The algorithm touches at most one cell per row plus one cell per column, so the complexity is $O(m+n)$ for an $m$ by $n$ matrix.`,
      explanationZh: raw`在右上角，当前位置下方的值都更大，左侧的值都更小。因此每次比较都能排除一行或一列：

    std::pair<int,int> findSortedMatrix(const Matrix& a, double x) {
        int r = 0;
        int c = a.cols() - 1;
        while (r < a.rows() && c >= 0) {
            if (a(r, c) == x) return {r, c};
            if (a(r, c) > x) --c;
            else ++r;
        }
        return {-1, -1};
    }

该算法最多访问每行和每列各一次，因此对 $m$ 行 $n$ 列矩阵，复杂度为 $O(m+n)$。`
    }
  },
  {
    id: "red-book-problem-130",
    reason: "Duplicate-detection code had OCR errors such as broken indices and malformed loop conditions.",
    fields: {
      titleEn: "Question 5.15 - Detect a duplicate in an array with values 0 to N-1",
      titleZh: "问题 5.15 - 检测 0 到 N-1 数组中的重复值",
      category: "leetcode",
      tags: algorithmTags,
      answer: "Because every value is in 0..N-1 and the array may be modified, repeatedly move each value v to index v. If index v already contains v, then v is duplicated. This is O(N) time and O(1) extra space.",
      answerZh: "因为每个值都在 0..N-1 且允许修改数组，可以反复把值 v 放到下标 v 的位置。若下标 v 处已经是 v，则 v 出现重复。时间复杂度 O(N)，额外空间 O(1)。",
      promptZh: "一个整数向量 v 有 N 个元素，每个元素都在闭区间 0 到 N-1 内。写一个算法判断是否存在重复数字；不要求保留原数组。",
      explanation: raw`The value range gives each number a natural target position. Use the array itself as bookkeeping:

    bool hasDuplicate(std::vector<int>& a) {
        for (size_t i = 0; i < a.size(); ++i) {
            while (a[i] != static_cast<int>(i)) {
                int v = a[i];
                if (a[v] == v) return true;
                std::swap(a[i], a[v]);
            }
        }
        return false;
    }

Every successful swap puts at least one value into its final position, so there can be only $O(N)$ swaps. The method uses constant extra space but mutates the input.`,
      explanationZh: raw`数值范围使每个数字都有一个天然目标位置。可以把数组本身当作记账结构：

    bool hasDuplicate(std::vector<int>& a) {
        for (size_t i = 0; i < a.size(); ++i) {
            while (a[i] != static_cast<int>(i)) {
                int v = a[i];
                if (a[v] == v) return true;
                std::swap(a[i], a[v]);
            }
        }
        return false;
    }

每次成功交换都会至少把一个值放到最终位置，因此交换次数为 $O(N)$。该方法只用常数额外空间，但会修改输入数组。`
    }
  },
  {
    id: "red-book-problem-131",
    reason: "Linear-interpolation code had corrupted iterator operations and Chinese syntax.",
    fields: {
      titleEn: "Question 5.16 - Linear interpolation",
      titleZh: "问题 5.16 - 线性插值",
      category: "leetcode",
      tags: algorithmTags,
      answer: raw`Find the two grid points $x_i\le x\le x_{i+1}$, then return
$$y_i+\frac{x-x_i}{x_{i+1}-x_i}(y_{i+1}-y_i).$$
Use binary search on the sorted x-grid for $O(\log n)$ lookup.`,
      answerZh: raw`先找到两个网格点 $x_i\le x\le x_{i+1}$，然后返回
$$y_i+\frac{x-x_i}{x_{i+1}-x_i}(y_{i+1}-y_i).$$
若 x 网格已排序，可用二分搜索实现 $O(\log n)$ 查找。`,
      promptZh: "写一个线性插值例程。",
      explanation: raw`Assume arrays xs and ys have the same length and that xs is strictly increasing. Locate the first grid point not less than the target, then interpolate between its neighbor and itself:

    double interpolate(const std::vector<double>& xs,
                       const std::vector<double>& ys,
                       double x) {
        auto it = std::lower_bound(xs.begin(), xs.end(), x);
        if (it == xs.begin()) return ys.front();
        if (it == xs.end()) return ys.back();

        size_t j = static_cast<size_t>(it - xs.begin());
        double x0 = xs[j - 1], x1 = xs[j];
        double y0 = ys[j - 1], y1 = ys[j];
        double theta = (x - x0) / (x1 - x0);
        return (1.0 - theta) * y0 + theta * y1;
    }

The boundary choice above clamps outside the input range. A different application may prefer extrapolation or an error.`,
      explanationZh: raw`假设数组 xs 和 ys 长度相同，并且 xs 严格递增。先定位第一个不小于目标值的网格点，再在它和前一个点之间插值：

    double interpolate(const std::vector<double>& xs,
                       const std::vector<double>& ys,
                       double x) {
        auto it = std::lower_bound(xs.begin(), xs.end(), x);
        if (it == xs.begin()) return ys.front();
        if (it == xs.end()) return ys.back();

        size_t j = static_cast<size_t>(it - xs.begin());
        double x0 = xs[j - 1], x1 = xs[j];
        double y0 = ys[j - 1], y1 = ys[j];
        double theta = (x - x0) / (x1 - x0);
        return (1.0 - theta) * y0 + theta * y1;
    }

上面的边界处理是把区间外输入截断到端点。不同应用也可以选择外推或直接报错。`
    }
  },
  {
    id: "red-book-problem-135",
    reason: "Rare-event Monte Carlo explanation had broken formulas and leaked the next chapter into the Chinese solution.",
    fields: {
      titleEn: "Question 5.20 - Monte Carlo pricing of a far out-of-the-money digital call",
      titleZh: "问题 5.20 - 用蒙特卡罗定价深度虚值数字看涨期权",
      category: "option",
      tags: optionTags,
      answer: raw`Naive Monte Carlo will almost always return zero, because
$$P(N(100,1)>110)=P(Z>10)\approx7.6\times10^{-24}.$$
Use importance sampling, for example draw $Z$ from $N(10,1)$ and weight each digital payoff by the likelihood ratio $\phi(Z)/\phi(Z-10)$.`,
      answerZh: raw`朴素蒙特卡罗几乎总会返回零，因为
$$P(N(100,1)>110)=P(Z>10)\approx7.6\times10^{-24}.$$
可使用重要性抽样，例如从 $N(10,1)$ 抽取 $Z$，并把每条路径的数字期权收益乘以似然比 $\phi(Z)/\phi(Z-10)$。`,
      promptZh: "已知时间 T 的股票价格服从 N(100,1)。你想用蒙特卡罗模拟定价执行价为 110 的数字看涨期权。直接模拟会发生什么？如何改进？",
      explanation: raw`Write
$$S_T=100+Z,\qquad Z\sim N(0,1).$$
The digital call pays $1$ when $Z>10$. This is a ten-standard-deviation event, with probability about $7.6\times10^{-24}$. For any ordinary number of Monte Carlo paths, no simulated path will exceed the strike, so the estimate will be exactly zero.

Importance sampling shifts the sampling distribution toward the rare event. Draw instead
$$Z\sim N(10,1),$$
whose density is $q(z)=\phi(z-10)$, while the original density is $p(z)=\phi(z)$. Then estimate
$$E_p[1_{\{Z>10\}}]
=E_q\left[1_{\{Z>10\}}\frac{p(Z)}{q(Z)}\right]
=E_q\left[1_{\{Z>10\}}\frac{\phi(Z)}{\phi(Z-10)}\right].$$
If discounting is required, multiply the final estimate by the discount factor.`,
      explanationZh: raw`写成
$$S_T=100+Z,\qquad Z\sim N(0,1).$$
数字看涨期权在 $Z>10$ 时支付 $1$。这是十个标准差事件，概率约为 $7.6\times10^{-24}$。对普通规模的蒙特卡罗路径，几乎不可能模拟到超过执行价的路径，因此估计值通常会精确等于零。

重要性抽样会把采样分布移动到稀有事件附近。改为抽取
$$Z\sim N(10,1),$$
其密度为 $q(z)=\phi(z-10)$，原始密度为 $p(z)=\phi(z)$。于是估计
$$E_p[1_{\{Z>10\}}]
=E_q\left[1_{\{Z>10\}}\frac{p(Z)}{q(Z)}\right]
=E_q\left[1_{\{Z>10\}}\frac{\phi(Z)}{\phi(Z-10)}\right].$$
若题目需要贴现，则最后再乘以贴现因子。`
    }
  },
  {
    id: "red-book-problem-171",
    reason: "C++ virtual-function question was incorrectly categorized as LeetCode and lacked a direct answer.",
    fields: {
      titleEn: "Question 7.10 - Virtual functions in C++",
      titleZh: "问题 7.10 - C++ 中的虚函数",
      category: "cppProgramming",
      tags: cppTags,
      answer: "A virtual function is a member function whose implementation is selected at run time according to the dynamic type of the object, enabling polymorphism through base-class pointers or references.",
      answerZh: "虚函数是一种成员函数，其具体实现会根据对象的动态类型在运行时选择；它使得通过基类指针或引用实现多态成为可能。",
      promptZh: "什么是虚函数？",
      explanation: raw`In C++, marking a base-class member function as virtual means calls through a base-class pointer or reference are dynamically dispatched:

    struct Payoff {
        virtual double value(double spot) const = 0;
        virtual ~Payoff() = default;
    };

    struct CallPayoff : Payoff {
        double value(double spot) const override { return std::max(spot - strike, 0.0); }
        double strike;
    };

Client code can work with Payoff& without knowing whether the concrete object is a call, put, or another payoff. The main cost is an indirect call through the virtual table, and the main design requirement is to use a virtual destructor when deleting through a base pointer.`,
      explanationZh: raw`在 C++ 中，把基类成员函数标记为 virtual，表示通过基类指针或引用调用时会进行动态派发：

    struct Payoff {
        virtual double value(double spot) const = 0;
        virtual ~Payoff() = default;
    };

    struct CallPayoff : Payoff {
        double value(double spot) const override { return std::max(spot - strike, 0.0); }
        double strike;
    };

调用方可以只持有 Payoff&，而不需要知道具体对象是看涨、看跌还是其他收益类型。主要代价是一次虚表间接调用；重要设计要求是：若可能通过基类指针删除对象，基类析构函数也应为虚函数。`
    }
  },
  {
    id: "red-book-problem-172",
    reason: "strcmp implementation had corrupted null characters and empty answer fields.",
    fields: {
      titleEn: "Question 7.11 - Implement strcmp",
      titleZh: "问题 7.11 - 实现 strcmp",
      category: "cppProgramming",
      tags: cppTags,
      answer: raw`Compare the two null-terminated strings character by character until a mismatch or a null terminator is reached:

    int mystrcmp(const char* a, const char* b) {
        while (*a != '\0' && *b != '\0' && *a == *b) {
            ++a;
            ++b;
        }
        return static_cast<unsigned char>(*a) - static_cast<unsigned char>(*b);
    }`,
      answerZh: raw`逐字符比较两个以空字符结尾的字符串，直到遇到不同字符或字符串结束：

    int mystrcmp(const char* a, const char* b) {
        while (*a != '\0' && *b != '\0' && *a == *b) {
            ++a;
            ++b;
        }
        return static_cast<unsigned char>(*a) - static_cast<unsigned char>(*b);
    }`,
      promptZh: "实现 strcmp。",
      explanation: raw`C-style strings are terminated by '\0'. The standard strcmp contract is to return a negative value if the first string is lexicographically smaller, zero if they are equal, and a positive value if it is larger.

The pointers point to const characters, but the pointer variables themselves can be advanced. Casting to unsigned char avoids surprises from implementations where plain char is signed.`,
      explanationZh: raw`C 风格字符串以 '\0' 结尾。标准 strcmp 的约定是：若第一个字符串按字典序更小，返回负数；若相等，返回零；若更大，返回正数。

指针指向的是 const 字符，但指针变量本身可以向后移动。转换为 unsigned char 可以避免某些实现中普通 char 为有符号类型而带来的问题。`
    }
  },
  {
    id: "red-book-problem-184",
    reason: "Box-Muller acceptance probability and uniform-draw estimate were OCR-corrupted.",
    fields: {
      titleEn: "Question 7.24 - Uniform draws per Gaussian draw in polar Box-Muller",
      titleZh: "问题 7.24 - Polar Box-Muller 中每个高斯样本需要多少均匀样本",
      category: "probabilityExpectation",
      tags: probabilityTags,
      answer: raw`The acceptance probability for a proposed pair is the unit disk area inside the square $[-1,1]^2$:
$$p=\frac{\pi}{4}.$$
Each accepted pair uses 2 uniform draws and produces 2 Gaussian draws, so the expected number of uniform draws per Gaussian draw is
$$\frac{1}{p}=\frac{4}{\pi}\approx1.27.$$`,
      answerZh: raw`每个候选点对的接受概率是正方形 $[-1,1]^2$ 中单位圆的面积比例：
$$p=\frac{\pi}{4}.$$
每个被接受的点对使用 2 个均匀样本并产生 2 个高斯样本，因此每个高斯样本平均需要的均匀样本数为
$$\frac{1}{p}=\frac{4}{\pi}\approx1.27.$$`,
      promptZh: "下面的 C++ 代码用 polar Box-Muller 方法生成均值 0、标准差 1 的标准高斯样本。估计每生成一个高斯样本平均需要多少个均匀随机数。",
      explanation: raw`The code proposes $(x,y)$ uniformly in the square $[-1,1]^2$ and accepts it only if
$$0<x^2+y^2<1.$$
The square has area $4$ and the unit disk has area $\pi$, so a proposed pair is accepted with probability
$$p=\frac{\pi}{4}.$$

The number of proposed pairs needed for one accepted pair has expectation $1/p=4/\pi$. Each proposed pair consumes 2 uniform draws, and each accepted pair produces 2 independent Gaussian draws. These factors cancel, so the expected number of uniform draws per Gaussian draw is
$$\frac{4}{\pi}\approx1.27.$$`,
      explanationZh: raw`代码在正方形 $[-1,1]^2$ 中均匀生成 $(x,y)$，并且只在
$$0<x^2+y^2<1$$
时接受该点对。正方形面积为 $4$，单位圆面积为 $\pi$，所以候选点对的接受概率为
$$p=\frac{\pi}{4}.$$

得到一个被接受点对所需的候选点对数量期望为 $1/p=4/\pi$。每个候选点对消耗 2 个均匀样本，而每个被接受点对产生 2 个独立高斯样本。这两个因子抵消，因此每个高斯样本平均需要的均匀样本数为
$$\frac{4}{\pi}\approx1.27.$$`
    }
  },
  {
    id: "red-book-problem-185",
    reason: "Reverse-string solution had invalid C++ fragments and spillover from the next question.",
    fields: {
      titleEn: "Question 7.25 - Reverse a string in C++",
      titleZh: "问题 7.25 - 用 C++ 反转字符串",
      category: "cppProgramming",
      tags: cppTags,
      answer: raw`Return-a-new-string version:

    std::string reversed(const std::string& s) {
        return std::string(s.rbegin(), s.rend());
    }

In-place version:

    void reverseInPlace(std::string& s) {
        for (size_t i = 0; i < s.size() / 2; ++i) {
            std::swap(s[i], s[s.size() - 1 - i]);
        }
    }`,
      answerZh: raw`返回新字符串版本：

    std::string reversed(const std::string& s) {
        return std::string(s.rbegin(), s.rend());
    }

原地反转版本：

    void reverseInPlace(std::string& s) {
        for (size_t i = 0; i < s.size() / 2; ++i) {
            std::swap(s[i], s[s.size() - 1 - i]);
        }
    }`,
      promptZh: "写一个 C++ 函数，输入一个字符串并返回它的反转字符串。再写一个不做额外内存分配、原地反转的版本。",
      explanation: raw`The first version allocates a new string and constructs it from reverse iterators. Its time complexity is $O(n)$ and it uses $O(n)$ extra memory.

The in-place version swaps symmetric character pairs. It also runs in $O(n)$ time but uses $O(1)$ extra memory. The loop stops at s.size()/2, so it works for both even and odd lengths.`,
      explanationZh: raw`第一个版本分配一个新字符串，并通过反向迭代器构造结果。时间复杂度为 $O(n)$，额外空间为 $O(n)$。

原地版本交换对称位置的字符。它同样是 $O(n)$ 时间，但额外空间为 $O(1)$。循环到 s.size()/2 停止，因此奇数长度和偶数长度都能正确处理。`
    }
  },
  {
    id: "red-book-problem-188",
    reason: "Square-root implementation had corrupted code and prompt spillover.",
    fields: {
      titleEn: "Question 7.29 - Compute square roots without std::sqrt",
      titleZh: "问题 7.29 - 不使用 std::sqrt 计算平方根",
      category: "leetcode",
      tags: cppTags,
      answer: raw`Use Newton's method:

    double mySqrt(double x, double tol = 1e-12) {
        if (x < 0.0) throw std::domain_error("negative input");
        if (x == 0.0) return 0.0;
        double g = x >= 1.0 ? x : 1.0;
        while (std::abs(g * g - x) > tol * std::max(1.0, x)) {
            g = 0.5 * (g + x / g);
        }
        return g;
    }`,
      answerZh: raw`使用 Newton 方法：

    double mySqrt(double x, double tol = 1e-12) {
        if (x < 0.0) throw std::domain_error("negative input");
        if (x == 0.0) return 0.0;
        double g = x >= 1.0 ? x : 1.0;
        while (std::abs(g * g - x) > tol * std::max(1.0, x)) {
            g = 0.5 * (g + x / g);
        }
        return g;
    }`,
      promptZh: "写一个 C++ 函数，在不调用标准库平方根函数的情况下计算平方根。可以把它包装进 main 程序，从命令行读取输入。",
      explanation: raw`Newton's method solves $g^2=x$. Starting from a positive guess $g$, the update is
$$g_{\text{new}}=\frac12\left(g+\frac{x}{g}\right).$$
For positive $x$ and a positive initial guess, this converges quickly to $\sqrt{x}$. The implementation checks negative input, handles zero separately, and stops when the squared error is small relative to the scale of $x$.`,
      explanationZh: raw`Newton 方法用于求解 $g^2=x$。从正的初始猜测 $g$ 出发，迭代为
$$g_{\text{new}}=\frac12\left(g+\frac{x}{g}\right).$$
当 $x>0$ 且初始猜测为正时，该迭代会快速收敛到 $\sqrt{x}$。实现中需要检查负输入，单独处理零，并在平方误差相对 $x$ 的尺度足够小时停止。`
    }
  },
  {
    id: "red-book-problem-189",
    reason: "Binary-tree answer fields were empty and the original solution was truncated.",
    fields: {
      titleEn: "Question 7.30 - Binary tree of integers in C++",
      titleZh: "问题 7.30 - 用 C++ 表示整数二叉树",
      category: "leetcode",
      tags: cppTags,
      answer: raw`Represent the empty tree by a null pointer. A simple node-based representation is:

    struct Node {
        int value;
        std::unique_ptr<Node> left;
        std::unique_ptr<Node> right;
    };

    int depth(const Node* n) {
        if (!n) return 0;
        return 1 + std::max(depth(n->left.get()), depth(n->right.get()));
    }

    int maxValue(const Node* n) {
        if (!n) throw std::invalid_argument("empty tree");
        int best = n->value;
        if (n->left) best = std::max(best, maxValue(n->left.get()));
        if (n->right) best = std::max(best, maxValue(n->right.get()));
        return best;
    }`,
      answerZh: raw`用空指针表示空树。一个简单的节点表示为：

    struct Node {
        int value;
        std::unique_ptr<Node> left;
        std::unique_ptr<Node> right;
    };

    int depth(const Node* n) {
        if (!n) return 0;
        return 1 + std::max(depth(n->left.get()), depth(n->right.get()));
    }

    int maxValue(const Node* n) {
        if (!n) throw std::invalid_argument("empty tree");
        int best = n->value;
        if (n->left) best = std::max(best, maxValue(n->left.get()));
        if (n->right) best = std::max(best, maxValue(n->right.get()));
        return best;
    }`,
      promptZh: "用 C++ 实现一种数据结构来表示一棵每个节点包含一个整数的二叉树。讨论空树。写一个函数返回树的深度，其中空树深度为零；再写一个函数返回非空树中的最大元素。",
      explanation: raw`Using std::unique_ptr makes ownership explicit: each node owns its left and right subtrees. The empty tree is simply nullptr.

The depth function is recursive. An empty tree has depth zero; a non-empty tree has depth one plus the maximum depth of its two children.

The maximum-value function is only defined for a non-empty tree. It recursively computes the maximum of the current node, the left subtree, and the right subtree.`,
      explanationZh: raw`使用 std::unique_ptr 可以明确所有权：每个节点拥有自己的左子树和右子树。空树就是 nullptr。

深度函数使用递归。空树深度为零；非空树深度为一加左右子树深度的较大者。

最大值函数只对非空树有定义。它递归地比较当前节点、左子树和右子树中的最大值。`
    }
  },
  {
    id: "red-book-problem-190",
    reason: "const question had no direct answer and the Chinese prompt contained spillover from later questions.",
    fields: {
      titleEn: "Question 7.31 - Uses of const in C++",
      titleZh: "问题 7.31 - C++ 中 const 的用法",
      category: "cppProgramming",
      tags: cppTags,
      answer: "const can qualify variables, function parameters, return values, member functions, data members, and pointer declarations. It expresses that a value or object state should not be modified through that name, though mutable and const_cast create important caveats.",
      answerZh: "const 可以修饰变量、函数参数、返回值、成员函数、数据成员和指针声明。它表示不能通过该名称修改值或对象状态，但 mutable 和 const_cast 是重要例外与风险点。",
      promptZh: "你对 C++ 中的 const 了解多少？",
      explanation: raw`Common uses:

- const int x = 3; means x cannot be reassigned.
- void f(const Big& x); avoids copying and promises not to modify x.
- int size() const; means the member function should not modify the observable state of the object.
- const int* p is a pointer to const int; int* const p is a const pointer to mutable int; const int* const p is both.
- A const data member must be initialized in the constructor initializer list.

mutable allows selected members to change even inside a const member function, often for caches. const_cast can remove constness from a reference or pointer, but modifying an object that was originally declared const is undefined behavior.`,
      explanationZh: raw`常见用法包括：

- const int x = 3; 表示 x 不能被重新赋值。
- void f(const Big& x); 避免复制，并承诺不修改 x。
- int size() const; 表示成员函数不应修改对象的可观察状态。
- const int* p 是指向常量 int 的指针；int* const p 是指针本身为常量、所指 int 可变；const int* const p 二者都是常量。
- const 数据成员必须在构造函数初始化列表中初始化。

mutable 允许某些成员即使在 const 成员函数中也可改变，常用于缓存。const_cast 可以移除引用或指针上的 const 限定，但如果对象最初就是 const，修改它会导致未定义行为。`
    }
  },
  {
    id: "red-book-problem-191",
    reason: "static question had no answer summary and needed modern C++ wording.",
    fields: {
      titleEn: "Question 7.32 - Uses of static in C++",
      titleZh: "问题 7.32 - C++ 中 static 的用法",
      category: "cppProgramming",
      tags: cppTags,
      answer: "static is used for local variables with static storage duration, class static data members, class static member functions, and namespace-scope internal linkage. In modern C++, anonymous namespaces are often preferred for internal linkage.",
      answerZh: "static 可用于具有静态存储期的局部变量、类的静态数据成员、类的静态成员函数，以及命名空间作用域的内部链接。在现代 C++ 中，内部链接常优先使用匿名命名空间表达。",
      promptZh: "列举 C++ 中可以使用 static 关键字的地方。",
      explanation: raw`Main uses of static:

- A static local variable inside a function is initialized once and keeps its value between calls.
- A static data member belongs to the class, not to each individual object.
- A static member function can be called as ClassName::function() and has no this pointer.
- At namespace scope, static gives a variable or function internal linkage, meaning it is visible only in that translation unit.

Thread-safety matters. Since C++11, initialization of function-local statics is thread-safe, but later mutation of shared static state still needs synchronization.`,
      explanationZh: raw`static 的主要用法包括：

- 函数内的静态局部变量只初始化一次，并在多次调用之间保留值。
- 静态数据成员属于类本身，而不是每个对象各有一份。
- 静态成员函数可用 ClassName::function() 调用，并且没有 this 指针。
- 在命名空间作用域，static 会让变量或函数具有内部链接，即只在当前翻译单元可见。

还要注意线程安全。C++11 起，函数内静态局部变量的初始化是线程安全的，但之后对共享静态状态的修改仍需要同步。`
    }
  },
  {
    id: "red-book-problem-192",
    reason: "Definitions of polymorphism, abstract class, pointer, and reference had missing answer fields and spillover.",
    fields: {
      titleEn: "Question 7.33 - Polymorphism, abstract classes, pointers, and references",
      titleZh: "问题 7.33 - 多态、抽象类、指针和引用",
      category: "cppProgramming",
      tags: cppTags,
      answer: "Polymorphism means using a common interface while behavior depends on the dynamic type. An abstract class has at least one pure virtual function and cannot be instantiated. A pointer stores an address and can be null or reseated. A reference is an alias for an existing object and normally cannot be reseated.",
      answerZh: "多态是通过共同接口调用对象，而具体行为取决于动态类型。抽象类至少含有一个纯虚函数，不能直接实例化。指针保存地址，可以为空，也可以改指向别处。引用是已有对象的别名，通常不能重新绑定。",
      promptZh: "定义以下术语：什么是多态？什么是抽象类？什么是指针？什么是引用？",
      explanation: raw`Polymorphism in C++ is usually implemented with virtual functions. Client code can call a base-class interface while the derived-class implementation runs.

An abstract class contains at least one pure virtual function, written for example as:

    virtual double value(double x) const = 0;

It cannot be instantiated directly; only concrete derived classes can be instantiated.

A pointer is an object whose value is a memory address. It can be null, can be reassigned, and must be dereferenced to access the pointed-to object.

A reference is an alias for another object. It must be bound when created, cannot normally be rebound, and is used syntactically like the object itself.`,
      explanationZh: raw`C++ 中的多态通常通过虚函数实现。调用方可以使用基类接口，而运行时执行的是派生类实现。

抽象类至少包含一个纯虚函数，例如：

    virtual double value(double x) const = 0;

抽象类不能直接实例化；只能实例化具体派生类。

指针是一个值为内存地址的对象。它可以为空，可以重新赋值指向别处，访问所指对象时需要解引用。

引用是另一个对象的别名。它创建时必须绑定，通常不能重新绑定，语法上像直接使用原对象。`
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
    if (problem[field] !== value) {
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

  problem.manualContentReviewed = true;
  problem.classificationReviewed = true;
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
  if (options.rebuild) {
    const result = spawnSync(process.execPath, [path.join(projectRoot, "scripts", "build-problem-catalog.mjs")], {
      cwd: projectRoot,
      stdio: "inherit"
    });
    if (result.status !== 0) process.exit(result.status || 1);
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

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "apply" || key === "rebuild") {
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
