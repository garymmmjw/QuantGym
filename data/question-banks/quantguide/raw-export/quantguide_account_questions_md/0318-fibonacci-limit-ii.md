# QuantGuide Question

## 318. Fibonacci Limit II

**Metadata**

- ID: `NNuLetzmAFN6tKgWmqwo`
- URL: https://www.quantguide.io/questions/fibonacci-limit-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: og
- Tags: Pure Math
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-30 23:10:55 America/New_York
- Last Edited By: Gabe

### 题干

Let $F_n$ be the Fibonacci sequence. Compute $\displaystyle \lim_{n \rightarrow \infty} \dfrac{F_{n+2}}{F_n}$. Your answer should be in the form $\dfrac{a+\sqrt{b}}{c}$, where all of $a,b,$ and $c$ are pairwise relatively prime. Find $abc$.

### Hint

Using the Fibonacci recurrence relation on $F_{n+2}$.

### 解答

We can write $\dfrac{F_{n+2}}{F_n} = \dfrac{F_{n+1}}{F_n} + 1$. Using the result of Fibonacci Limit I, the first term converges to the golden ratio $\dfrac{1+\sqrt{5}}{2}$, so the limit here is $$\dfrac{3+\sqrt{5}}{2}$$ The answer is $3 \cdot 5 \cdot 2 = 30$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "30"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "NNuLetzmAFN6tKgWmqwo",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-30 23:10:55 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2459765,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Fibonacci Limit II",
    "topic": "probability",
    "urlEnding": "fibonacci-limit-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "NNuLetzmAFN6tKgWmqwo",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Fibonacci Limit II",
    "topic": "probability",
    "urlEnding": "fibonacci-limit-ii"
  }
}
```
