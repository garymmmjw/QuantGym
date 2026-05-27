# QuantGuide Question

## 312. Coin Flipping Competition III

**Metadata**

- ID: `hGt4QLlVwVbDMmswBz6t`
- URL: https://www.quantguide.io/questions/coin-flipping-competition-iii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Discrete Random Variables, Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 22:03:41 America/New_York
- Last Edited By: Gabe

### 题干

Ty, Guy, and Psy are all flipping fair until they respectively obtain their first heads. Let $T,G,$ and $P$ represent the number of flips needed for Ty, Guy, and Psy, respectively. Find $\mathbb{P}[T < G < P]$.

### Hint

What is the joint PMF of $T,G,$ and $P$ and what is the region of summation?

### 解答

We know that $T, G, P \sim \text{Geom}\left(\dfrac{1}{2}\right)$ IID, as they are looking for the distribution of the first heads. As these are independent, we can multiply the individual PMFs to get the joint PMF, so the joint PMF is $\mathbb{P}[T = t, G = g, P = p] = \left(\dfrac{1}{2}\right)^t\left(\dfrac{1}{2}\right)^g\left(\dfrac{1}{2}\right)^p$ for $t,g,p = 1,2,\dots$.

$$$$

We now need to get a region of summation for this probability. Let's let $t$ be free, so we sum $t$ from $1$ to $\infty$. Then, we know $G > T$, so we sum over $g = t+1$ to $\infty$. After that, we know $P > G$, so we sum inner most from $p = g+1$ to $\infty$. Therefore, our sum is $\displaystyle \sum_{t = 1}^{\infty} \sum_{g = t+1}^{\infty} \sum_{p = g+1}^{\infty} \left(\dfrac{1}{2}\right)^t\left(\dfrac{1}{2}\right)^g\left(\dfrac{1}{2}\right)^p$. As the inner most summation only concerns $p$, we ignore the rest for now. $\sum_{p = g+1}^{\infty} \dfrac{1}{2^p} = \dfrac{\frac{1}{2^{g+1}}}{1 - \frac{1}{2}} = \dfrac{1}{2^g}$. Now, our summation is $\displaystyle \sum_{t=1}^{\infty} \sum_{g = t+1}^{\infty} \dfrac{1}{2^t} \cdot \dfrac{1}{2^{2g}} = \sum_{t=1}^{\infty} \sum_{g = t+1}^{\infty} \dfrac{1}{2^{t}} \cdot \dfrac{1}{4^g}$. Ignoring the first term, as our sum only concerns $g$, $\displaystyle \sum_{g=t+1}^{\infty} \dfrac{1}{4^g} = \dfrac{\frac{1}{4^{t+1}}}{1 - \frac{1}{4}} = \dfrac{4}{3} \cdot \dfrac{1}{4^{t+1}}$.

$$$$

Now, our final summation is $\dfrac{1}{3} \displaystyle \sum_{t=1}^{\infty} \dfrac{1}{2^t} \cdot \dfrac{1}{4^{t}} = \dfrac{1}{3} \sum_{t=1}^{\infty} \dfrac{1}{8^t}$ after shoving the constants to the front. The last sum is simply $\dfrac{\frac{1}{8}}{1 - \frac{1}{8}} = \dfrac{1}{7}$, so our solution is $\dfrac{1}{21}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/21"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "hGt4QLlVwVbDMmswBz6t",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 22:03:41 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2435298,
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
    "title": "Coin Flipping Competition III",
    "topic": "probability",
    "urlEnding": "coin-flipping-competition-iii",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "hGt4QLlVwVbDMmswBz6t",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Coin Flipping Competition III",
    "topic": "probability",
    "urlEnding": "coin-flipping-competition-iii"
  }
}
```
