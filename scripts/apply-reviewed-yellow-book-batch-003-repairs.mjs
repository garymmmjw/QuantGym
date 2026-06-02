import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const raw = String.raw;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/yellow-book/problems.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-quality-review/yellow-book-batch-003-reviewed-repairs-report.json");
const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const problemById = new Map(problems.map((problem) => [String(problem.id || ""), problem]));
const reviewSource = "llm-full-major-triage-reviewed-repair-yellow-book-batch-003-2026-06-02";

const cppAlgoTags = ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "C++ Data Structures", "Algorithms", "coding"];
const monteCarloTags = ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Monte Carlo and Numerical Methods", "statistics"];
const probabilityTags = ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Probability and Stochastic Calculus", "probability"];
const stochasticTags = ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Probability and Stochastic Calculus", "stochastic calculus"];

const repairs = [
  {
    id: "yellow-book-problem-079",
    reason: "Factorial implementations were OCR-corrupted and answer fields were empty.",
    fields: {
      category: "leetcode",
      tags: cppAlgoTags,
      answer: raw`Iterative implementation:

    #include <stdexcept>

    long long factorial_iterative(int n) {
        if (n < 0) throw std::invalid_argument("n must be nonnegative");
        long long result = 1;
        for (int i = 2; i <= n; ++i) {
            result *= i;
        }
        return result;
    }

Recursive implementation:

    long long factorial_recursive(int n) {
        if (n < 0) throw std::invalid_argument("n must be nonnegative");
        if (n <= 1) return 1;
        return n * factorial_recursive(n - 1);
    }`,
      answerZh: raw`迭代实现：

    #include <stdexcept>

    long long factorial_iterative(int n) {
        if (n < 0) throw std::invalid_argument("n must be nonnegative");
        long long result = 1;
        for (int i = 2; i <= n; ++i) {
            result *= i;
        }
        return result;
    }

递归实现：

    long long factorial_recursive(int n) {
        if (n < 0) throw std::invalid_argument("n must be nonnegative");
        if (n <= 1) return 1;
        return n * factorial_recursive(n - 1);
    }`,
      explanation: "The factorial satisfies 0! = 1 and n! = n(n-1)! for n >= 1. The iterative version avoids recursion depth issues. The return type is long long, but factorials grow quickly, so production code should still check for overflow if large n is allowed.",
      explanationZh: "阶乘满足 0! = 1，且当 n >= 1 时 n! = n(n-1)!。迭代版本可以避免递归深度问题。这里使用 long long 返回，但阶乘增长很快；如果允许较大的 n，生产代码还应检查溢出。"
    }
  },
  {
    id: "yellow-book-problem-080",
    reason: "Largest-subarray answer returned only a sum and the code was corrupted.",
    fields: {
      category: "leetcode",
      tags: cppAlgoTags,
      answer: raw`Use Kadane's algorithm while tracking the best interval:

    #include <vector>
    #include <cstddef>

    template <typename T>
    std::vector<T> max_subarray(const std::vector<T>& a) {
        if (a.empty()) return {};

        T best = a[0];
        T current = a[0];
        std::size_t best_left = 0;
        std::size_t best_right = 0;
        std::size_t current_left = 0;

        for (std::size_t i = 1; i < a.size(); ++i) {
            if (current + a[i] < a[i]) {
                current = a[i];
                current_left = i;
            } else {
                current += a[i];
            }

            if (current > best) {
                best = current;
                best_left = current_left;
                best_right = i;
            }
        }

        return std::vector<T>(a.begin() + best_left, a.begin() + best_right + 1);
    }`,
      answerZh: raw`使用 Kadane 算法，并同时记录最优区间：

    #include <vector>
    #include <cstddef>

    template <typename T>
    std::vector<T> max_subarray(const std::vector<T>& a) {
        if (a.empty()) return {};

        T best = a[0];
        T current = a[0];
        std::size_t best_left = 0;
        std::size_t best_right = 0;
        std::size_t current_left = 0;

        for (std::size_t i = 1; i < a.size(); ++i) {
            if (current + a[i] < a[i]) {
                current = a[i];
                current_left = i;
            } else {
                current += a[i];
            }

            if (current > best) {
                best = current;
                best_left = current_left;
                best_right = i;
            }
        }

        return std::vector<T>(a.begin() + best_left, a.begin() + best_right + 1);
    }`,
      explanation: "The algorithm keeps the best subarray ending at the current position. If extending the current subarray is worse than starting at the current element, it starts a new subarray. Tracking the start and end indices lets the function return the actual subarray, not just the maximum sum. The time complexity is O(n).",
      explanationZh: "该算法维护“以当前位置结尾的最大和子数组”。如果延长当前子数组不如从当前元素重新开始，就重置当前起点。记录起止下标后，函数返回的是实际子数组，而不仅是最大和。时间复杂度为 O(n)。"
    }
  },
  {
    id: "yellow-book-problem-081",
    reason: "Prime-factor code was syntactically invalid and answer fields were empty.",
    fields: {
      category: "leetcode",
      tags: cppAlgoTags,
      answer: raw`A simple trial-division implementation is:

    #include <vector>

    std::vector<int> prime_factors(int n) {
        std::vector<int> factors;
        if (n <= 1) return factors;

        for (int d = 2; d <= n / d; ++d) {
            while (n % d == 0) {
                factors.push_back(d);
                n /= d;
            }
        }

        if (n > 1) factors.push_back(n);
        return factors;
    }`,
      answerZh: raw`一个简单的试除法实现为：

    #include <vector>

    std::vector<int> prime_factors(int n) {
        std::vector<int> factors;
        if (n <= 1) return factors;

        for (int d = 2; d <= n / d; ++d) {
            while (n % d == 0) {
                factors.push_back(d);
                n /= d;
            }
        }

        if (n > 1) factors.push_back(n);
        return factors;
    }`,
      explanation: "The loop repeatedly divides out each divisor before moving on. The condition d <= n / d is equivalent to d*d <= n but avoids integer overflow. After all small factors are removed, any remaining n > 1 must itself be prime.",
      explanationZh: "循环会把当前因子 d 能整除的部分全部除掉，再继续尝试下一个 d。条件 d <= n / d 等价于 d*d <= n，但能避免整数溢出。所有较小因子都除完后，如果剩余 n > 1，则剩余部分本身就是质数。"
    }
  },
  {
    id: "yellow-book-problem-082",
    reason: "Bit-swap implementation was unreadable and non-compilable.",
    fields: {
      category: "leetcode",
      tags: cppAlgoTags,
      answer: raw`Only flip the two positions when their bits differ:

    #include <cstdint>

    std::uint64_t swap_bits(std::uint64_t x, unsigned i, unsigned j) {
        if (i == j) return x;

        std::uint64_t bit_i = (x >> i) & 1ULL;
        std::uint64_t bit_j = (x >> j) & 1ULL;

        if (bit_i != bit_j) {
            x ^= (1ULL << i) | (1ULL << j);
        }
        return x;
    }`,
      answerZh: raw`只有当两个位置上的 bit 不同时，才需要翻转这两个位置：

    #include <cstdint>

    std::uint64_t swap_bits(std::uint64_t x, unsigned i, unsigned j) {
        if (i == j) return x;

        std::uint64_t bit_i = (x >> i) & 1ULL;
        std::uint64_t bit_j = (x >> j) & 1ULL;

        if (bit_i != bit_j) {
            x ^= (1ULL << i) | (1ULL << j);
        }
        return x;
    }`,
      explanation: "If the two bits are equal, swapping them changes nothing. If they differ, XOR with a mask containing 1s at positions i and j flips both bits, which is exactly the swap.",
      explanationZh: "如果两个 bit 相同，交换后数值不变。如果两个 bit 不同，对第 i 位和第 j 位组成的掩码做 XOR，会同时翻转这两个位置，效果正好等同于交换。"
    }
  },
  {
    id: "yellow-book-problem-083",
    reason: "Linked-list reversal code contained OCR spillover and corrupted templates.",
    fields: {
      titleEn: "Question 30 - Write a function that reverses a singly linked list",
      titleZh: "问题 30 - 编写一个反转单向链表的函数",
      category: "leetcode",
      tags: cppAlgoTags,
      promptEn: "Write a function that reverses a singly linked list.",
      promptZh: "编写一个反转单向链表的函数。",
      answer: raw`A complete iterative reversal is:

    template <typename T>
    struct Node {
        T data;
        Node* next = nullptr;
    };

    template <typename T>
    Node<T>* reverse_list(Node<T>* head) {
        Node<T>* previous = nullptr;
        Node<T>* current = head;

        while (current != nullptr) {
            Node<T>* next = current->next;
            current->next = previous;
            previous = current;
            current = next;
        }
        return previous;
    }`,
      answerZh: raw`一个完整的迭代反转实现为：

    template <typename T>
    struct Node {
        T data;
        Node* next = nullptr;
    };

    template <typename T>
    Node<T>* reverse_list(Node<T>* head) {
        Node<T>* previous = nullptr;
        Node<T>* current = head;

        while (current != nullptr) {
            Node<T>* next = current->next;
            current->next = previous;
            previous = current;
            current = next;
        }
        return previous;
    }`,
      explanation: "The function walks through the list once. At each node it saves the original next pointer, points the node back to the previous node, and advances. When the loop ends, previous is the new head. The time complexity is O(n) and the extra space is O(1).",
      explanationZh: "函数只遍历链表一次。对每个节点，先保存原来的 next 指针，再把当前节点指回前一个节点，然后向前推进。循环结束时，previous 就是新的头节点。时间复杂度为 O(n)，额外空间为 O(1)。"
    }
  },
  {
    id: "yellow-book-problem-086",
    reason: "Monte Carlo pi explanation had pi, disk condition, and variance formulas corrupted.",
    fields: {
      titleZh: "问题 1 - 如何用蒙特卡罗模拟计算 \\pi",
      category: "statistics",
      tags: monteCarloTags,
      promptZh: "如何用蒙特卡罗模拟计算 \\pi？这种方法的标准差是多少？",
      answer: raw`Generate $N$ independent points uniformly in the square $[-1,1]\times[-1,1]$. Let $A$ be the number of points satisfying
$$x^2+y^2\le1.$$
Then
$$\widehat\pi=4\frac{A}{N}$$
estimates $\pi$. Since $A$ is binomial with success probability $p=\pi/4$,
$$\operatorname{sd}(\widehat\pi)
=\sqrt{\frac{16p(1-p)}{N}}
=\sqrt{\frac{\pi(4-\pi)}{N}}
\approx\frac{1.64}{\sqrt N}.$$`,
      answerZh: raw`在正方形 $[-1,1]\times[-1,1]$ 中独立均匀生成 $N$ 个点。令 $A$ 为满足
$$x^2+y^2\le1$$
的点数。则
$$\widehat\pi=4\frac{A}{N}$$
可估计 $\pi$。因为 $A$ 服从成功概率 $p=\pi/4$ 的二项分布，
$$\operatorname{sd}(\widehat\pi)
=\sqrt{\frac{16p(1-p)}{N}}
=\sqrt{\frac{\pi(4-\pi)}{N}}
\approx\frac{1.64}{\sqrt N}.$$`,
      explanation: "The fraction A/N estimates the ratio between the area of the unit disk and the area of the surrounding square. That ratio is pi/4, so multiplying by 4 gives an estimator of pi. The convergence rate is O(N^{-1/2}).",
      explanationZh: "比例 A/N 估计单位圆盘面积与外接正方形面积之比。该比值为 pi/4，因此乘以 4 就得到 pi 的估计量。该估计的收敛速度为 O(N^{-1/2})。"
    }
  },
  {
    id: "yellow-book-problem-088",
    reason: "Geometric Brownian motion path-generation solution was truncated.",
    fields: {
      titleZh: "问题 3 - 如何用标准正态随机数生成几何布朗运动股价路径",
      category: "statistics",
      tags: [...monteCarloTags, "geometric Brownian motion"],
      promptZh: "如何使用标准正态随机数生成几何布朗运动股价路径？",
      answer: raw`For
$$dS_t=\mu S_t\,dt+\sigma S_t\,dW_t,$$
choose a time step $\Delta t=T/m$ and independent standard normal draws $Z_1,\ldots,Z_m$. The exact log-Euler update is
$$S_{t_{j+1}}
=S_{t_j}\exp\left((\mu-\tfrac12\sigma^2)\Delta t+\sigma\sqrt{\Delta t}\,Z_{j+1}\right).$$
Starting from $S_0$, repeatedly applying this exact one-step GBM transition generates a positive GBM path.`,
      answerZh: raw`对
$$dS_t=\mu S_t\,dt+\sigma S_t\,dW_t,$$
取时间步长 $\Delta t=T/m$，并生成相互独立的标准正态样本 $Z_1,\ldots,Z_m$。精确的 log-Euler 更新为
$$S_{t_{j+1}}
=S_{t_j}\exp\left((\mu-\tfrac12\sigma^2)\Delta t+\sigma\sqrt{\Delta t}\,Z_{j+1}\right).$$
从 $S_0$ 开始反复应用这个精确的一步 GBM 转移公式，即可生成始终为正的 GBM 路径。`,
      explanation: raw`The Euler update
$$S_{t_{j+1}}\approx S_{t_j}\left(1+\mu\Delta t+\sigma\sqrt{\Delta t}\,Z_{j+1}\right)$$
is easy to derive but can become negative for rare large negative normal draws. Applying Ito's formula to $\log S_t$ gives
$$d\log S_t=(\mu-\tfrac12\sigma^2)dt+\sigma dW_t,$$
which leads to the positive exponential update above. For GBM this exponential formula is the exact transition over one time step, not merely a first-order Euler approximation.`,
      explanationZh: raw`Euler 更新
$$S_{t_{j+1}}\approx S_{t_j}\left(1+\mu\Delta t+\sigma\sqrt{\Delta t}\,Z_{j+1}\right)$$
很直观，但在极端负的正态样本下可能产生负价格。对 $\log S_t$ 使用 Ito 公式可得
$$d\log S_t=(\mu-\tfrac12\sigma^2)dt+\sigma dW_t,$$
从而得到上面的指数形式更新，并保证价格为正。对 GBM 而言，该指数公式是单个时间步上的精确转移式，而不仅是一阶 Euler 近似。`
    }
  },
  {
    id: "yellow-book-problem-089",
    reason: "12-uniform normal approximation formula was corrupted and answer was empty.",
    fields: {
      category: "statistics",
      tags: monteCarloTags,
      answer: raw`If $U_1,\ldots,U_{12}$ are independent uniform random variables on $[0,1]$, then
$$Z=\sum_{i=1}^{12}U_i-6$$
is a common approximation to a standard normal sample.`,
      answerZh: raw`如果 $U_1,\ldots,U_{12}$ 是 $[0,1]$ 上的独立均匀随机变量，则
$$Z=\sum_{i=1}^{12}U_i-6$$
可作为标准正态分布样本的常用近似。`,
      explanation: "Each uniform variable has mean 1/2 and variance 1/12. The sum of 12 such variables has mean 6 and variance 1. By the central limit theorem, subtracting 6 gives an approximately standard normal variable. This method is simple but inefficient and bounded in [-6,6].",
      explanationZh: "每个均匀变量的均值为 1/2，方差为 1/12。12 个这样的变量之和均值为 6，方差为 1。根据中心极限定理，减去 6 后可近似为标准正态分布变量。该方法简单，但效率不高，而且生成值被限制在 [-6,6]，实践中通常会使用更高效的正态随机数生成方法。"
    }
  },
  {
    id: "yellow-book-problem-090",
    reason: "Monte Carlo convergence-rate formula was OCR-corrupted.",
    fields: {
      category: "statistics",
      tags: monteCarloTags,
      answer: raw`For plain Monte Carlo with $n$ independent paths, the statistical error is
$$O(n^{-1/2}).$$
If the simulated paths are also discretized into $m$ time steps with a first-order time discretization, the combined error is often summarized as
$$O\left(\max\left\{\frac1{\sqrt n},\frac1m\right\}\right),$$
up to model- and scheme-dependent constants.`,
      answerZh: raw`对普通 Monte Carlo，若使用 $n$ 条独立路径，统计误差为
$$O(n^{-1/2}).$$
如果路径还用 $m$ 个时间步进行一阶时间离散，综合误差通常可概括为
$$O\left(\max\left\{\frac1{\sqrt n},\frac1m\right\}\right),$$
其中常数依赖于模型和离散格式。`,
      explanation: "The key interview point is that the sampling error decays as one over the square root of the number of paths and does not deteriorate with the number of underlying assets. This dimension independence is one reason Monte Carlo is attractive for high-dimensional derivatives.",
      explanationZh: "这道题的关键是：抽样误差随路径数按平方根速度下降，即 1/sqrt(n)，并且不会因为标的资产维度增加而直接恶化。这种维度无关性是 Monte Carlo 适合高维衍生品定价的重要原因。"
    }
  },
  {
    id: "yellow-book-problem-093",
    reason: "Newton method convergence explanation had corrupted formulas.",
    fields: {
      category: "calculus",
      tags: ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Monte Carlo and Numerical Methods", "Newton's Method", "calculus"],
      answer: "If it converges to a simple root under the usual smoothness assumptions, Newton's method is quadratically convergent, i.e., second-order convergent.",
      answerZh: "在通常的光滑性条件下，如果牛顿法收敛到一个单根，则它是二次收敛的，也就是二阶收敛。",
      explanation: raw`For solving $f(x)=0$, Newton's iteration is
$$x_{k+1}=x_k-\frac{f(x_k)}{f'(x_k)}.$$
Let $x^\ast$ be a simple root, so $f(x^\ast)=0$ and $f'(x^\ast)\ne0$. If $f$ is twice continuously differentiable and $x_0$ is sufficiently close to $x^\ast$, then there is a constant $M$ such that
$$|x_{k+1}-x^\ast|\le M|x_k-x^\ast|^2$$
for all sufficiently large $k$. This squared-error relation is the meaning of quadratic convergence.`,
      explanationZh: raw`求解 $f(x)=0$ 时，牛顿迭代为
$$x_{k+1}=x_k-\frac{f(x_k)}{f'(x_k)}.$$
设 $x^\ast$ 是单根，即 $f(x^\ast)=0$ 且 $f'(x^\ast)\ne0$。如果 $f$ 二阶连续可微，且初值 $x_0$ 足够接近 $x^\ast$，则存在常数 $M$，使得充分大的 $k$ 满足
$$|x_{k+1}-x^\ast|\le M|x_k-x^\ast|^2.$$
误差平方级下降正是二次收敛的含义。`
    }
  },
  {
    id: "yellow-book-problem-096",
    reason: "Exponential-race probability derivation was unreadable and had no final answer.",
    fields: {
      category: "probabilityExpectation",
      tags: probabilityTags,
      answer: raw`The probability is
$$P(Y>X)=\frac{4}{7}.$$`,
      answerZh: raw`概率为
$$P(Y>X)=\frac{4}{7}.$$`,
      explanation: raw`Since $X$ has mean $6$ and $Y$ has mean $8$, their rates are
$$\lambda_X=\frac16,\qquad \lambda_Y=\frac18.$$
Using independence,
$$P(Y>X)=\int_0^\infty P(Y>x)f_X(x)\,dx
=\int_0^\infty e^{-x/8}\frac16e^{-x/6}\,dx.$$
Thus
$$P(Y>X)=\frac{1/6}{1/6+1/8}
=\frac{1/6}{7/24}
=\frac47.$$`,
      explanationZh: raw`由于 $X$ 的均值为 $6$，$Y$ 的均值为 $8$，它们的速率参数分别为
$$\lambda_X=\frac16,\qquad \lambda_Y=\frac18.$$
由独立性，
$$P(Y>X)=\int_0^\infty P(Y>x)f_X(x)\,dx
=\int_0^\infty e^{-x/8}\frac16e^{-x/6}\,dx.$$
因此
$$P(Y>X)=\frac{1/6}{1/6+1/8}
=\frac{1/6}{7/24}
=\frac47.$$`
    }
  },
  {
    id: "yellow-book-problem-097",
    reason: "Poisson expectation and variance were truncated and parameter notation was corrupted.",
    fields: {
      category: "probabilityExpectation",
      tags: probabilityTags,
      answer: raw`For $X\sim\operatorname{Poisson}(\lambda)$,
$$E[X]=\lambda,\qquad \operatorname{Var}(X)=\lambda.$$`,
      answerZh: raw`若 $X\sim\operatorname{Poisson}(\lambda)$，则
$$E[X]=\lambda,\qquad \operatorname{Var}(X)=\lambda.$$`,
      explanation: raw`The probability mass function is
$$P(X=k)=e^{-\lambda}\frac{\lambda^k}{k!},\qquad k=0,1,2,\ldots.$$
The mean is
$$E[X]=\sum_{k=1}^\infty k e^{-\lambda}\frac{\lambda^k}{k!}
=\lambda e^{-\lambda}\sum_{j=0}^\infty\frac{\lambda^j}{j!}
=\lambda.$$
Also,
$$E[X(X-1)]=\lambda^2.$$
Therefore
$$E[X^2]=E[X(X-1)]+E[X]=\lambda^2+\lambda,$$
and
$$\operatorname{Var}(X)=E[X^2]-(E[X])^2=\lambda.$$`,
      explanationZh: raw`概率质量函数为
$$P(X=k)=e^{-\lambda}\frac{\lambda^k}{k!},\qquad k=0,1,2,\ldots.$$
期望为
$$E[X]=\sum_{k=1}^\infty k e^{-\lambda}\frac{\lambda^k}{k!}
=\lambda e^{-\lambda}\sum_{j=0}^\infty\frac{\lambda^j}{j!}
=\lambda.$$
另外，
$$E[X(X-1)]=\lambda^2.$$
因此
$$E[X^2]=E[X(X-1)]+E[X]=\lambda^2+\lambda,$$
所以
$$\operatorname{Var}(X)=E[X^2]-(E[X])^2=\lambda.$$`
    }
  },
  {
    id: "yellow-book-problem-098",
    reason: "Expected distance in the unit disk had corrupted polar-coordinate formulas.",
    fields: {
      titleZh: "问题 4 - 单位圆盘中随机点到圆心的期望距离",
      category: "probabilityExpectation",
      tags: probabilityTags,
      promptZh: "从单位圆盘中均匀选择一个点。该点与圆盘中心之间的距离的期望值是多少？",
      answer: raw`The expected distance is
$$\frac23.$$`,
      answerZh: raw`期望距离为
$$\frac23.$$`,
      explanation: raw`Let $(X,Y)$ be uniformly distributed in the unit disk. The joint density is $1/\pi$ on the disk. The distance to the center is
$$R=\sqrt{X^2+Y^2}.$$
Using polar coordinates,
$$E[R]=\frac1\pi\int_0^{2\pi}\int_0^1 r\cdot r\,dr\,d\theta
=\frac1\pi(2\pi)\int_0^1 r^2\,dr
=2\cdot\frac13
=\frac23.$$`,
      explanationZh: raw`令 $(X,Y)$ 在单位圆盘上均匀分布。其联合密度在圆盘内为 $1/\pi$。到圆心的距离为
$$R=\sqrt{X^2+Y^2}.$$
使用极坐标，
$$E[R]=\frac1\pi\int_0^{2\pi}\int_0^1 r\cdot r\,dr\,d\theta
=\frac1\pi(2\pi)\int_0^1 r^2\,dr
=2\cdot\frac13
=\frac23.$$`
    }
  },
  {
    id: "yellow-book-problem-101",
    reason: "Normal-CDF expectation prompt and solution were truncated.",
    fields: {
      titleEn: "Question 7 - Expected value of Phi(X) for a normal random variable",
      titleZh: "问题 7 - 正态随机变量的 Phi(X) 的期望",
      category: "probabilityExpectation",
      tags: probabilityTags,
      promptEn: raw`Let $X$ be a normal random variable with mean $\mu$ and variance $\sigma^2$, and let $\Phi$ be the cumulative distribution function of the standard normal distribution. Find the expected value of $Y=\Phi(X)$.`,
      promptZh: raw`令 $X$ 为均值 $\mu$、方差 $\sigma^2$ 的正态随机变量，令 $\Phi$ 为标准正态分布的累积分布函数。求 $Y=\Phi(X)$ 的期望。`,
      answer: raw`The expected value is
$$E[\Phi(X)]=\Phi\left(\frac{\mu}{\sqrt{1+\sigma^2}}\right),$$
where $\Phi$ is the standard normal CDF.`,
      answerZh: raw`期望为
$$E[\Phi(X)]=\Phi\left(\frac{\mu}{\sqrt{1+\sigma^2}}\right),$$
其中 $\Phi$ 为标准正态分布的累积分布函数。`,
      explanation: raw`Let $Z$ be a standard normal random variable independent of $X$. Conditional on $X$,
$$\Phi(X)=P(Z\le X\mid X).$$
Taking expectations gives
$$E[\Phi(X)]=P(Z\le X)=P(Z-X\le0).$$
Since $Z-X$ is normal with mean $-\mu$ and variance $1+\sigma^2$,
$$P(Z-X\le0)=\Phi\left(\frac{\mu}{\sqrt{1+\sigma^2}}\right).$$`,
      explanationZh: raw`令 $Z$ 为与 $X$ 独立的标准正态随机变量。给定 $X$ 时，
$$\Phi(X)=P(Z\le X\mid X).$$
两边取期望得到
$$E[\Phi(X)]=P(Z\le X)=P(Z-X\le0).$$
因为 $Z-X$ 服从均值 $-\mu$、方差 $1+\sigma^2$ 的正态分布，
$$P(Z-X\le0)=\Phi\left(\frac{\mu}{\sqrt{1+\sigma^2}}\right).$$`
    }
  },
  {
    id: "yellow-book-problem-103",
    reason: "Central limit theorem formulas were OCR-corrupted.",
    fields: {
      category: "probabilityExpectation",
      tags: probabilityTags,
      answer: raw`If $X_1,X_2,\ldots$ are i.i.d. with mean $\mu$ and finite variance $\sigma^2$, and $S_n=X_1+\cdots+X_n$, then
$$\frac{S_n-n\mu}{\sigma\sqrt n}\xrightarrow{d}N(0,1).$$`,
      answerZh: raw`若 $X_1,X_2,\ldots$ 独立同分布，均值为 $\mu$，有限方差为 $\sigma^2$，且 $S_n=X_1+\cdots+X_n$，则
$$\frac{S_n-n\mu}{\sigma\sqrt n}\xrightarrow{d}N(0,1).$$`,
      explanation: raw`Equivalently, for large $n$,
$$S_n\approx n\mu+\sigma\sqrt n\,Z,$$
where $Z\sim N(0,1)$. The theorem says that after centering by the mean and scaling by the standard deviation, sums of many independent identical variables converge in distribution to a standard normal variable.`,
      explanationZh: raw`等价地，当 $n$ 较大时，
$$S_n\approx n\mu+\sigma\sqrt n\,Z,$$
其中 $Z\sim N(0,1)$。中心极限定理说明：大量独立同分布变量之和，在减去均值并除以标准差后，会按分布收敛到标准正态变量。`
    }
  },
  {
    id: "yellow-book-problem-105",
    reason: "Ito differential shorthand explanation was truncated.",
    fields: {
      titleEn: "Question 11 - Explain the assumption (dW_t)^2 = dt used in the informal derivation of Ito's Lemma",
      titleZh: "问题 11 - 解释 Ito 引理非正式推导中的 (dW_t)^2 = dt",
      category: "probabilityExpectation",
      tags: stochasticTags,
      promptEn: "Explain the assumption (dW_t)^2 = dt used in the informal derivation of Ito's Lemma.",
      promptZh: "解释 Ito 引理非正式推导中使用的记号 (dW_t)^2 = dt。",
      answer: "It is shorthand for the quadratic variation of Brownian motion: over a partition of [0,T], the sum of squared Brownian increments converges to T. In differential notation this is written as (dW_t)^2 = dt.",
      answerZh: "这是布朗运动二次变分的简写：在 [0,T] 的分割上，布朗增量平方和收敛到 T。用微分记号写作 (dW_t)^2 = dt。",
      explanation: raw`For a partition $0=t_0<t_1<\cdots<t_n=T$,
$$\sum_{i=1}^n (W_{t_i}-W_{t_{i-1}})^2\to T$$
in $L^2$ as the mesh goes to zero. This is the quadratic variation of Brownian motion. The informal Ito table records this as
$$dW_t\,dW_t=dt,\qquad dW_t\,dt=0,\qquad dt^2=0.$$
It does not mean an ordinary derivative of $W_t$ exists; it is a compact notation for the limiting behavior of stochastic increments.`,
      explanationZh: raw`对分割 $0=t_0<t_1<\cdots<t_n=T$，
$$\sum_{i=1}^n (W_{t_i}-W_{t_{i-1}})^2\to T$$
当网格趋于 0 时在 $L^2$ 意义下成立。这就是布朗运动的二次变分。非正式的 Ito 乘法表将其记为
$$dW_t\,dW_t=dt,\qquad dW_t\,dt=0,\qquad dt^2=0.$$
它并不是说 $W_t$ 存在普通意义下的导数，而是对随机增量极限行为的紧凑记号。`
    }
  },
  {
    id: "yellow-book-problem-106",
    reason: "Wiener covariance title, prompt, notation, and answer were corrupted.",
    fields: {
      titleEn: "Question 12 - Covariance of a Wiener process",
      titleZh: "问题 12 - 维纳过程的协方差",
      category: "probabilityExpectation",
      tags: stochasticTags,
      promptEn: raw`If $W_t$ is a Wiener process, find $E[W_sW_t]$.`,
      promptZh: raw`如果 $W_t$ 是维纳过程，求 $E[W_sW_t]$。`,
      answer: raw`For a Wiener process,
$$E[W_sW_t]=\min(s,t).$$`,
      answerZh: raw`对维纳过程，
$$E[W_sW_t]=\min(s,t).$$`,
      explanation: raw`Assume $s\le t$. Then
$$W_t=(W_t-W_s)+W_s.$$
Therefore
$$E[W_sW_t]=E[W_s(W_t-W_s)]+E[W_s^2].$$
The increment $W_t-W_s$ is independent of $W_s$ and has mean $0$, so the first term is $0$. Since $W_s\sim N(0,s)$, $E[W_s^2]=s$. Thus $E[W_sW_t]=s$ when $s\le t$, and by symmetry the answer is $\min(s,t)$.`,
      explanationZh: raw`假设 $s\le t$。则
$$W_t=(W_t-W_s)+W_s.$$
因此
$$E[W_sW_t]=E[W_s(W_t-W_s)]+E[W_s^2].$$
增量 $W_t-W_s$ 与 $W_s$ 独立且均值为 $0$，所以第一项为 $0$。又因为 $W_s\sim N(0,s)$，所以 $E[W_s^2]=s$。因此当 $s\le t$ 时 $E[W_sW_t]=s$，由对称性可得答案为 $\min(s,t)$。`
    }
  },
  {
    id: "yellow-book-problem-110",
    reason: "Mean and variance of stochastic integral were truncated and prompt notation was garbled.",
    fields: {
      titleEn: "Question 16 - Mean and variance of integral of W_s^2 dW_s",
      titleZh: "问题 16 - 积分 int_0^t W_s^2 dW_s 的均值和方差",
      category: "probabilityExpectation",
      tags: stochasticTags,
      promptEn: raw`Let $W_t$ be a Wiener process. Find the mean and variance of
$$X=\int_0^t W_s^2\,dW_s.$$`,
      promptZh: raw`令 $W_t$ 为维纳过程。求
$$X=\int_0^t W_s^2\,dW_s$$
的均值和方差。`,
      answer: raw`The mean is $0$ and the variance is
$$\operatorname{Var}(X)=t^3.$$`,
      answerZh: raw`均值为 $0$，方差为
$$\operatorname{Var}(X)=t^3.$$`,
      explanation: raw`The integrand $W_s^2$ is adapted and square integrable on $[0,t]$. By the martingale property of Ito integrals,
$$E[X]=0.$$
By Ito isometry,
$$E[X^2]=\int_0^t E[W_s^4]\,ds.$$
Since $W_s\sim N(0,s)$, its fourth moment is $E[W_s^4]=3s^2$. Hence
$$E[X^2]=\int_0^t 3s^2\,ds=t^3.$$
Because $E[X]=0$, $\operatorname{Var}(X)=t^3$.`,
      explanationZh: raw`被积函数 $W_s^2$ 是适应过程，且在 $[0,t]$ 上平方可积。由 Ito 积分的鞅性质，
$$E[X]=0.$$
由 Ito 等距，
$$E[X^2]=\int_0^t E[W_s^4]\,ds.$$
由于 $W_s\sim N(0,s)$，其四阶矩为 $E[W_s^4]=3s^2$。因此
$$E[X^2]=\int_0^t 3s^2\,ds=t^3.$$
又因为 $E[X]=0$，所以 $\operatorname{Var}(X)=t^3$。`
    }
  },
  {
    id: "yellow-book-problem-111",
    reason: "Stochastic-integral variance formula was OCR-corrupted; original integrand was restored from the scanned PDF.",
    fields: {
      titleEn: "Question 17 - Variance of an Ito integral with exponential Brownian integrand",
      titleZh: "问题 17 - 指数布朗被积函数的 Ito 积分方差",
      category: "probabilityExpectation",
      tags: stochasticTags,
      promptEn: raw`If $W_t$ is a Wiener process, find the variance of
$$X=\int_0^1 \sqrt{t}\,e^{W_t^2/8}\,dW_t.$$`,
      promptZh: raw`如果 $W_t$ 是维纳过程，求
$$X=\int_0^1 \sqrt{t}\,e^{W_t^2/8}\,dW_t$$
的方差。`,
      answer: raw`The variance is
$$\operatorname{Var}(X)=\frac23\left(8-5\sqrt2\right).$$`,
      answerZh: raw`方差为
$$\operatorname{Var}(X)=\frac23\left(8-5\sqrt2\right).$$`,
      explanation: raw`The Ito integral has mean zero. By Ito isometry,
$$\operatorname{Var}(X)=E[X^2]
=\int_0^1 E\left[\left(\sqrt t\,e^{W_t^2/8}\right)^2\right]dt
=\int_0^1 t\,E\left[e^{W_t^2/4}\right]dt.$$
Since $W_t\sim N(0,t)$,
$$E[e^{W_t^2/4}]=\sqrt{\frac{2}{2-t}},\qquad 0\le t\le1.$$
Therefore
$$\operatorname{Var}(X)=\int_0^1 t\sqrt{\frac{2}{2-t}}\,dt
=\frac23(8-5\sqrt2).$$`,
      explanationZh: raw`该 Ito 积分均值为零。由 Ito 等距，
$$\operatorname{Var}(X)=E[X^2]
=\int_0^1 E\left[\left(\sqrt t\,e^{W_t^2/8}\right)^2\right]dt
=\int_0^1 t\,E\left[e^{W_t^2/4}\right]dt.$$
由于 $W_t\sim N(0,t)$，
$$E[e^{W_t^2/4}]=\sqrt{\frac{2}{2-t}},\qquad 0\le t\le1.$$
因此
$$\operatorname{Var}(X)=\int_0^1 t\sqrt{\frac{2}{2-t}}\,dt
=\frac23(8-5\sqrt2).$$`
    }
  },
  {
    id: "yellow-book-problem-113",
    reason: "Deterministic-integrand Ito integral variance notation was garbled.",
    fields: {
      titleEn: "Question 19 - Variance of int_0^t s dW_s",
      titleZh: "问题 19 - int_0^t s dW_s 的方差",
      category: "probabilityExpectation",
      tags: stochasticTags,
      promptEn: raw`If $W_t$ is a Wiener process, find the variance of
$$\int_0^t s\,dW_s.$$`,
      promptZh: raw`如果 $W_t$ 是维纳过程，求
$$\int_0^t s\,dW_s$$
的方差。`,
      answer: raw`The variance is
$$\int_0^t s^2\,ds=\frac{t^3}{3}.$$`,
      answerZh: raw`方差为
$$\int_0^t s^2\,ds=\frac{t^3}{3}.$$`,
      explanation: raw`For a deterministic square-integrable function $f$,
$$\int_0^t f(s)\,dW_s$$
is normally distributed with mean $0$ and variance
$$\int_0^t f(s)^2\,ds.$$
Here $f(s)=s$, so
$$\operatorname{Var}\left(\int_0^t s\,dW_s\right)
=\int_0^t s^2\,ds
=\frac{t^3}{3}.$$`,
      explanationZh: raw`对确定性的平方可积函数 $f$，
$$\int_0^t f(s)\,dW_s$$
服从均值为 $0$、方差为
$$\int_0^t f(s)^2\,ds$$
的正态分布。这里 $f(s)=s$，所以
$$\operatorname{Var}\left(\int_0^t s\,dW_s\right)
=\int_0^t s^2\,ds
=\frac{t^3}{3}.$$`
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
  const parsed = { apply: false, rebuild: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--apply") {
      parsed.apply = true;
    } else if (arg === "--rebuild") {
      parsed.rebuild = true;
    } else if (arg === "--source") {
      parsed.source = args[++i];
    } else if (arg === "--report") {
      parsed.report = args[++i];
    }
  }
  return parsed;
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (fallback !== undefined) return fallback;
    throw error;
  }
}

function relativePath(filePath) {
  return path.relative(projectRoot, filePath);
}
