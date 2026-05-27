# QuantGuide Question

## 939. Grid Filling II

**Metadata**

- ID: `Hvo5T18nYyrXqYv5CjsK`
- URL: https://www.quantguide.io/questions/grid-filling-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Optiver
- Source: test
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 8
- Last Edited: 2023-9-16 17:55:41 America/New_York
- Last Edited By: Gabe

### 题干

The integers 1 through 9 are randomly placed into the 9 squares of a 3 x 3 grid such that each square has one integer and each integer is used once. What is the probability that the sum of each row and each column is odd?

### Hint

What causes a sum of three numbers to be odd? How does this affect the composition of the 3 x 3 grid? Drawing out examples may help you find a pattern.

### 解答

There are 5 odd and 4 even numbers, and for three numbers to sum to an odd number, either one or three of the numbers must be odd. Thus, one column must be all odd, and similarly one row must be all odd. Hence, the number of valid possibilities without regard to the ordering of the odd and even numbers is the number of row-column pairings, or $3 \times 3 = 9$. The number of total combinations we could choose such that $5$ of the $9$ squares will contain an odd number is ${9 \choose 5}$. The probability that the sum of each row and each column is odd is:

$$\frac{9}{{9 \choose 5}} = \frac{1}{14}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/14"
    ],
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "Hvo5T18nYyrXqYv5CjsK",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-16 17:55:41 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7690260,
    "source": "test",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Grid Filling II",
    "topic": "probability",
    "urlEnding": "grid-filling-ii",
    "version": 8
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "id": "Hvo5T18nYyrXqYv5CjsK",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Grid Filling II",
    "topic": "probability",
    "urlEnding": "grid-filling-ii"
  }
}
```
