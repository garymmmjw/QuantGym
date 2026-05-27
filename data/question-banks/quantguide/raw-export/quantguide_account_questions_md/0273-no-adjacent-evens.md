# QuantGuide Question

## 273. No Adjacent Evens

**Metadata**

- ID: `boNFLm2w87xIPlT05NYg`
- URL: https://www.quantguide.io/questions/no-adjacent-evens
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: jhu math comp
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-6 16:00:35 America/New_York
- Last Edited By: Gabe

### 题干

How many permutations of $\{1,2,\dots,7\}$ have no adjacent even digits?

### Hint

There are $4! \cdot 3! = 144$ ways to arrange around the digits on the blanks once we select the locations of where the even and odd integers are located.

### 解答

There are $4! \cdot 3! = 144$ ways to arrange around the digits on the blanks once we select the locations of where the even and odd integers are located. Therefore, we need to count the number of ways to arrange the even and odd integers. In particular, we can count directly how many spot options there are for the even integers. These are $$135, 136, 137, 146, 147, 157, 246, 247, 257, 357$$ Therefore, there are $10$ ways we can select the spots, so there are $144 \cdot 10 = 1440$ total ways to arrange the integers on the blanks.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1440"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "boNFLm2w87xIPlT05NYg",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-6 16:00:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2106508,
    "source": "jhu math comp",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "No Adjacent Evens",
    "topic": "probability",
    "urlEnding": "no-adjacent-evens",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "boNFLm2w87xIPlT05NYg",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "No Adjacent Evens",
    "topic": "probability",
    "urlEnding": "no-adjacent-evens"
  }
}
```
