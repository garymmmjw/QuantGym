# QuantGuide Question

## 614. Paired Values II

**Metadata**

- ID: `z4JiK2VRWFnoVpyHy7zX`
- URL: https://www.quantguide.io/questions/paired-values-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: gabe
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-7 14:30:51 America/New_York
- Last Edited By: Gabe

### 题干

Suppose we have the values $1-6$ in a bowl. We draw them without replacement, noting the order in which we selected them. We multiply the first two values together, the next two values together, and the last two values together. Lastly, we add the three products above. How many unique sums are possible?

### Hint

Each distinct pairing of the $6$ integers creates a unique sum. There are $6!$ ways to permute the digits to the $6$ spots. 

### 解答

We don't prove this here, but each distinct pairing of the $6$ integers creates a unique sum. There are $6!$ ways to permute the digits to the $6$ spots. However, the first two, second two, and last two can be exchanged within each block to give the same sum, as order of multiplication doesn't matter, so we divide by $2^3 = 8$. As well, we can change around the order of the blocks and get the same sum, so there are $3!$ ways to arrange the blocks. Thus, the answer is $\dfrac{6!}{3!2^3} = 15$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "15"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "z4JiK2VRWFnoVpyHy7zX",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-7 14:30:51 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4870451,
    "source": "gabe",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Paired Values II",
    "topic": "probability",
    "urlEnding": "paired-values-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "z4JiK2VRWFnoVpyHy7zX",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Paired Values II",
    "topic": "probability",
    "urlEnding": "paired-values-ii"
  }
}
```
