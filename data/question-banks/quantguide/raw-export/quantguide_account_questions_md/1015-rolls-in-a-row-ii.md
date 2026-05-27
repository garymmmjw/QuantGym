# QuantGuide Question

## 1015. Rolls in a Row II

**Metadata**

- ID: `Qkrl6LJfUCDG7sd2ILaF`
- URL: https://www.quantguide.io/questions/rolls-in-a-row-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG
- Source: Kaushik - SIG and Dice pdf
- Tags: Conditional Expectation
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:24:53 America/New_York
- Last Edited By: Gabe

### 题干

How many rolls of a fair $6$-sided die must be rolled on average to get $5$ and $6$ in a row in that order?


### Hint

Make Markov state equations.

### 解答

We can use Markov Chains for this problem. Let $E_{0}$ be the expectation state of not having the starting $5$. Let $E_{1}$ be the expectation state of having the $5$). Finally, let $E_{2}$ be the expectation state of having $5$ and $6$ in a row (our goal). Then our equations become:
$$
E_{0} = \frac{1}{6}(E_{1}+1)+\frac{5}{6}(E_{0}+1) = \frac{1}{6}E_{1}+\frac{5}{6}E_{0}+1
$$
$$
E_{1} = \frac{1}{6}(E_{2}+1)+\frac{1}{6}(E_{1}+1)+\frac{2}{3}(E_{0}+1) = \frac{1}{6}E_{2}+\frac{5}{6}E_{0}+1
$$
$$
E_{2} = 0
$$
Solving these equations, we get $E_{0}$ = $36$. Thus it takes $36$ rolls on average to roll a $5$ and $6$ in a row.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "36"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Qkrl6LJfUCDG7sd2ILaF",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:24:53 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8231451,
    "source": "Kaushik - SIG and Dice pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Rolls in a Row II",
    "topic": "probability",
    "urlEnding": "rolls-in-a-row-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "Qkrl6LJfUCDG7sd2ILaF",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Rolls in a Row II",
    "topic": "probability",
    "urlEnding": "rolls-in-a-row-ii"
  }
}
```
