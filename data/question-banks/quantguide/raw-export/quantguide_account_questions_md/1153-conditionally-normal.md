# QuantGuide Question

## 1153. Conditionally Normal

**Metadata**

- ID: `C05JW9IH9mX0LL4ZkghC`
- URL: https://www.quantguide.io/questions/conditionally-normal
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Hudson River Trading, Virtu Financial, Akuna
- Source: virtu
- Tags: Conditional Probability, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-5 10:50:09 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $X,Y \sim N(0,1)$ IID. Find $\mathbb{P}[X > 0 \mid X + Y > 0]$.

### Hint

Since $X$ and $Y$ are independent standard normal, exploit the radial symmetry of normal distributions to solve this cleanly.

### 解答

Since $X$ and $Y$ are independent standard normal, we can exploit the radial symmetry of normal distributions to solve this cleanly. The region $\{X+Y > 0\}$ covers up half of the plane i.e. spans a total of $\pi$ radians. This can be easily seen by drawing it out in the plane. Of this region, the region $\{X > 0\}$ is $\dfrac{3\pi}{4}$ radians, also easily seen by picture. Therefore, the conditional probability $X > 0$ is $$\dfrac{3\pi/4}{\pi} = \dfrac{3}{4}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/4"
    ],
    "companies": [
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "C05JW9IH9mX0LL4ZkghC",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:50:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9530400,
    "source": "virtu",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Conditionally Normal",
    "topic": "probability",
    "urlEnding": "conditionally-normal",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "medium",
    "id": "C05JW9IH9mX0LL4ZkghC",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Conditionally Normal",
    "topic": "probability",
    "urlEnding": "conditionally-normal"
  }
}
```
