# QuantGuide Question

## 1155. Origin In Between

**Metadata**

- ID: `lpi0tuWoeLjaYNngQLtl`
- URL: https://www.quantguide.io/questions/origin-in-between
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Mathcounts
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Two points are uniformly at random selected between $-1$ and $2$. What is the probability that the origin lies between those two points? 

### Hint

Two points are randomly selected between $-1$ and $2$. What is the probability that the origin lies between those two points? 

### 解答

There are two possible ways for the origin not to be between the two randomly selected points: (1) both points fall within $(-1, 0)$, or (2) both points fall within $(0, 2)$. Case 1 occurs with probability $\frac{1}{3} \cdot \frac{1}{3} = \frac{1}{9}$, while case 2 occurs with probability $\frac{2}{3} \cdot \frac{2}{3} = \frac{4}{9}$. Hence, we know that the probability of the origin not falling between the two randomly selected points is $\frac{1}{9} + \frac{4}{9} = \frac{5}{9}$. Taking the complement, our answer is $\frac{4}{9}$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4/9"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "lpi0tuWoeLjaYNngQLtl",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9560338,
    "source": "Mathcounts",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Origin In Between",
    "topic": "probability",
    "urlEnding": "origin-in-between"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "lpi0tuWoeLjaYNngQLtl",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Origin In Between",
    "topic": "probability",
    "urlEnding": "origin-in-between"
  }
}
```
