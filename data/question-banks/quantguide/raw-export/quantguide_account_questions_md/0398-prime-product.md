# QuantGuide Question

## 398. Prime Product

**Metadata**

- ID: `LKmO5PwG6BOan3SMZOc3`
- URL: https://www.quantguide.io/questions/prime-product
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Belvedere Trading
- Source: belv
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-27 09:33:58 America/New_York
- Last Edited By: Gabe

### 题干

$$3$ integers are in the form $a,a+k,$ and $a+2k$ for some integers $a$ and $k$. The product of these three integers is prime. Find $a^2 + k^2$. Note that prime integers are positive by definition.

### Hint

For the product of the three integers to be prime, what must $2$ of the integers be?

### 解答

For the product of the three integers to be prime, we note that two of the integers must be $-1$ and $1$. Otherwise, we would end up with two factors that are not one multiplied together, and this is no longer a prime number. The difference between these integers is $2$. We should have $-3$ as our last integer, as we want the product to be positive. We can now verify that $-3 \cdot -1 \cdot 1 = 3$, which is prime. The above tells us $a = -3$ and $k = 2$, so our answer is $9 + 4 = 13$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "13"
    ],
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "LKmO5PwG6BOan3SMZOc3",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-27 09:33:58 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3107682,
    "source": "belv",
    "status": "published",
    "tags": [],
    "title": "Prime Product",
    "topic": "brainteasers",
    "urlEnding": "prime-product",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "id": "LKmO5PwG6BOan3SMZOc3",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Prime Product",
    "topic": "brainteasers",
    "urlEnding": "prime-product"
  }
}
```
