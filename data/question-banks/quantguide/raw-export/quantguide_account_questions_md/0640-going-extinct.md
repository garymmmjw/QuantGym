# QuantGuide Question

## 640. Going Extinct

**Metadata**

- ID: `W0JADsQ5kwywpHp67pDy`
- URL: https://www.quantguide.io/questions/going-extinct
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:29:29 America/New_York
- Last Edited By: Gabe

### 题干

An endangered species currently has a population size of $10000$. Every year, the species has a $90\%$ chance of doubling in size and a $10\%$ chance of going extinct. At this rate, what is the expected number of years before extinction?

### Hint

The number of years before extinction follows a geometric distribution. What is the parameter of this distribution and what is its expected value?

### 解答

The number of years before extinction follows a geometric distribution where $p=0.1$. The expected number of years before extinction is thus $\frac{1}{p}=10$. This can also be solved for analytically. Let $x$ be the expected number of years before extinction. There is a $\frac{1}{10}$ probability that the species will only last one year, and a $\frac{9}{10}$ probability that the species will extend its expected number of years by one. Hence:

$$x = \frac{1}{10}(1) + \frac{9}{10}(x+1) \Rightarrow x=10$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "W0JADsQ5kwywpHp67pDy",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:29:29 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5091376,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Going Extinct",
    "topic": "probability",
    "urlEnding": "going-extinct",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "W0JADsQ5kwywpHp67pDy",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Going Extinct",
    "topic": "probability",
    "urlEnding": "going-extinct"
  }
}
```
