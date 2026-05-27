# QuantGuide Question

## 924. Binary Dot

**Metadata**

- ID: `SPnfmnvzFGAmlJ3rrlei`
- URL: https://www.quantguide.io/questions/binary-dot
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: https://math.stackexchange.com/questions/591138/probability-that-the-dot-product-of-two-binary-vectors-is-0-or-1?rq=1
- Tags: Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:59:35 America/New_York
- Last Edited By: Gabe

### 题干

Let $v_1$ and $v_2$ be two vectors of length $10$. The $10$ elements of $v_1$ are IID $\text{Bernoulli}\left(\dfrac{1}{2}\right)$ random variables. The $10$ elements of $v_2$ are IID $\text{Bernoulli}\left(\dfrac{3}{4}\right)$ random variables. Find the probability that $v_1 \cdot v_2$ is odd, where the $\cdot$ is dot product of two vectors. The probability is in the form $\dfrac{1}{2} - \dfrac{1}{a^n}$, where $a$ is prime. Find $an$.

### Hint

Solve for the probability with $n = 1$ and then use law of total probability to generalize.

### 解答

We're going to solve this for general $n$. Let $p_n$ be this probabilities when $v_1,v_2 \in \mathbb{R}^n$. For $n = 1$, the probability is just  $\dfrac{3}{4} \cdot \dfrac{1}{2} = \dfrac{3}{8}$, as this implies both of the values generated must be $1$. 

$$$$

Now, let's suppose we know $p_n$. Then $p_{n+1}$ either means we had an even sum with $n$ dimensions (occurring with probability $1-p_n$) and we obtain $1$ for the $(n+1)$st product OR we had an odd sum with $n$ dimensions (occurring with probability $p_n$) and we obtain $0$ for the $(n+1)$st product. This means $p_{n+1} = \dfrac{3}{8} \cdot (1-p_n) + \dfrac{5}{8} p_n = \dfrac{1}{4}p_n + \dfrac{3}{8}$. This is a recurrence relation that can be explicitly solved. However, starting from $p_1 = \dfrac{3}{8}$, $$p_2 = \dfrac{3}{32} + \dfrac{3}{8} = \dfrac{15}{32}, p_3 = \dfrac{15}{128} + \dfrac{3}{8} = \dfrac{63}{128}$$

We can see that $p_1 = \dfrac{3}{8} = \dfrac{1 - \frac{1}{4}}{2}, p_2 = \dfrac{1 - \frac{1}{4^2}}{2}, p_3 = \dfrac{1 - \frac{1}{4^3}}{2}$, so we conjecture $p_n = \dfrac{1-4^{-n}}{2}$, so $p_{10} = \dfrac{1}{2} - \dfrac{1}{2 \cdot 4^{10}} = \dfrac{1}{2} - \dfrac{1}{2^{21}}$. Thus, $a = 2$ and $n = 21$, meaning $an = 42$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "42"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "SPnfmnvzFGAmlJ3rrlei",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:59:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7567664,
    "source": "https://math.stackexchange.com/questions/591138/probability-that-the-dot-product-of-two-binary-vectors-is-0-or-1?rq=1",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Binary Dot",
    "topic": "probability",
    "urlEnding": "binary-dot"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "SPnfmnvzFGAmlJ3rrlei",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Binary Dot",
    "topic": "probability",
    "urlEnding": "binary-dot"
  }
}
```
