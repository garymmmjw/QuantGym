# QuantGuide Question

## 196. Half Cycle

**Metadata**

- ID: `jc6lFsmQXzC94eowvtUN`
- URL: https://www.quantguide.io/questions/half-cycle
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: Jane Street, Maven Securities
- Source: https://www.math.lsu.edu/~smolinsk/Quant_Interview_Prep.pdf
- Tags: Combinatorics, Calculus, Expected Value
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-4 19:00:31 America/New_York
- Last Edited By: Gabe

### 题干

Let $C_n$ count the number of cycles in a random permutation of $\{1,2,\dots, 2n\}$ that are larger than $n$ in length. Compute $\displaystyle \lim_{n \rightarrow \infty} \mathbb{E}[C_n]$. The answer is in the form $\ln(q)$ for some rational number $q$. Find $q$.

### Hint

First, find the expected number of $k-$cycles in the permutation for $k > n$. Then, sum those up from $n+1$ to $2n$ to get $\mathbb{E}[C_n]$. Use linearity of expectation to compute this part. You will end up with a sum that may be able to be re-written to look like a Riemann Integral.

### 解答

First, we need to find the expected number of $k-$cycles in our permutation for $k > n$. Then, we can sum those up from $n+1$ to $2n$ to get $\mathbb{E}[C_n]$. 

$$$$

First, let's fix some $n+1 \leq k \leq 2n$. Let $X_i$ be the indicator of whether or not the value $i$ belongs to a cycle of length $k$. Then we have that $$T = \dfrac{\displaystyle \sum_{i=1}^{2n}X_i}{k}$$ gives the total number of $k-$cycles, as we need to remove rotations ($k$ such rotations per $k-$cycle). Using linearity of expectation, we have that $$\mathbb{E}[T] = \dfrac{1}{k}\displaystyle \sum_{i=1}^{2n} \mathbb{E}[X_i] = \dfrac{2n}{k}\mathbb{E}[X_1]$$ $\mathbb{E}[X_1]$ is just the probability $1$ belongs to a $k-$cycle. There are $(2n)!$ permutations of $\{1,2,\dots, 2n\}$. There are $\displaystyle \binom{2n-1}{k-1}$ ways to pick $k-1$ more elements to belong to the $k-$cycle. Now that we have selected the elements, there are $(k-1)!$ ways to arrange those elements. Then, there are $(2n-k)!$ ways to arrange the other $2n-k$ elements. This yields that our probability that $1$ belongs to a cycle is $$\dfrac{\binom{2n-1}{k-1}(k-1)!(2n-k)!}{(2n)!} = \dfrac{1}{2n}$$ Therefore, $\mathbb{E}[T] = \dfrac{1}{k}$ after substituting in. 

$$$$

The above tells us that the expected number of $k-$cycles for $1 \leq k \leq 2n$ is $\dfrac{1}{k}$. Therefore, $\mathbb{E}[C_n]$ is just the sum of the terms above from $n+1$ to $2n$. Namely, $$\mathbb{E}[C_n] = \displaystyle \sum_{k = n+1}^{2n} \dfrac{1}{k} = \displaystyle \sum_{k = n+1}^{2n} \dfrac{1}{\frac{k}{n}} \cdot \dfrac{1}{n}$$ This is starting to look like a Riemann Integral. Let $x = \dfrac{k}{n}$ so that $dx = \dfrac{1}{n}$ (this is a discrete sum currently, so $dx$ is just change between terms). The lower bound of our integral is $x_L = \dfrac{n+1}{n} \rightarrow 1$, while the upper bound is $x_U = \dfrac{2n}{n} = 2$. As $n \rightarrow \infty$, this sum converges to the Riemann Integral $$\displaystyle \int_1^2 \dfrac{1}{x}dx = \ln(2)$$ Therefore, $q = 2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Maven Securities"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "jc6lFsmQXzC94eowvtUN",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 19:00:31 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1499780,
    "source": "https://www.math.lsu.edu/~smolinsk/Quant_Interview_Prep.pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Calculus"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Half Cycle",
    "topic": "probability",
    "urlEnding": "half-cycle",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Maven Securities"
      }
    ],
    "difficulty": "hard",
    "id": "jc6lFsmQXzC94eowvtUN",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Calculus"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Half Cycle",
    "topic": "probability",
    "urlEnding": "half-cycle"
  }
}
```
