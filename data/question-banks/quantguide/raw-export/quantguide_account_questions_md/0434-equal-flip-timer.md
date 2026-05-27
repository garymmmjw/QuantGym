# QuantGuide Question

## 434. Equal Flip Timer

**Metadata**

- ID: `vE0n31wE47XbdjexTfur`
- URL: https://www.quantguide.io/questions/equal-flip-timer
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Flow Traders
- Source: Original
- Tags: Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-9 13:54:08 America/New_York
- Last Edited By: Gabe

### 题干

Brad and Chad both flip coins with probability $p$ of heads on each flip. Let $B$ be the event that it takes strictly less flips for Brad to get his first heads than Chad, $C$ be the event that it takes Chad strictly less flips than Brad to get his first heads than Brad, and $E$ be the event that it takes them an equal number of flips to obtain their first heads. Find the value of $p$ such that $\mathbb{P}[E] = \mathbb{P}[C]$.

### Hint

By symmetry, we know that $\mathbb{P}[B] = \mathbb{P}[C]$, as they are both flipping coins with the same heads probability. Therefore, as we want all three terms to be equal, they all should have probability $\dfrac{1}{3}$, as they sum to $1$. In other words, we need to find a value $p$ such that the probability both of them obtain their first heads at the same time is also $\dfrac{1}{3}$. 

### 解答

By symmetry, we know that $\mathbb{P}[B] = \mathbb{P}[C]$, as they are both flipping coins with the same heads probability. Therefore, as we want all three terms to be equal, they all should have probability $\dfrac{1}{3}$, as they sum to $1$. In other words, we need to find a value $p$ such that the probability both of them obtain their first heads at the same time is $\dfrac{1}{3}$. 

$$$$

The probability it takes exactly $k$ flips for each of them would be $p(1-p)^{k-1}$, as they get $k-1$ tails and $1$ head. Thus, the probability both get it in exactly $k$ flips is $p^2(1-p)^{2(k-1)}$. Summing this up from $k = 1$ to $\infty$ yields $$\displaystyle \sum_{k=1}^{\infty}p^2(1-p)^{2(k-1)} = p^2\sum_{k=1}^{\infty}\left((1-p)^2\right)^{k-1} = \dfrac{p^2}{1 - (1-p)^2}$$

Setting this expression above equal to $\dfrac{1}{3}$, $$\dfrac{p^2}{1-(1-p)^2} = \dfrac{1}{3}$$ The only solution in $(0,1)$ is $p = \dfrac{1}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2",
      "0.5"
    ],
    "companies": [
      {
        "company": "Flow Traders"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "vE0n31wE47XbdjexTfur",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-9 13:54:08 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3469315,
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Equal Flip Timer",
    "topic": "probability",
    "urlEnding": "equal-flip-timer",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Flow Traders"
      }
    ],
    "difficulty": "easy",
    "id": "vE0n31wE47XbdjexTfur",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Equal Flip Timer",
    "topic": "probability",
    "urlEnding": "equal-flip-timer"
  }
}
```
