# QuantGuide Question

## 139. Spacious Uniform Values II

**Metadata**

- ID: `R22mxBB03qPVPbJU7d0e`
- URL: https://www.quantguide.io/questions/spacious-uniform-values-ii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: WorldQuant, Citadel
- Source: MSE
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

You sample 101 uniformly random numbers in the interval $(0,1)$. Find the expected length of the shortest distance between any two selected points.

### Hint

Recall the identity for non-negative real-valued continuous random variables that $\mathbb{E}[X] = \displaystyle \int_{0}^{\infty} \mathbb{P}[X \geq x]dx$. Apply this to the minimum distance random variable.

### 解答

In Spacious Uniform Values I, we found that the probability that no two points are within a distance $x$ of one another is $(1 - 100x)^{101}$. In other words, the probability that the minimum distance between two values is at least $x$ is that. Now, recall the identity for non-negative real-valued continuous random variables that $\mathbb{E}[X] = \displaystyle \int_{0}^{\infty} \mathbb{P}[X \geq x]dx$. We apply this to $M$, the minimum spacing between the points. We have that $\mathbb{E}[M] = \displaystyle \int_0^{\infty} \mathbb{P}[M \geq x]dx$. The maximum value of the minimum possible spacing between the points is $\dfrac{1}{100}$. If no point was within a distance of something larger than $\dfrac{1}{100}$, the total length of the interval formed would be larger than $1$, contradicting that these are only supported on $(0,1)$. Therefore, our integral upper bound is $\dfrac{1}{100}$. This yields $$\mathbb{E}[M] = \displaystyle \int_0^{\frac{1}{100}} \left(1 - 100x\right)^{101}dx$$ Let $u = 1 - 100x$ so that $du = -100dx$. It is simple to verify the bounds of our integral are now $0$ and $1$. This yields the new integral $\displaystyle \dfrac{1}{100} \int_0^1 u^{101}du$, which is evaluated to be $\dfrac{1}{10200}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/10200"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "hard",
    "id": "R22mxBB03qPVPbJU7d0e",
    "internalDifficulty": 4,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 993794,
    "randomizable": "",
    "source": "MSE",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Spacious Uniform Values II",
    "topic": "probability",
    "urlEnding": "spacious-uniform-values-ii"
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "hard",
    "id": "R22mxBB03qPVPbJU7d0e",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Spacious Uniform Values II",
    "topic": "probability",
    "urlEnding": "spacious-uniform-values-ii"
  }
}
```
