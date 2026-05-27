# QuantGuide Question

## 106. Stone Ripple

**Metadata**

- ID: `aIJidfXDo7dkvt7so7sq`
- URL: https://www.quantguide.io/questions/stone-ripple
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 1
- Companies: TransMarket Group, Goldman Sachs, SIG
- Source: https://faculty.math.illinois.edu/~lfolwa2/GW_101217_Sol.pdf
- Tags: Calculus
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-8 09:56:13 America/New_York
- Last Edited By: Gabe

### 题干

A stone is thrown into a pond and sends out a circular ripple whose radius increases at a rate of $2$ feet per second. After $10$ seconds, how fast is the area of the ripple increasing (in square feet per second)? The answer is in the form $k\pi$ for an integer $k$. Find $k$.

### Hint

We know that $A(r) = \pi r^2$ as a function of $r$ and that $r' = 2$. After $10$ seconds, the radius of the circle is $2 \cdot 10 = 20$ feet.

### 解答

We know that $A(r) = \pi r^2$ as a function of $r$ and that $r' = 2$. After $10$ seconds, the radius of the circle is $2 \cdot 10 = 20$ feet. Lastly, we find that $A' = 2\pi r r'$, so plugging in our values, we get that the rate of increase is $2 \pi (20) (2) = 80 \pi$. Therefore, $k = 80$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "80"
    ],
    "companies": [
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "aIJidfXDo7dkvt7so7sq",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:56:13 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 759664,
    "source": "https://faculty.math.illinois.edu/~lfolwa2/GW_101217_Sol.pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Stone Ripple",
    "topic": "pure math",
    "urlEnding": "stone-ripple",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "aIJidfXDo7dkvt7so7sq",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Stone Ripple",
    "topic": "pure math",
    "urlEnding": "stone-ripple"
  }
}
```
