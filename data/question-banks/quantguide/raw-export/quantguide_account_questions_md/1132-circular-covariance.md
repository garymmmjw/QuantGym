# QuantGuide Question

## 1132. Circular Covariance

**Metadata**

- ID: `thYFG3z1hLr2THJV7QNl`
- URL: https://www.quantguide.io/questions/circular-covariance
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: original
- Tags: Covariance
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:34:12 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $(X,Y) = (\cos\theta,\sin\theta)$, and $\theta$ is discrete uniform over the set $\left\{0,\dfrac{\pi}{4},\dfrac{\pi}{2},\dots,\dfrac{7\pi}{4}\right\}$. Find $\text{Cov}(X,Y)$.

### Hint

$$\mathbb{E}[X] = \mathbb{E}[Y] = 0$ by symmetry and uniformity, since each point is equally likely and they are symmetric about the unit circle. Can you apply LOTUS for $\mathbb{E}[XY]$ or use some other symmetry?

### 解答

$$\mathbb{E}[X] = \mathbb{E}[Y] = 0$ by symmetry and uniformity, since each point is equally likely and they are symmetric about the unit circle. To show that $\mathbb{E}[XY] = 0$, we apply LOTUS. We have that both $X$ and $Y$ take the values $\dfrac{\sqrt{2}}{2}, 0,$ and $-\dfrac{\sqrt{2}}{2}$ each with probability $\dfrac{1}{4}$, while it is $-1$ and $1$ with probability $\dfrac{1}{8}$. We only need to consider the odd multiple of $\dfrac{\pi}{4}$, as the even ones have one of their coordinates as $0$, so they contribute $0$ to the product. However, the odd multiples are symmetric about the origin, so the expectation of the product is $0$, so they must be uncorrelated.

$$$$

As an aside, the random variables $X$ and $Y$ here are an example of uncorrelated but not independent random variables. This is because $X^2 + Y^2 = 1$, so they can't be independent.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "thYFG3z1hLr2THJV7QNl",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:34:12 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9354211,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Circular Covariance",
    "topic": "probability",
    "urlEnding": "circular-covariance",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "thYFG3z1hLr2THJV7QNl",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Circular Covariance",
    "topic": "probability",
    "urlEnding": "circular-covariance"
  }
}
```
