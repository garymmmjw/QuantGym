# QuantGuide Question

## 249. In Order

**Metadata**

- ID: `cdGfg00M6h1XLCkfPeGn`
- URL: https://www.quantguide.io/questions/in-order
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables, Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:14:21 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $X_1,X_2,X_3,X_4 \sim \text{Unif}(0,1)$ IID and let $O_1,O_2,O_3,$ and $O_4$ be the order statistics corresponding to these random variables. Find $\mathbb{E}[O_3 \mid O_4 = 0.9, O_1 = 0.3]$.

### Hint

How should the uniform random variables partition the interval on average? What does the information in the expectation tell you about our new interval?

### 解答

We know that $O_1 = 0.3$ and $O_4 = 0.9$. This means that the remaining two order statistics, as we are looking at IID Unif$(0,1)$ random variables, should partition the interval $(0.3,0.9)$ into 3 equal length parts. As the length of this interval is $0.6$, the length of each of the parts should be $0.2$ on average. Therefore, as the third order statistic would have 2 of these pieces before it, $\mathbb{E}[O_3 \mid O_4 = 0.9, O_1 = 0.3] = 0.3 + 2 \cdot 0.2 = 0.7$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.7"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "cdGfg00M6h1XLCkfPeGn",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:14:21 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1971957,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "In Order",
    "topic": "statistics",
    "urlEnding": "in-order"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "cdGfg00M6h1XLCkfPeGn",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "In Order",
    "topic": "statistics",
    "urlEnding": "in-order"
  }
}
```
