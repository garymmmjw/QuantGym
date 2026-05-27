# QuantGuide Question

## 956. Salah Goal

**Metadata**

- ID: `1zi8Fqz5Rm0arxEi6H3P`
- URL: https://www.quantguide.io/questions/salah-goal
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: original
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-5 15:14:57 America/New_York
- Last Edited By: Matt G

### 题干

Mo Salah is lining up to take a penalty kick. He decides to perform $3n$ motions. Each motion is either $2$ steps forward or $1$ step backwards. Find the probability that after $9$ motions, Salah is exactly where he started.

### Hint

If Salah is to end up exactly where he started, he must have taken twice as many steps backwards as he did forward.

### 解答

We will solve this for $3n$ steps. If Salah is to end up exactly where he started, he must have taken $n$ steps forward and $2n$ steps backward. This is because of the fact that each step backwards is twice as far as a step forward. There are $2^{3n} = 8^n$ total ways Salah could move and $\binom{3n}{n}$ of them have exactly $n$ steps forward, so the probability is $\dfrac{\binom{3n}{n}}{8^n}$. Plugging in $n = 3$, we get the answer $\dfrac{21}{128}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "21/128"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": true,
    "id": "1zi8Fqz5Rm0arxEi6H3P",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 15:14:57 America/New_York",
    "lastEditedBy": "Matt G",
    "orderId": 7800970,
    "randomizable": "",
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Salah Goal",
    "topic": "probability",
    "urlEnding": "salah-goal",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "1zi8Fqz5Rm0arxEi6H3P",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Salah Goal",
    "topic": "probability",
    "urlEnding": "salah-goal"
  }
}
```
