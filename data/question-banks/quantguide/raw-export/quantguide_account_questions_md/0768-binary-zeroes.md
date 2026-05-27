# QuantGuide Question

## 768. Binary Zeroes

**Metadata**

- ID: `pQNWdQbYm7cGDV33NKyJ`
- URL: https://www.quantguide.io/questions/binary-zeroes
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Virtu Financial, Five Rings
- Source: og
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-5 09:55:36 America/New_York
- Last Edited By: Gabe

### 题干

In the binary expansion of $142!$, how many trailing zeroes are there?

### Hint

The number of trailing zeroes is the highest power of $2$ dividing $142!$.

### 解答

In base $10$, we know that the number of trailing zeros for $n$ is the highest power of $10$ that divides $n$. Similarly, in binary, we want the highest power of $2$ dividing $142!$. We get $71$ powers of $2$ from all the even terms. Then, there are $\text{floor}\left(\dfrac{142}{2^2}\right) = 35$ additional powers of $2$ coming from terms divisible by $4$. We keep doing this to obtain that there are $$\displaystyle \sum_{k=1}^{\infty} \text{floor}\left(\frac{n}{2^k}\right)$$ trailing zeroes in binary for $n!$. Note that this sum is finite since eventually $2^k > n$, so the floor will become $0$. With $n = 142$, we get $$\sum_{k=1}^{\infty} \text{floor}\left(\dfrac{142}{2^k}\right) = 71 + 35 + 17 + 8 + 4 + 2 + 1 = 138$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "138"
    ],
    "companies": [
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "pQNWdQbYm7cGDV33NKyJ",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 09:55:36 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6272120,
    "source": "og",
    "status": "published",
    "tags": [],
    "title": "Binary Zeroes",
    "topic": "brainteasers",
    "urlEnding": "binary-zeroes",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "pQNWdQbYm7cGDV33NKyJ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Binary Zeroes",
    "topic": "brainteasers",
    "urlEnding": "binary-zeroes"
  }
}
```
