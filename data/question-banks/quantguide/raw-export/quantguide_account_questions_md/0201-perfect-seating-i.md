# QuantGuide Question

## 201. Perfect Seating I

**Metadata**

- ID: `imW5lAsoXv2RQJEF4FRJ`
- URL: https://www.quantguide.io/questions/perfect-seating-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Jane Street, Optiver, WorldQuant
- Source: N/A
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 22:05:34 America/New_York
- Last Edited By: Gabe

### 题干

Seven people with distinct ages randomly sit down at a circular table with seven seats. What is the probability that the people sit themselves in increasing order of age, irrespective of direction?

### Hint

If you start from the youngest person, how many arrangements of the other $6$ people at the circular table are increasing?

### 解答

Seat the youngest person at the table in any spot. There are $6!$ ways to arrange the remaining $6$ people that have not been seated at the table. Of those arrangements, exactly $2$ of them are in increasing order of age. Namely, these occur when they are increasing in age clockwise or counter-clockwise. Therefore, $2$ of these $6!$ equally likely permutations are in increasing order of age, so our result is $\dfrac{2}{6!} = \dfrac{1}{360}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/360"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "imW5lAsoXv2RQJEF4FRJ",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 22:05:34 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1524567,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Perfect Seating I",
    "topic": "probability",
    "urlEnding": "perfect-seating-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "id": "imW5lAsoXv2RQJEF4FRJ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Perfect Seating I",
    "topic": "probability",
    "urlEnding": "perfect-seating-i"
  }
}
```
