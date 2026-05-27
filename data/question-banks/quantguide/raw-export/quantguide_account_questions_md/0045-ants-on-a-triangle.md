# QuantGuide Question

## 45. Ants on a Triangle

**Metadata**

- ID: `18v0UEN2F2m163V2lpRU`
- URL: https://www.quantguide.io/questions/ants-on-a-triangle
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Kaushik - Glassdoor (No specific company)
- Tags: Events
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-26 23:00:43 America/New_York
- Last Edited By: Aaron

### 题干

There are three ants each on their own side of an equilateral triangle. Each picks one adjacent vertex to move to with equal probability. What is the probability that no two ants will intersect at a corner?

### Hint

Will the ants ever meet if they travel in the same direction?

### 解答

In order for the ants to not meet at any corner, all three ants have to travel in the same direction (either clockwise or counter-clockwise). The probability they all travel clockwise is $(\frac{1}{2})^3=\frac{1}{8}$. The probability they all travel counter-clockwise is also $(\frac{1}{2})^3=\frac{1}{8}$. Thus, the probability the ants are on their unique corners is $\frac{1}{8}+\frac{1}{8}=\frac{1}{4}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/4",
      "0.25"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "18v0UEN2F2m163V2lpRU",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-26 23:00:43 America/New_York",
    "lastEditedBy": "Aaron",
    "orderId": 330982,
    "source": "Kaushik - Glassdoor (No specific company)",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Ants on a Triangle",
    "topic": "probability",
    "urlEnding": "ants-on-a-triangle",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "18v0UEN2F2m163V2lpRU",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Ants on a Triangle",
    "topic": "probability",
    "urlEnding": "ants-on-a-triangle"
  }
}
```
