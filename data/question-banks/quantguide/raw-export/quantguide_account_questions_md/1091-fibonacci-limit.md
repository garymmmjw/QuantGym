# QuantGuide Question

## 1091. Fibonacci Limit I 

**Metadata**

- ID: `X9MSSLX2D4WI1VzAQuWw`
- URL: https://www.quantguide.io/questions/fibonacci-limit
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: og
- Tags: Pure Math
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-30 23:06:27 America/New_York
- Last Edited By: Gabe

### 题干

Let $F_n$ be the Fibonacci sequence. Compute $\displaystyle \lim_{n \rightarrow \infty} \dfrac{F_{n+1}}{F_n}$. Your answer should be in the form $\dfrac{a+\sqrt{b}}{c}$, where all of $a,b,$ and $c$ are pairwise relatively prime. Find $abc$.

### Hint

Write $F_{n+1} = F_n + F_{n-1}$ and get a polynomial that the limit solves.

### 解答

We can write $F_{n+1} = F_n + F_{n-1}$, so if $L$ is the limit in question, we have that $\dfrac{F_{n+1}}{F_n} = 1 + \dfrac{F_{n-1}}{F_n}$, so in limit, $L = 1 + \dfrac{1}{L}$. Equivalently, $L^2 - L - 1 = 0$. This has roots $L_{1,2} = \dfrac{1 \pm \sqrt{5}}{2}$. Since Fibonacci numbers are increasing as $n$ increasing, we must take the positive root, so $L = \dfrac{1 + \sqrt{5}}{2}$, meaning $abc = 1 \cdot 2 \cdot 5 = 10$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "X9MSSLX2D4WI1VzAQuWw",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-30 23:06:27 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8932197,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Fibonacci Limit I ",
    "topic": "brainteasers",
    "urlEnding": "fibonacci-limit",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "X9MSSLX2D4WI1VzAQuWw",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Fibonacci Limit I ",
    "topic": "brainteasers",
    "urlEnding": "fibonacci-limit"
  }
}
```
