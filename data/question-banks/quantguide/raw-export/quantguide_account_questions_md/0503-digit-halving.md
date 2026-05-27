# QuantGuide Question

## 503. Digit Halving

**Metadata**

- ID: `j4Ous3DH3xyTTjF6kNKz`
- URL: https://www.quantguide.io/questions/digit-halving
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Which two digit integer has the unique property that the product of its digits is equal to half of the integer?

### Hint

Let $x=\text{a}\text{b}$ be the integer. Then $x = 10a + b$. In addition, you know that $ab = \dfrac{x}{2}$.

### 解答

Let $x=\text{a}\text{b}$ be our integer. Then $x = 10a + b$. In addition, we know that $ab = \dfrac{x}{2}$ by our property, so $ab = \dfrac{10a + b}{2}$. Solving for $b$, $2ab = 10a + b$, which means that $b(2a-1) = 10a$, so $b = \dfrac{10a}{2a-1} = 5 + \dfrac{5}{2a-1}$. We know that $b$ is an integer, so this implies $\dfrac{5}{2a-1}$ is an integer. The only divisors of $5$ are $1$ and $5$, so $2a-1$ is either $1$ or $5$. If it is $1$, then this implies $b = 10$, which is impossible as $b$ must be a singular digit. Therefore, $2a-1 = 5$, so $a = 3$. Plugging this in, $b = 6$. Therefore, the integer is $36$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "36"
    ],
    "difficulty": "easy",
    "id": "j4Ous3DH3xyTTjF6kNKz",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 4014931,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Digit Halving",
    "topic": "brainteasers",
    "urlEnding": "digit-halving"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "j4Ous3DH3xyTTjF6kNKz",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Digit Halving",
    "topic": "brainteasers",
    "urlEnding": "digit-halving"
  }
}
```
