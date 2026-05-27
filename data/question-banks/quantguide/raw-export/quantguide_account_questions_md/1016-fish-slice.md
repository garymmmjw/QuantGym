# QuantGuide Question

## 1016. Fish Slice

**Metadata**

- ID: `bGbfmLaszoYWbbBjiJrr`
- URL: https://www.quantguide.io/questions/fish-slice
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel
- Source: original
- Tags: Conditional Probability, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-6 10:38:09 America/New_York
- Last Edited By: Gabe

### 题干

Noelle is preparing a tuna fish of length $L$ in anticipation of dinner. She selects $2$ cutting points uniformly at random and independently along the length of the fish so that the cutting points are on opposite sides of the midpoint of the fish. Find the probability that the distance between the two points Noelle selects is greater than $\frac{L}{3}$.

### Hint

Let $X$ be the random variable representing the location of the first cutting point and $Y$ be the random variable representing the location of the second cutting point. Restrict to the region where $X$ is to the left and $Y$ is to the right. What are the distributions of $X$ and $Y$?

### 解答

Let $X$ be the random variable representing the location of the first cutting point and $Y$ be the random variable representing the location of the second cutting point. Since $X$ and $Y$ are equally likely to be on either side of the midpoint due to symmetry, we are going to consider the case of $X$ being left of the midpoint and $Y$ to the right. Since $X$ is to the left, $X \sim \text{Unif}[0,\frac{L}{2}]$. Similarly, $Y \sim \text{Unif}[\frac{L}{2},L]$. We want to find $\mathbb{P}[|X-Y| \geq \frac{L}{3}]$. Since the joint PDF is uniform over the indicator region, we can just take ratios of areas to find the probability. If you are to sketch out the region of interest and then the region in which $|X-Y| \geq \dfrac{L}{3}$, you will receive a region whose complement is a right triangle whose sides are of length $L/3$. Therefore, the ratio of the areas is $\dfrac{\frac{L^2}{18}}{\frac{L^2}{4}} = \dfrac{2}{9}$, so the probability of the complement is $2/9$, meaning our probability of interest is $7/9$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7/9"
    ],
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "bGbfmLaszoYWbbBjiJrr",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-6 10:38:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8247851,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Fish Slice",
    "topic": "probability",
    "urlEnding": "fish-slice",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "id": "bGbfmLaszoYWbbBjiJrr",
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
    "title": "Fish Slice",
    "topic": "probability",
    "urlEnding": "fish-slice"
  }
}
```
