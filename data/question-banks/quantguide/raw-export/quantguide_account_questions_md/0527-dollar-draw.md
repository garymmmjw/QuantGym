# QuantGuide Question

## 527. Dollar Draw

**Metadata**

- ID: `lR5JF3tBQIRBRUuDUiEr`
- URL: https://www.quantguide.io/questions/dollar-draw
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG
- Source: sig
- Tags: Expected Value, Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-28 09:31:00 America/New_York
- Last Edited By: Gabe

### 题干

A bin consists of $4$ $\$10$ bills, $3$ $\$20$ bills, and $1$ $\$100$ bill. You select $7$ bills out of this bin uniformly at random without replacement. Find the expected value of the sum of all the bills you select.

### Hint

The average value of each bill selected is $\dfrac{100 + 3 \cdot 20 + 4 \cdot 10}{8} = 25$.

### 解答

The average value of each bill selected is $\dfrac{100 + 3 \cdot 20 + 4 \cdot 10}{8} = 25$. Since draws are exchangeable, the expected payout of each draw is the exact same, so the expected total of the bills we select is $25 \cdot 7 = 175$.

$$$$

Alternatively, we can compute this by considering the bill we don't select, and then subtract this result from $200$. With probability $\dfrac{1}{2}$, we leave a $\$10$ bill. With probability $\dfrac{3}{8}$, we leave a $\$20$ bill. With probability $\dfrac{1}{8}$, we leave the $\$100$ bill. Therefore, the expected value of the bill we leave is $\dfrac{1}{2} \cdot 10 + \dfrac{3}{8} \cdot 20 + \dfrac{1}{8} \cdot 100 = 25$. This means the expected sum of the bill we do select is $200 - 25=  175$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "175"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "lR5JF3tBQIRBRUuDUiEr",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-28 09:31:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4207221,
    "source": "sig",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Dollar Draw",
    "topic": "probability",
    "urlEnding": "dollar-draw",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "lR5JF3tBQIRBRUuDUiEr",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Dollar Draw",
    "topic": "probability",
    "urlEnding": "dollar-draw"
  }
}
```
