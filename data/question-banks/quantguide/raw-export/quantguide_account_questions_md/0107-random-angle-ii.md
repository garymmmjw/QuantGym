# QuantGuide Question

## 107. Random Angle II

**Metadata**

- ID: `Wz2Ea9z4USG6EElR1p4B`
- URL: https://www.quantguide.io/questions/random-angle-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Goldman Sachs
- Source: original
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-7 12:45:57 America/New_York
- Last Edited By: Gabe

### 题干

 A right triangle is being formed with legs labeled $A$ and $B$. The random lengths of legs $A$ and $B$ are both IID Unif$(0,1)$ RVs. Let $\theta$ be the angle (of random degree measure) that is opposite of side $A$. Find the probability $\theta > \dfrac{\pi}{3}$. The answer is in the form $\dfrac{a}{b\sqrt{c}}$ for integers $a,b,c$ that are relatively prime. Find $abc$.

### Hint

We have that $\theta > \dfrac{\pi}{3}$ if and only if $\tan(\theta) > \sqrt{3}$.

### 解答

Repeating the same process, we have that $\theta > \dfrac{\pi}{3}$ if and only if $\tan(\theta) > \sqrt{3}$. Therefore, we want the probability that $\mathbb{P}[A > B\sqrt{3}]$. Plotting this in the plane yields a triangle of side lengths $1$ and $\dfrac{1}{\sqrt{3}}$, meaning that the area of the triangle is $\dfrac{1}{2\sqrt{3}}$. We are allowed to take ratios of areas since they are uniform distributions. Thus, the area of the entire square is $1$, so the probability of this is just $\dfrac{1}{2\sqrt{3}}$. Therefore, $abc = 6$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6"
    ],
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Wz2Ea9z4USG6EElR1p4B",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:45:57 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 762825,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Random Angle II",
    "topic": "probability",
    "urlEnding": "random-angle-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "id": "Wz2Ea9z4USG6EElR1p4B",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Random Angle II",
    "topic": "probability",
    "urlEnding": "random-angle-ii"
  }
}
```
