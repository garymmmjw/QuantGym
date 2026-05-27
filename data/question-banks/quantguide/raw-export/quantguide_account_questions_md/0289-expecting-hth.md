# QuantGuide Question

## 289. Expecting HTH

**Metadata**

- ID: `SEGBMNZUmn0y2nhTnupb`
- URL: https://www.quantguide.io/questions/expecting-hth
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Conditional Expectation, Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:56:59 America/New_York
- Last Edited By: Gabe

### 题干

On average, how many tosses of a fair coin does it take to see HTH?

### Hint

How can you solve this recursively using the Law of Total Expectation?

### 解答

Let $x$ be the expected value of the number of tosses to see HTH at the start of the game. There is a $\frac{1}{2}$ probability the toss is a $T$ and you start over with a new expected value of $x+1$. There is a $\frac{1}{4}$ probability you get HH and then start over with a new expected value of $x$. There is a $\frac{1}{8}$ probability you get an HTT and then start over with a new expected value of $x+3$. There is a $\frac{1}{8}$ probability that you get HTH and end the game. Thus:

$$x = \frac{1}{2}(x+1) + \frac{1}{4}(x) + \frac{1}{8}(x+3) + \frac{1}{8}(3)$$

Solving for $x$, we find that $x=10$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "SEGBMNZUmn0y2nhTnupb",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:56:59 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2225363,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Expecting HTH",
    "topic": "probability",
    "urlEnding": "expecting-hth"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "SEGBMNZUmn0y2nhTnupb",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Expecting HTH",
    "topic": "probability",
    "urlEnding": "expecting-hth"
  }
}
```
