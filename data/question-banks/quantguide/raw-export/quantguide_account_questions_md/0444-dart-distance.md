# QuantGuide Question

## 444. Dart Distance

**Metadata**

- ID: `qQQNnDCDmaFJyEPbmpVi`
- URL: https://www.quantguide.io/questions/dart-distance
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: TransMarket Group
- Source: tmg
- Tags: Continuous Random Variables, Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-10 11:29:55 America/New_York
- Last Edited By: Gabe

### 题干

A circular dartboard of radius $1$ is placed on a ball. Joan throws a dart such that it lands uniformly at random on the surface of the dartboard. Find the expected radial distance that the dart lands from the center.

### Hint

Let $R$ be the radial distance from the center. Compute $\mathbb{E}[R]$ using the classic trick for non-negative continuous random variables $$\mathbb{E}[R]  = \displaystyle \int_0^{\infty} \mathbb{P}[R \geq r]dr$$

### 解答

Let $R$ be the radial distance from the center. We can compute $\mathbb{E}[R]$ using our classic trick of $\mathbb{E}[R]  = \displaystyle \int_0^{\infty} \mathbb{P}[R \geq r]dr$. We only need to integrate this on $[0,1]$ since the dart can't land more than a distance $1$ from the center. The event $\{R \geq r\}$ means that the dart lands in the "donut" region that is outside of the circle of radius $r$ centered at the origin. The total area of the dartboard is $\pi$, and the area of the circular region the dart can't land in is $\pi r^2$, so the probability that the dart lands outside the circle of radius $r$ centered at the origin is $\dfrac{\pi - \pi r^2}{\pi} = 1 - r^2$. Therefore, we have that $$\mathbb{E}[R] = \displaystyle \int_0^1 1-r^2 dr = \dfrac{2}{3}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "qQQNnDCDmaFJyEPbmpVi",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-10 11:29:55 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3538959,
    "source": "tmg",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Dart Distance",
    "topic": "probability",
    "urlEnding": "dart-distance",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "id": "qQQNnDCDmaFJyEPbmpVi",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Dart Distance",
    "topic": "probability",
    "urlEnding": "dart-distance"
  }
}
```
