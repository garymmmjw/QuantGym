# QuantGuide Question

## 802. Exponential Brownian Motion

**Metadata**

- ID: `rlNyNfUEAuwrBDXdjflc`
- URL: https://www.quantguide.io/questions/exponential-brownian-motion
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Morgan Stanley
- Source: glassdoor, edited
- Tags: Stochastic Calculus
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-30 23:21:35 America/New_York
- Last Edited By: Gabe

### 题干

Let $W_t$ be a standard Brownian Motion.  Find the sum of the factorials of the values of $n$ where $X_t = W_t^n$ is a martingale.

### Hint

Use Ito's lemma with $f(x) = x^n$.

### 解答

Using Ito's lemma with $f(x) = x^n$, we have that $$dX_t = nW_t^{n-1}dW_t + \dfrac{1}{2}n(n-1)W_t^{n-2}d[W,W]_t = nW_t^{n-1}dW_t + \dfrac{1}{2}n(n-1)W_t^{n-2}dt$$ For this to be a martingale, the $dt$ term must vanish, which occurs precisely when $n = 0,1$. Therefore, $0! + 1! = 2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "Morgan Stanley"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "rlNyNfUEAuwrBDXdjflc",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:21:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6565701,
    "source": "glassdoor, edited",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Exponential Brownian Motion",
    "topic": "pure math",
    "urlEnding": "exponential-brownian-motion",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Morgan Stanley"
      }
    ],
    "difficulty": "easy",
    "id": "rlNyNfUEAuwrBDXdjflc",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Exponential Brownian Motion",
    "topic": "pure math",
    "urlEnding": "exponential-brownian-motion"
  }
}
```
