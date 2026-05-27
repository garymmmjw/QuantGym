# QuantGuide Question

## 552. Geometric PGF

**Metadata**

- ID: `zomG575pJPqnmxMvcume`
- URL: https://www.quantguide.io/questions/geometric-pgf
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: og
- Tags: Expected Value, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-17 20:30:29 America/New_York
- Last Edited By: Gabe

### 题干

Instead of the Moment Generating Function (MGF), for non-negative integer-valued discrete random variables $X$, we can define the $\textit{Probability Generating Function}$ (PGF), which is given by $p(z) = \mathbb{E}[z^X]$ for $|z| \leq 1$. Find the PGF of $X \sim \text{Geom}(p)$. Evaluate this function for $z = \frac{1}{3}$ and $p = \frac{2}{3}$.

### Hint

Use LOTUS.

### 解答

By LOTUS, we have that $$p(z) = \mathbb{E}[z^X] = \displaystyle \sum_{k=1}^{\infty} z^k \mathbb{P}[X = k] = \displaystyle \sum_{k=1}^{\infty} p(1-p)^{k-1} \cdot z^k = pz\sum_{k=1}^{\infty} (z(1-p))^{k-1}= \dfrac{pz}{1-(1-p)z}$$ The last sum converges since $|(1-p)z| \leq 1$. Plugging in our desired values, we obtain our answer of $\dfrac{2/9}{1-1/3 \cdot 1/3} = \dfrac{1}{4}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/4"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "zomG575pJPqnmxMvcume",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 20:30:29 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4411758,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Geometric PGF",
    "topic": "probability",
    "urlEnding": "geometric-pgf",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "zomG575pJPqnmxMvcume",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Geometric PGF",
    "topic": "probability",
    "urlEnding": "geometric-pgf"
  }
}
```
