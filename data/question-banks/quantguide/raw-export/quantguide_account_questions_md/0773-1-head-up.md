# QuantGuide Question

## 773. 1 Head Up

**Metadata**

- ID: `wLjj0Ay7hFI8xEVs3CxK`
- URL: https://www.quantguide.io/questions/1-head-up
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Akuna
- Source: akuna gd
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-5 10:16:44 America/New_York
- Last Edited By: Gabe

### 题干

$$3$ fair coins are flipped, and you are told that at least one of the coins showed heads. Find the probability exactly one coin showed heads.

### Hint

Of the $2^3 = 8$ possible outcomes, all but $TTT$ have at least one head. How many have exactly one head?

### 解答

Of the $2^3 = 8$ possible outcomes, all but $TTT$ have at least one head, so our sample space consists of $2^3 - 1 = 7$ equally-likely outcomes. Of these outcomes, $3$ of them have exactly one head. Namely, these are $HTT, THT,$ and $TTH$. Therefore, our probability is $\dfrac{3}{7}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/7"
    ],
    "companies": [
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "wLjj0Ay7hFI8xEVs3CxK",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:16:44 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6301324,
    "source": "akuna gd",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "1 Head Up",
    "topic": "probability",
    "urlEnding": "1-head-up",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "easy",
    "id": "wLjj0Ay7hFI8xEVs3CxK",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "1 Head Up",
    "topic": "probability",
    "urlEnding": "1-head-up"
  }
}
```
