# QuantGuide Question

## 203. No Arithmetic

**Metadata**

- ID: `VY5yxUq3kKWqInZw1r3v`
- URL: https://www.quantguide.io/questions/no-arithmetic
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: AIME
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 11:53:33 America/New_York
- Last Edited By: Gabe

### 题干

Consider the following sequence: $3, 4, 5, a, b, 30, 40, 50$. How many different ordered pairs of integers $(a, b)$ satisfy the condition that the sequence is strictly increasing and there does not exist 4 numbers belonging to the sequence that form an arithmetic sequence in any order? 

### Hint

Since the sequence must be strictly increasing, we can assign $a, b$ appropriately after selecting two integers between $6$ and $29$ inclusive. What values should we exclude?

### 解答

Since the sequence must be strictly increasing, we can assign $a, b$ appropriately after selecting two integers between $6$ and $29$ inclusive. We can also exclude 6 and 20, since those values would create an arithmetic sequence of 4 numbers. There are a total of $\binom{29 - 6 + 1 - 2}{2} = 231$ ways to do so. Then, we need to consider other ways of forming arithmetic sequences of 4 numbers. Specifically, $(a, b) \neq (7, 9), (12, 21), (16, 28)$. Our final answer is $228$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "228"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "VY5yxUq3kKWqInZw1r3v",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 11:53:33 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1540662,
    "source": "AIME",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "No Arithmetic",
    "topic": "brainteasers",
    "urlEnding": "no-arithmetic"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "VY5yxUq3kKWqInZw1r3v",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "No Arithmetic",
    "topic": "brainteasers",
    "urlEnding": "no-arithmetic"
  }
}
```
