# QuantGuide Question

## 153. Nearest Circular Neighbor

**Metadata**

- ID: `rgD7Aqp3Rfvl8Sn4i9kD`
- URL: https://www.quantguide.io/questions/nearest-circular-neighbor
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: MSE
- Tags: Continuous Random Variables, Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-7 13:14:30 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that you select $20$ IID points on the circumference of the unit circle, say $X_1,\dots, X_{20}$. Find the expected arc length (in degrees) between $X_1$ and the point nearest to it. 

### Hint

Fix the location of $X_1$. Let $D$ be the length of the arc (in radians) between $X_1$ and the nearest point. Compute $\mathbb{E}[D] = \displaystyle \int_0^{\pi} \mathbb{P}[D \geq x]dx$.

### 解答

Fix the location of $X_1$. Let $D$ be the length of the arc (in radians) between $X_1$ and the nearest point. We will convert to degrees at the end. We compute $\mathbb{E}[D] = \displaystyle \int_0^{\pi} \mathbb{P}[D \geq x]dx$. The maximal distance is $\pi$ since we look in both directions. The event $\{D \geq x\}$ means that the other $19$ points lie outside a region of $x$ radians in either direction. This means that there are $2(\pi - x)$ radians that are valid for the other $n-1$ points to lie in. Therefore, the probability all of the other $19$ points lie outside this region is $$\left(\dfrac{2(\pi - x)}{2\pi}\right)^{19} = \left(1 - \dfrac{x}{\pi}\right)^{19}$$ Therefore, our expected distance is $\mathbb{E}[D] = \displaystyle \int_0^{\pi} \left(1 - \dfrac{x}{\pi}\right)^{19}dx = \pi \int_0^1 (1-u)^{19}du = \dfrac{\pi}{20}$ Therefore, this is $\dfrac{180}{\pi} \cdot \dfrac{\pi}{20} = 9$ degrees.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "9"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "rgD7Aqp3Rfvl8Sn4i9kD",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:14:30 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1149157,
    "source": "MSE",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Nearest Circular Neighbor",
    "topic": "probability",
    "urlEnding": "nearest-circular-neighbor",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "rgD7Aqp3Rfvl8Sn4i9kD",
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
    "title": "Nearest Circular Neighbor",
    "topic": "probability",
    "urlEnding": "nearest-circular-neighbor"
  }
}
```
