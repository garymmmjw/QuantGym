# QuantGuide Question

## 98. Questionable Values

**Metadata**

- ID: `3URjaUt3FVG5SXVkq7Sm`
- URL: https://www.quantguide.io/questions/questionable-values
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: GSA Capital
- Source: tqd
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-17 19:55:36 America/New_York
- Last Edited By: Gabe

### 题干

Sean is creating questions for QuantGuide. Each easy question is worth $\$3$, while each medium question is worth $\$6$. He has a question storage saved up of easy and medium questions. If Sean picks a question at random, the probability it is a medium is $1/4$. The total value of Sean's question bank is a perfect square. What is the smallest possible value of his question bank (in dollars)?

### Hint

There must be exact three times as many easy questions as medium so that the probability of a medium is $1/4$.

### 解答

There must be exact three times as many easy questions as medium so that the probability of a medium is $1/4$. Thus, we can group the questions up into groups of $3$ easy and $1$ medium question, which sum to $\$15$. We need to find the minimum number of groups, say $n$, such that $15n$ is a perfect square. This would occur for the first time exactly when $n = 15$, so his question bank is worth $15^2 = 225$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "225"
    ],
    "companies": [
      {
        "company": "GSA Capital"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "3URjaUt3FVG5SXVkq7Sm",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 19:55:36 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 716753,
    "source": "tqd",
    "status": "published",
    "tags": [],
    "title": "Questionable Values",
    "topic": "brainteasers",
    "urlEnding": "questionable-values",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "GSA Capital"
      }
    ],
    "difficulty": "easy",
    "id": "3URjaUt3FVG5SXVkq7Sm",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Questionable Values",
    "topic": "brainteasers",
    "urlEnding": "questionable-values"
  }
}
```
