# QuantGuide Question

## 237. Binomial Maximizer

**Metadata**

- ID: `5hA7oC1kRUJLNBmLNb96`
- URL: https://www.quantguide.io/questions/binomial-maximizer
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: Original
- Tags: Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:13:42 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $X \sim \text{Binom}(12,p)$ with $0 < p < 1$. Find the value of $p$ that maximizes $\mathbb{P}[X = 8]$.

### Hint

Take the derivative as a function of $p$ and set it equal to $0$.

### 解答

We will solve this for general $n$ in Binom$(n,p)$ and $0 \leq k \leq n$. Let $f(p) = \displaystyle \binom{n}{k}p^k(1-p)^{n-k}$. We want to maximize $f(p)$ in $p$. By the product and chain rules, $$f'(p) = \displaystyle \binom{n}{k}\left[kp^{k-1}(1-p)^{n-k} + (n-k)p^k(1-p)^{n-k-1}\right]$$ $$= \binom{n}{k}p^{k-1}(1-p)^{n-k-1}\left(k(1-p) - (n-k)p\right)$$  Now, we just need to set the term inside the parentheses equal to $0$, as the terms outside are not $0$. This is since $0 < p < 1$. Therefore, $k(1-p) - (n-k)p = k - kp - np + kp = k - np = 0$. This means $p = \dfrac{k}{n}$ maximizes $f(p)$. One can check this is the maximizer by direct substitution, but this is not necessary. In this case, $k = 8$ and $n = 12$, so $p = \dfrac{8}{12} = \dfrac{2}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "5hA7oC1kRUJLNBmLNb96",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:13:42 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1871926,
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Binomial Maximizer",
    "topic": "probability",
    "urlEnding": "binomial-maximizer",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "5hA7oC1kRUJLNBmLNb96",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Binomial Maximizer",
    "topic": "probability",
    "urlEnding": "binomial-maximizer"
  }
}
```
