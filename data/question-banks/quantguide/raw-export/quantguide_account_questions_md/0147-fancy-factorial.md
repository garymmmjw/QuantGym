# QuantGuide Question

## 147. Fancy Factorial

**Metadata**

- ID: `as1wodYDwjC5hlvczfSN`
- URL: https://www.quantguide.io/questions/fancy-factorial
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-4 23:18:19 America/New_York
- Last Edited By: Gabe

### 题干

$$\dfrac{10!}{6!} = n!$ for some integer $n$. What is $n$?

### Hint

Intuitively, $1 < n < 10$. Consider simplifying the fraction into $1 \cdot 2 \cdot 3 \cdot ...$ until you cannot get any higher.

### 解答

We know that $1 < n < 10$. This is because if $n = 1$, then this implies $10! = 6!$, which is clearly untrue. In addition, $n < 10$, as $6! > 1$. We can write out $\dfrac{10!}{6!} = \dfrac{10 \cdot 9 \cdot 8 \cdot 7 \cdot 6!}{6!} = 10 \cdot 9 \cdot 8 \cdot 7$. With this, we know that $n \geq 7$, as $7$ can't be reduced into any lower factors and it must be in the factorial of $n$. 

$$$$

Let's write out a factorization of $10 \cdot 9 \cdot 8 \cdot 7$. We can write $10 = 2 \cdot 5$. In addition, $9 \cdot 8 = 72 = 1 \cdot 3 \cdot 4 \cdot 6$. Therefore, $10 \cdot 9 \cdot 8 \cdot 7 = 7 \cdot 6 \cdot 5 \cdot 4 \cdot 3 \cdot 2 \cdot 1 = 7!$, so $n = 7$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "as1wodYDwjC5hlvczfSN",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:18:19 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1098288,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Fancy Factorial",
    "topic": "brainteasers",
    "urlEnding": "fancy-factorial",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "as1wodYDwjC5hlvczfSN",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Fancy Factorial",
    "topic": "brainteasers",
    "urlEnding": "fancy-factorial"
  }
}
```
