# QuantGuide Question

## 944. Estimating Pi

**Metadata**

- ID: `2uITIZeXDmZTGTTBAxAp`
- URL: https://www.quantguide.io/questions/estimating-pi
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG, Goldman Sachs
- Source: Original, inspired by 150 q
- Tags: Expected Value, Limit Theorems
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-7 12:54:54 America/New_York
- Last Edited By: Gabe

### 题干

You decide to estimate $\pi$ by generating $N$ independent samples from the unit square $[0,1] \times [0,1]$. Let $I_i$ represent the indicator random variable of the event that the $i$th sample, $1 \leq i \leq N$, lands inside the region enclosed by $x^2 + y^2 = 1$ in the first quadrant. Using $$T_N = \dfrac{I_1 + \dots + I_N}{N}$$ $\textbf{in your estimate}$ for $\pi$, what is variance of your estimate for $\pi$? Note that $T_N$ is not necessarily an estimator for $\pi$ itself. The answer is in the form $$\dfrac{a\pi^2 + b\pi}{N}$$ for integers $a$ and $b$. Find $a + b$. Note that this variance is somewhat useless given that you need $\pi$ to calculate your variance.

### Hint

Note that $T_N \rightarrow \mathbb{E}[I_1] = \dfrac{\pi}{4}$ with probability $1$ by the Strong Law of Large Numbers. $\mathbb{E}[I_1] = \dfrac{\pi}{4}$ because of the fact that the circle occupies a proportion of $\dfrac{\pi}{4}$ of the total area of the square. Our estimate for $\pi$ should be $4T_N$. This is the quantity we want to find the variance of.

### 解答

Note that $T_N \rightarrow \mathbb{E}[I_1] = \dfrac{\pi}{4}$ with probability $1$ by the Strong Law of Large Numbers. $\mathbb{E}[I_1] = \dfrac{\pi}{4}$ because of the fact that the circle occupies a proportion of $\dfrac{\pi}{4}$ of the total area of the square. Our estimate for $\pi$ should be $4T_N$. This is the quantity we want to find the variance of.

$$$$

By properties of variance and the fact that each $I_i$ is IID, we have that $$\text{Var}(4T_N) = 16\text{Var}(T_N) = 16\text{Var}\left(\dfrac{I_1 + \dots + I_N}{N}\right) = \dfrac{16}{N^2} \cdot N\text{Var}(I_1) = \dfrac{16\text{Var}(I_1)}{N}$$ We can use the standard formula to compute $\text{Var}(I_1)$. This is just $\text{Var}(I_1) = \mathbb{E}[I_1^2] - (\mathbb{E}[I_1])^2$. However, note that $I_1^2 = I_1$, as $I_1$ only takes the values $0$ and $1$. Therefore, $\text{Var}(I_1) = \dfrac{\pi}{4} - \dfrac{\pi^2}{16} = \dfrac{4\pi - \pi^2}{16}$. Accordingly, our final answer is just $$\text{Var}(4T_N) = \dfrac{-\pi^2 + 4\pi}{N}$$ This means $a = -1$ and $b = 4$, so $a + b = 3$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "2uITIZeXDmZTGTTBAxAp",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:54:54 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7702285,
    "source": "Original, inspired by 150 q",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Estimating Pi",
    "topic": "probability",
    "urlEnding": "estimating-pi",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "2uITIZeXDmZTGTTBAxAp",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Estimating Pi",
    "topic": "probability",
    "urlEnding": "estimating-pi"
  }
}
```
