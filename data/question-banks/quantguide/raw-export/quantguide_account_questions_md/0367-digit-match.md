# QuantGuide Question

## 367. Digit Match

**Metadata**

- ID: `msvQzx4cTGv2QhPQRhnO`
- URL: https://www.quantguide.io/questions/digit-match
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: MAO edited
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:32:29 America/New_York
- Last Edited By: Gabe

### 题干

Let $X$ be a uniformly at random selected integer from the collection of all $11-$digit integers. Find the expected amount of digits of $X$ that are equal to $8$.

### Hint

Label the digits $1-11$, with digit $1$ being the leftmost digit. Let $X_i$ be the indicator of the event that the $i$th digit is an $8$. Then $$T = X_1 + \dots + X_{11}$$ gives the total number of digits that are $8$.

### 解答

Label the digits $1-11$, with digit $1$ being the leftmost digit. Let $X_i$ be the indicator of the event that the $i$th digit is an $8$. Then $$T = X_1 + \dots + X_{11}$$ gives the total number of digits that are $8$. By linearity, we have that $\mathbb{E}[T] = \mathbb{E}[X_1] + \dots + \mathbb{E}[X_{11}]$. Since our digit is uniformly at random selected, we have $9$ equally-likely options for the first digit and $10$ equally-likely options for the remaining $10$ digits. Therefore, $\mathbb{E}[X_1] = \dfrac{1}{9}$ and $\mathbb{E}[X_k] = \dfrac{1}{10}$ for $2 \leq k \leq 11$. Therefore, $\mathbb{E}[T] = \dfrac{1}{10} \cdot 10 + \dfrac{1}{9} = \dfrac{10}{9}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10/9"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "msvQzx4cTGv2QhPQRhnO",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:32:29 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2844786,
    "source": "MAO edited",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Digit Match",
    "topic": "probability",
    "urlEnding": "digit-match",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "msvQzx4cTGv2QhPQRhnO",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Digit Match",
    "topic": "probability",
    "urlEnding": "digit-match"
  }
}
```
