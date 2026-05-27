# QuantGuide Question

## 1039. The Sum Is Right

**Metadata**

- ID: `PsiVTlOQJxIpF0j1J4NA`
- URL: https://www.quantguide.io/questions/the-sum-is-right
- Topic: probability
- Difficulty: hard
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Suppose that we generate $X_1,X_2,\dots,X_n \sim \text{Unif}(0,1)$ IID. Let $U = \text{min}\{X_1,\dots,X_n\}$ and $V = \text{max}\{X_1,\dots,X_n\}$. Compute $\mathbb{P}[U + V > 1]$.

### Hint

Consider $U' = \text{min}\{1 - X_1,\dots,1-X_n\}$ and $V' = \text{max}\{1 - X_1,\dots,1-X_n\}$ and relate them to $U$ and $V$.

### 解答

Let $\alpha = \mathbb{P}[U + V > 1]$ and $\beta = \mathbb{P}[U + V < 1]$. We know that $\alpha + \beta = 1$ since $U$ and $V$ are continuous so they sum to exactly $1$ with probability $0$.

$$$$

We use the fact that if $X \sim \text{Unif}(0,1)$, $1-X \sim \text{Unif}(0,1)$ as well. With this fact equipped, let $U' = \text{min}\{1 - X_1,\dots,1-X_n\}$ and $V' = \text{max}\{1 - X_1,\dots,1-X_n\}$. By our previous fact, as we are still making maxima and minima over uniform random variables, $\mathbb{P}[U' + V' > 1] = \alpha$ and $\mathbb{P}[U' + V' < 1] = \beta$. Furthermore, observe that $U' = 1 - V$, as to minimize $1 - X_i$, you have to maximize $X_i$ and subtract that from $1$. Similarly, $V' = 1 - U$. Therefore, $$\alpha = \mathbb{P}[U' + V' > 1] = \mathbb{P}[(1-V) + (1-U) > 1] = \mathbb{P}[U + V < 1] = \beta$$ These together imply that $\alpha = \beta = \dfrac{1}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2",
      "0.5"
    ],
    "difficulty": "hard",
    "id": "PsiVTlOQJxIpF0j1J4NA",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 8486450,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "The Sum Is Right",
    "topic": "probability",
    "urlEnding": "the-sum-is-right"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "PsiVTlOQJxIpF0j1J4NA",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "The Sum Is Right",
    "topic": "probability",
    "urlEnding": "the-sum-is-right"
  }
}
```
