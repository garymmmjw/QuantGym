# QuantGuide Question

## 14. Ten Consecutive Heads

**Metadata**

- ID: `DUQwre5YII9dfLY6ak5E`
- URL: https://www.quantguide.io/questions/ten-consecutive-heads
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Jane Street, WorldQuant, Two Sigma, Citadel, SIG, Squarepoint Capital, IMC, Goldman Sachs
- Source: classic
- Tags: Expected Value, Conditional Expectation
- Premium: True
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-7 12:22:33 America/New_York
- Last Edited By: Gabe

### 题干

On average, how many times must a fair coin be flipped to obtain $10$ consecutive heads?

### Hint

Let $f_{k}$ be the expected number flips of the coin needed to obtain $10$ heads when you have $0 \leq k \leq 10$ heads consecutively obtained already. Use Law of Total Expectation to derive a recurrence for $f_k$ and notice a pattern.

### 解答

We are going to solve this more generally for $n$ consecutive heads. Let $f_{k}$ be the expected number flips of the coin needed to obtain $n$ heads when you have $0 \leq k \leq n$ heads consecutively obtained already. Our boundary condition is that $f_n = 0$, as you already have all $n$ heads obtained. We can see that $f_{n-1} = \dfrac{1}{2} \cdot 1 + \dfrac{1}{2} \cdot (1 + f_0) = 1 + \dfrac{1}{2}f_0$, as with probability $1/2$, you reach $n$ heads, and with probability $1/2$, you start over. Similarly, we have that $$f_{n-2} = 1 + \dfrac{1}{2}f_{n-1} + \dfrac{1}{2}f_0 =1 + \dfrac{1}{2}\left(1 + \dfrac{1}{2}f_0\right)  + \dfrac{1}{2}f_0 = \dfrac{3}{2} + \dfrac{3}{4}f_0$$ By doing this again, we obtain $$f_{n-3} = 1 + \dfrac{1}{2}f_{n-2} + \dfrac{1}{2}f_0 = 1 + \dfrac{1}{2}\left(\dfrac{3}{2} + \dfrac{3}{4}f_0\right) + \dfrac{1}{2}f_0 = \dfrac{7}{4} + \dfrac{7}{8}f_0$$ A pattern now arises. By recursively applying this process, we can see that $$f_{n-k} = \left(2 - \dfrac{1}{2^{k-1}}\right) + \left(1 - \dfrac{1}{2^k}\right)f_0$$ By plugging in $k = n$, we obtain $$f_0 = f_0\left(1 - \dfrac{1}{2^n}\right) + 2 - \dfrac{1}{2^{n-1}} \iff \dfrac{1}{2^n}f_0 = 2 - \dfrac{1}{2^{n-1}} \iff f_0 = 2^{n+1} - 2$$ In particular, for $n = 10$, our answer is $2^{11} - 2 = 2046$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2046"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Two Sigma"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "IMC"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "DUQwre5YII9dfLY6ak5E",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:22:33 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 126145,
    "source": "classic",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Ten Consecutive Heads",
    "topic": "probability",
    "urlEnding": "ten-consecutive-heads",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Two Sigma"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "IMC"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "DUQwre5YII9dfLY6ak5E",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Ten Consecutive Heads",
    "topic": "probability",
    "urlEnding": "ten-consecutive-heads"
  }
}
```
