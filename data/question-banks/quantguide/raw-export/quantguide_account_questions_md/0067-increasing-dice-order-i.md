# QuantGuide Question

## 67. Increasing Dice Order I

**Metadata**

- ID: `ae03zqgZBzXS678pzL5V`
- URL: https://www.quantguide.io/questions/increasing-dice-order-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: IMC
- Source: N/A
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 00:29:59 America/New_York
- Last Edited By: Gabe

### 题干

You throw three fair dice one by one. What is the probability that you obtain three numbers in strictly increasing order?

### Hint

How can you use conditional probability to solve this problem?

### 解答

We can use conditional probability to solve this problem. \newline $P(\textrm{3 strictly increasing numbers}) = P(\textrm{3 different numbers}) \times P(\textrm{increasing order} \vert\textrm{3 different numbers}).$ The first term is simply $\frac{6}{6} \times \frac{5}{6} \times \frac{4}{6}$ from drawing without replacement. The second term is $\frac{1}{3!} = \frac{1}{6}$, since there is only one way of permuting three distinct numbers to be strictly increasing. Hence we find the answer to be $\frac{6}{6} \times \frac{5}{6} \times \frac{4}{6} \times \frac{1}{6} = \frac{5}{54}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/54"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ae03zqgZBzXS678pzL5V",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:29:59 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 469927,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Increasing Dice Order I",
    "topic": "probability",
    "urlEnding": "increasing-dice-order-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "medium",
    "id": "ae03zqgZBzXS678pzL5V",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Increasing Dice Order I",
    "topic": "probability",
    "urlEnding": "increasing-dice-order-i"
  }
}
```
