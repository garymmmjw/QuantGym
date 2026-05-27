# QuantGuide Question

## 549. Good Grid II

**Metadata**

- ID: `HRkGVMWujQD5ELVgc8tB`
- URL: https://www.quantguide.io/questions/good-grid-ii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Tower Research Capital
- Source: https://aekusbhathal.com/TeachingProblems/CS70_BasicProbability_q.pdf
- Tags: Combinatorics, Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-4 18:10:35 America/New_York
- Last Edited By: Gabe

### 题干

Let $a,b,c,$ and $d$ be uniformly at random selected from $S_n = [-n,n] \cap \mathbb{Z}$, the integers that are at most $n$. Define the two closed intervals $I_1 = [\text{min}\{a,b\},\text{max}\{a,b\}]$ and $I_2 = [\text{min}\{c,d\},\text{max}\{c,d\}]$. Let $p(n)$ be the probability (as a function of $n$) that $I_1$ is completely contained inside $I_2$. This means that $$\text{min}\{c,d\} < \text{min}\{a,b\} \leq \text{max}\{a,b\} < \text{max}\{c,d\}$$ Define $p = \displaystyle \lim_{n \rightarrow \infty} p(n)$. Compute $\dfrac{p - p(10)}{p}$.

### Hint

Our sample space here is the collection of all pairs of intervals. Note that we have two cases here for each of the two intervals we form. First, we could have that our interval is a singular point, which occurs if $a = b$ or $c = d$. There are $2n+1$ ways for this to occur. Alternatively, we can have that $a \neq b$ or $c \neq d$. 

$$$$

Think about a "stars and bars" approach to the number of ways to select the intervals satisfying this condition.

### 解答

Our sample space here is the collection of all pairs of intervals. Note that we have two cases here for each of the two intervals we form. First, we could have that our interval is a singular point, which occurs if $a = b$ or $c = d$. There are $2n+1$ ways for this to occur. Alternatively, we can have that $a \neq b$ or $c \neq d$. In this case, for every $2$ distinct values we select from $S_n$, exactly one arrangement of them will make a valid interval. Therefore, there are $\displaystyle \binom{2n+1}{2}$ ways to pick two distinct points from $S_n$. Adding these two cases together, there are $$\dfrac{(2n+1)(2n)}{2} + (2n+1) = \binom{2n+2}{2}$$ ways to form an interval, so there are $\displaystyle \binom{2n+2}{2}^2$ ways to pick the two intervals. 

$$$$

Let a $|$ represent an endpoint of an interval. There are $2n+2$ locations a $|$ can be put, as we can put them in any spot from before $-n$ to after $n$, which is $2n+2$ spots. For example, with $n = 1$, $|-1|01$ represents $a = b = -1$, whereas $|-10|1$ represents $a = -1$ and $b = 0$. Additionally, we see that a proper nesting is really just a way to select $4$ distinct spots from the $2n+2$, as we can't have the endpoints of $I_1$ be equal to either of the endpoints of $I_2$. Therefore, there are $\displaystyle \binom{2n+2}{4}$ ways to pick the intervals such that they don't overlap. Thus, the probability is $$p(n) = \dfrac{\binom{2n+2}{4}}{\binom{2n+2}{2}^2} = \dfrac{1}{6} \cdot \dfrac{2n(2n-1)}{(2n+2)(2n+1)}$$ As $n \rightarrow \infty$, the term with $n$ in it tends to $1$, so $\displaystyle \lim_{n \rightarrow \infty} p(n) = p = \dfrac{1}{6}$.

$$$$

Therefore, $$\dfrac{p - p(10)}{p} = \dfrac{\frac{1}{6} - \frac{1}{6} \cdot \frac{20 \cdot 19}{22 \cdot 21}}{\frac{1}{6}} = \dfrac{41}{231}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "41/231"
    ],
    "companies": [
      {
        "company": "Tower Research Capital"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "HRkGVMWujQD5ELVgc8tB",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-4 18:10:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4373555,
    "randomizable": "",
    "source": "https://aekusbhathal.com/TeachingProblems/CS70_BasicProbability_q.pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Good Grid II",
    "topic": "probability",
    "urlEnding": "good-grid-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Tower Research Capital"
      }
    ],
    "difficulty": "hard",
    "id": "HRkGVMWujQD5ELVgc8tB",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Good Grid II",
    "topic": "probability",
    "urlEnding": "good-grid-ii"
  }
}
```
