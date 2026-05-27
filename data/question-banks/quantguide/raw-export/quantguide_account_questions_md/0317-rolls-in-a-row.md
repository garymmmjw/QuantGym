# QuantGuide Question

## 317. Rolls in a Row

**Metadata**

- ID: `ugOOoRxsdSJZSk3QTmKz`
- URL: https://www.quantguide.io/questions/rolls-in-a-row
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG
- Source: Kaushik - SIG and Dice pdf
- Tags: Expected Value, Conditional Expectation
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 17:18:50 America/New_York
- Last Edited By: Gabe

### 题干

On average, how many rolls of a fair $6$-sided die must be rolled on average to get two $6$s in a row?


### Hint

Think about the different states up to getting two $6$s in a row.

### 解答

We can use Markov Chains for this problem. Let $E_{0}$ be the expectation state of having no $6$s in a row. Let $E_{1}$ be the expectation state of having one $6$ in a row (so $6$ is the most recent roll). Finally, let $E_{2}$ be the expectation state of having two $6$s in a row (our goal). Then our equations become:
$$
E_{0} = \frac{1}{6}(E_{1}+1)+\frac{5}{6}(E_{0}+1) = \frac{1}{6}E_{1}+\frac{5}{6}E_{0}+1
$$
$$
E_{1} = \frac{1}{6}(E_{2}+1)+\frac{5}{6}(E_{0}+1) = \frac{1}{6}E_{2}+\frac{5}{6}E_{0}+1
$$
$$
E_{2} = 0
$$
Solving these equations, we get $E_{0} = 42$. Thus it takes $42$ rolls on average to get two $6$s in a row.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "42"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "ugOOoRxsdSJZSk3QTmKz",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 17:18:50 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2457724,
    "source": "Kaushik - SIG and Dice pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Rolls in a Row",
    "topic": "probability",
    "urlEnding": "rolls-in-a-row"
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "ugOOoRxsdSJZSk3QTmKz",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Rolls in a Row",
    "topic": "probability",
    "urlEnding": "rolls-in-a-row"
  }
}
```
