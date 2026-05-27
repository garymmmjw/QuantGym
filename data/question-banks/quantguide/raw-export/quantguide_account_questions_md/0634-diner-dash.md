# QuantGuide Question

## 634. Diner Dash

**Metadata**

- ID: `ZDk7VVkKbtnQKT2hTzwF`
- URL: https://www.quantguide.io/questions/diner-dash
- Topic: probability
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Four friends agree to get lunch together at Jimmy's Diner. However, Jimmy's Diner is a chain with five locations. Suppose each friend goes to one of the locations at random. Compute the probability that they all end up at different locations.

### Hint

How many diner options does the first friend have? The second friend?

### 解答

There are $5^4$ ways for the friends to choose their diner locations. For the numerator, there are 5 ways for the first friend to choose a location, 4 ways for the second friend, 3 for the third, and 2 for the fourth, for a total of $120$ ways. Our answer is $\frac{120}{5^4} = \frac{24}{125}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "24/125"
    ],
    "difficulty": "easy",
    "id": "ZDk7VVkKbtnQKT2hTzwF",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 5037306,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Diner Dash",
    "topic": "probability",
    "urlEnding": "diner-dash"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "ZDk7VVkKbtnQKT2hTzwF",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Diner Dash",
    "topic": "probability",
    "urlEnding": "diner-dash"
  }
}
```
