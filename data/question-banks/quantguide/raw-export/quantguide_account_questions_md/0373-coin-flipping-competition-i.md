# QuantGuide Question

## 373. Coin Flipping Competition I

**Metadata**

- ID: `dGKCQHH5LPtweJFuh5Mf`
- URL: https://www.quantguide.io/questions/coin-flipping-competition-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Discrete Random Variables, Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:42:22 America/New_York
- Last Edited By: Gabe

### 题干

Ty and Guy are both flipping fair coins until the respectively obtain their first heads. Find the probability that it takes Ty at least 4 times as many flips to obtain his first heads as Guy.

### Hint

If $T$ and $G$ represent the number of flips needed for Ty and Guy, respectively, to obtain their first heads, $T,G\sim \text{Geom}\left(\dfrac{1}{2}\right)$ IID. You are looking for $\mathbb{P}[T \geq 4G]$. It may be helpful to compute this if $G$ were non-random.

### 解答

We know that if $T$ and $G$ represent the number of flips needed for Ty and Guy, respectively, to obtain their first heads, $T,G\sim \text{Geom}\left(\dfrac{1}{2}\right)$ IID. We are looking for $\mathbb{P}[T \geq 4G]$. The easiest way to do this is to condition on $G = g$ and use Law of Total Probability. Therefore, $$\displaystyle \mathbb{P}[T \geq 4G] = \sum_{g = 1}^{\infty} \mathbb{P}[T \geq 4G \mid G = g]\mathbb{P}[G = g]$$ By the definition of the PMF of $G$, $\mathbb{P}[G = g] = \dfrac{1}{2^g}$. Now, $\mathbb{P}[T \geq 4G \mid G = g] = \mathbb{P}[T \geq 4g]$. To evaluate this probability, let's think about what this event says. This means that it takes Ty at least $4g$ flips to obtain his first heads. This is equivalent to saying that all of the first $4g-1$ flips are tails, and this occurs with probability $\dfrac{1}{2^{4g-1}}$. This is exactly the probability of interest there.

$$$$

All that is left is to compute the sum. $\displaystyle \mathbb{P}[T \geq 4G] = \sum_{g=1}^{\infty} \dfrac{1}{2^{4g-1}} \cdot \dfrac{1}{2^g} = 2\sum_{g=1}^{\infty} \left(\dfrac{1}{32}\right)^g$. This is a geometric series with ratio $\dfrac{1}{32}$ starting at the first term, so this evaluates to $2 \cdot \dfrac{\frac{1}{32}}{1 - \frac{1}{32}} = \dfrac{2}{31}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/31"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "dGKCQHH5LPtweJFuh5Mf",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:42:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2889224,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Coin Flipping Competition I",
    "topic": "probability",
    "urlEnding": "coin-flipping-competition-i",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "dGKCQHH5LPtweJFuh5Mf",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Coin Flipping Competition I",
    "topic": "probability",
    "urlEnding": "coin-flipping-competition-i"
  }
}
```
