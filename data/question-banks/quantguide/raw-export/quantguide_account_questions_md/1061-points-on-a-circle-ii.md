# QuantGuide Question

## 1061. Points on a Circle II

**Metadata**

- ID: `KktHYIsr4kO4E4N6LpAW`
- URL: https://www.quantguide.io/questions/points-on-a-circle-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel, SIG, Aquatic Capital, Squarepoint Capital, Jane Street, Akuna, DE Shaw
- Source: N/A
- Tags: Events
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-7 13:04:44 America/New_York
- Last Edited By: Gabe

### 题干

$$n$ points are selected randomly at uniform around a circle. What is the probability that all $n$ points are on the same semicircle for $n = 100$? The answer is in the form $$\dfrac{a}{b^c}$$ for integers $a,b,c > 0$ with $b$ minimal. Find $a + b + c$.

### Hint

Suppose we already have the $n$ points selected on the circle. Choose one of those points, let's call it $A$. We draw a line through $A$ and $O$, the center of the circle; this diameter forms two semicircles. To prevent overcounting, only consider the semicircle that start from $A$ in the counterclockwise direction.

### 解答

Suppose we already have the $n$ points selected on the circle. Choose one of those points, let's call it $A$. We draw a line through $A$ and $O$, the center of the circle; this diameter forms two semicircles. To prevent overcounting, we will only consider the semicircle that start from $A$ in the counterclockwise direction. Then, each of the $n-1$ remaining points has a $\frac{1}{2}$ chance of being within that semicircle. Repeating this for all $n$ points, we find that the solution is simply $\frac{n}{2^{n-1}}$. Plugging in $n = 100$, we find our answer to be $\frac{100}{2^{99}}$. Therefore, the answer to our question is $100 + 2 + 99 = 201$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "201"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Aquatic Capital"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "KktHYIsr4kO4E4N6LpAW",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:04:44 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8625141,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Points on a Circle II",
    "topic": "probability",
    "urlEnding": "points-on-a-circle-ii",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Aquatic Capital"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "medium",
    "id": "KktHYIsr4kO4E4N6LpAW",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Points on a Circle II",
    "topic": "probability",
    "urlEnding": "points-on-a-circle-ii"
  }
}
```
