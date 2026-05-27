# QuantGuide Question

## 1069. Annie's Coin

**Metadata**

- ID: `hyESWbF6mnIXt3iz4Obk`
- URL: https://www.quantguide.io/questions/annies-coin
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Flow Traders
- Source: AMC
- Tags: Events
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:31:48 America/New_York
- Last Edited By: Gabe

### 题干

Annie's coin lands on heads with probability $\frac{1}{3}$. Brittany's coin lands on heads with probability $\frac{2}{5}$. Annie and Brittany take turns tossing coins; Annie goes first. The first person to get a heads wins. What is the probability that Annie wins?

### Hint

Annie has a $\frac{1}{3}$ chance of winning on her first turn. If she doesn't win on her first turn, then she has a $\frac{3}{5}$ chance to survive Brittany's turn and flip again.

### 解答

Annie has a $\frac{1}{3}$ chance of winning on her first turn. If she doesn't win on her first turn, then she has a $\frac{3}{5}$ chance to survive Brittany's turn and flip again. Hence,
\[
\begin{aligned}
    p &= \frac{1}{3} + \frac{2}{3} \cdot \frac{3}{5} \cdot p \\
    p &= \frac{5}{9}
\end{aligned}
\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/9"
    ],
    "companies": [
      {
        "company": "Flow Traders"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "hyESWbF6mnIXt3iz4Obk",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:31:48 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8710340,
    "source": "AMC",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Annie's Coin",
    "topic": "probability",
    "urlEnding": "annies-coin",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Flow Traders"
      }
    ],
    "difficulty": "easy",
    "id": "hyESWbF6mnIXt3iz4Obk",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Annie's Coin",
    "topic": "probability",
    "urlEnding": "annies-coin"
  }
}
```
