# QuantGuide Question

## 625. Pizza Passcode

**Metadata**

- ID: `LHzf6xKslcciC3THviW3`
- URL: https://www.quantguide.io/questions/pizza-passcode
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: og
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-28 16:46:37 America/New_York
- Last Edited By: Gabe

### 题干

Pizza Hut gives new users a $7-$digit code when they sign up. There are no restrictions on how many times a digit can be used, and digits are allowed to start with $0$. How many such codes are non-decreasing? In other words, each digit in the passcode is at least as large as the last. $1122345$ and $9999999$ are such examples, whereas $2345657$ is not.

### Hint

Let $x_i$ be the number of times that digit $i$, $0 \leq i \leq 9$, appears in the code. What can you say about their sum?

### 解答

Let $x_i$ be the number of times that digit $i$, $0 \leq i \leq 9$, appears in the code. Then $x_0 + x_1 + \dots + x_9 = 7$ and each $x_i \geq 0$ is an integer. Furthermore, each non-negative integer solution to this equation yields a unique code. The first one in the question corresponds to $x_1 = x_2 = 2$, $x_3 = x_4 = x_5 = 1$. Therefore, we just need to count the number of non-negative integer solutions to this, which is just $$\displaystyle \binom{10+7-1}{10-1} = \binom{16}{9} = 11440$$ by stars and bars.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "11440"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "LHzf6xKslcciC3THviW3",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-28 16:46:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4938622,
    "randomizable": "",
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Pizza Passcode",
    "topic": "probability",
    "urlEnding": "pizza-passcode",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "LHzf6xKslcciC3THviW3",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Pizza Passcode",
    "topic": "probability",
    "urlEnding": "pizza-passcode"
  }
}
```
