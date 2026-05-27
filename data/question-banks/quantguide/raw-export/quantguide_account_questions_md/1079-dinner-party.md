# QuantGuide Question

## 1079. Dinner Party

**Metadata**

- ID: `B1IYNo1JvE36M8cuhMBa`
- URL: https://www.quantguide.io/questions/dinner-party
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 11:53:15 America/New_York
- Last Edited By: Gabe

### 题干

At a dinner party, everyone shakes hands with everyone else exactly once. How many people are at the party if there are exactly 120 handshakes?

### Hint

Let $N$ be the number of people at the party. How many people does the first person shake hands with? How many additional people does the second person shake hands with? What is the pattern?

### 解答

Let $N$ be the number of people at the party. The first person will shake $N-1$ hands since he does not shake hands with himself. The second person will shake hands with $N-2$ more hands since he does not shake hands with himself and already shook hands with the first person. This pattern continues. We can employ the Gaussian sum to define the total number of handshakes that occur as a function of $N$: 
$$(N-1) + (N-2) + \ldots + 1 = \frac{N\times (N-1)}{2} = 120$$

Solving for $N$, we find that the total number of people at the party is $16$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "16"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "B1IYNo1JvE36M8cuhMBa",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 11:53:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8801393,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Dinner Party",
    "topic": "brainteasers",
    "urlEnding": "dinner-party"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "B1IYNo1JvE36M8cuhMBa",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Dinner Party",
    "topic": "brainteasers",
    "urlEnding": "dinner-party"
  }
}
```
