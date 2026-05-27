# QuantGuide Question

## 681. Prime Hunter

**Metadata**

- ID: `82EH4IEaskZyoiWMB9CK`
- URL: https://www.quantguide.io/questions/prime-hunter
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: https://web.ma.utexas.edu/users/gordanz/notes/solved_problems.pdf
- Tags: Discrete Random Variables, Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-4 22:41:32 America/New_York
- Last Edited By: Gabe

### 题干

A standard fair $6-$sided die is rolled $6$ times. We'll define a successful roll as rolling a prime number; otherwise, it’s a failure. What is the probability that there are exactly $3$ successful rolls?

### Hint

The distribution of number of successes is binomial. What are the parameters?

### 解答

This is a simple binomial distribution, with our successes happening at a $\frac{1}{2}$ probability, i.e. we roll a $2,3,$ or $5$, and our failures happening $\frac{1}{2}$ of the time as a well. Thus, if $S$ is the number of successful rolls, $S \sim \text{Binom}(6,0.5)$.

We then get $$\mathbb{P}[S = 3] = \binom63 \cdot \left(\frac{1}{2}\right)^6 = \dfrac{20}{64} = \dfrac{5}{16}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/16"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "82EH4IEaskZyoiWMB9CK",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 22:41:32 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5541094,
    "randomizable": "",
    "source": "https://web.ma.utexas.edu/users/gordanz/notes/solved_problems.pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Prime Hunter",
    "topic": "probability",
    "urlEnding": "prime-hunter",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "82EH4IEaskZyoiWMB9CK",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Prime Hunter",
    "topic": "probability",
    "urlEnding": "prime-hunter"
  }
}
```
