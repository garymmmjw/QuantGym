# QuantGuide Question

## 1181. Coin Flipping Competition II

**Metadata**

- ID: `tBIp9AEjfabBj7WTSnyL`
- URL: https://www.quantguide.io/questions/coin-flipping-competition-ii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Discrete Random Variables, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-23 13:16:32 America/New_York
- Last Edited By: Gabe

### 题干

Ty, Guy, and Psy are all flipping fair coins until they respectively obtain their first heads. Let $T,G,$ and $P$ represent the number of flips needed for Ty, Guy, and Psy, respectively. Find $\mathbb{P}[T \leq G \leq P]$.

### Hint

What is the joint PMF of $T,G,$ and $P$ and what is the region of summation?

### 解答

We know that $T, G, P \sim \text{Geom}\left(\dfrac{1}{2}\right)$ IID, as they are looking for the distribution of the first heads. As these are independent, we can multiply the individual PMFs to get the joint PMF, so the joint PMF is $\mathbb{P}[T = t, G = g, P = p] = \left(\dfrac{1}{2}\right)^t\left(\dfrac{1}{2}\right)^g\left(\dfrac{1}{2}\right)^p$ for $t,g,p = 1,2,\dots$. 

$$$$

We now need to get a region of summation for this probability. Let's let $t$ be free, so we sum $t$ from $1$ to $\infty$. Then, we know $G \geq T$, so we sum over $g = t$ to $\infty$. After that, we know $P \geq G$, so we sum inner most from $p = g$ to $\infty$. Therefore, our sum is $\displaystyle \sum_{t = 1}^{\infty} \sum_{g = t}^{\infty} \sum_{p = g}^{\infty} \left(\dfrac{1}{2}\right)^t\left(\dfrac{1}{2}\right)^g\left(\dfrac{1}{2}\right)^p$. As the inner most summation only concerns $p$, we ignore the rest for now. $\sum_{p = g}^{\infty} \dfrac{1}{2^p} = \dfrac{\frac{1}{2^g}}{1 - \frac{1}{2}} = \dfrac{1}{2^{g-1}}$. Now, our summation is $\displaystyle \sum_{t=1}^{\infty} \sum_{g = t}^{\infty} \dfrac{1}{2^t} \cdot \dfrac{1}{2^{2g-1}} = \sum_{t=1}^{\infty} \sum_{g = t+1}^{\infty} \dfrac{1}{2^{t-1}} \cdot \dfrac{1}{4^g}$. Ignoring the first term, as our sum only concerns $g$, $\displaystyle \sum_{g=t}^{\infty} \dfrac{1}{4^g} = \dfrac{\frac{1}{4^t}}{1 - \frac{1}{4}} = \dfrac{4}{3} \cdot \dfrac{1}{4^t}$.

$$$$

Now, our final summation is $\dfrac{8}{3} \displaystyle \sum_{t=1}^{\infty} \dfrac{1}{8^t}$ after shoving all the constants to the front. The last sum is simply $\dfrac{\frac{1}{8}}{1 - \frac{1}{8}} = \dfrac{1}{7}$, so our solution is $\dfrac{8}{21}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "8/21"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "tBIp9AEjfabBj7WTSnyL",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-23 13:16:32 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9810440,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Coin Flipping Competition II",
    "topic": "probability",
    "urlEnding": "coin-flipping-competition-ii",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "tBIp9AEjfabBj7WTSnyL",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Coin Flipping Competition II",
    "topic": "probability",
    "urlEnding": "coin-flipping-competition-ii"
  }
}
```
