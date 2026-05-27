# QuantGuide Question

## 769. Base Exponent Square

**Metadata**

- ID: `QqvRwQ5jNT0AT7aZ7Zk6`
- URL: https://www.quantguide.io/questions/base-exponent-square
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: WorldQuant
- Source: Glassdoor WorldQuant
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

How many integers $100 \leq k \leq 400$ are such that $k^k$ is a perfect square?

### Hint

We know that $\sqrt{k^k} = k^{\frac{k}{2}}$ by basic algebra. When is this guaranteed to be an integer?

### 解答

We know that $\sqrt{k^k} = k^{\frac{k}{2}}$ by basic algebra. Therefore, if $k$ is even, $\dfrac{k}{2}$ is an integer, so if $k$ is even, this works. This allows $151$ integers. Furthermore, if $k$ is a perfect square, then $k = n^2$ for some integer $n$, so $\sqrt{k^k} = \sqrt{(n^2)^{n^2}} = \sqrt{n^{2n^2}} = n^{n^2}$, which is an integer. Therefore, odd perfect squares are not accounted for yet, so we can add those in. Namely, these are $11^2, 13^2, 15^2, 17^2,$ and $19^2$. This allows $5$ more possibilities, so our total answer is $151 +5 = 156$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "156"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "id": "QqvRwQ5jNT0AT7aZ7Zk6",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6273999,
    "source": "Glassdoor WorldQuant",
    "status": "published",
    "tags": [],
    "title": "Base Exponent Square",
    "topic": "brainteasers",
    "urlEnding": "base-exponent-square"
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "id": "QqvRwQ5jNT0AT7aZ7Zk6",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Base Exponent Square",
    "topic": "brainteasers",
    "urlEnding": "base-exponent-square"
  }
}
```
