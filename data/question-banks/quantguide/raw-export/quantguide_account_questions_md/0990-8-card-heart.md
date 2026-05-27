# QuantGuide Question

## 990. 8 Card Heart

**Metadata**

- ID: `CLWUNfpfekjq73NJYqfb`
- URL: https://www.quantguide.io/questions/8-card-heart
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: gabe book
- Tags: Covariance
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

$$8$ cards are dealt out from a standard deck. Find the variance of the number of hearts in the $8$ cards.

### Hint

Let $H_i$ be the indicator that the $i$th card dealt is a heart. Then $T = H_1 + \dots + H_8$ is the total number of hearts in the dealing of $8$ cards.

### 解答

Let $H_i$ be the indicator that the $i$th card dealt is a heart. Then $T = H_1 + \dots + H_8$ is the total number of hearts in the dealing of $8$ cards. Using the variance of a sum formula, $$\text{Var}(T) = \text{Var}(H_1 + \dots + H_8) = \sum_{i=1}^8 \text{Var}(H_i) + \sum_{i \neq j} \text{Cov}(H_i,H_j)$$ We know that $\text{Var}(H_i) = \dfrac{1}{4} \cdot \dfrac{3}{4} = \dfrac{3}{16}$, as it is an indicator. For $\text{Cov}(H_i,H_j)$, we have to evaluate $\mathbb{E}[H_iH_j] - \mathbb{E}[H_i]\mathbb{E}[H_j]$. $$$$We know the second term in this expression is just $\dfrac{1}{4^2}$ because of the know value of the expectation of the indicators. Now, $\mathbb{E}[H_iH_j] = \mathbb{E}[H_1H_2]$ by the exchangeability of the draws. This expectation is just the indicator that the first two cards drawn are hearts. This probability is $\dfrac{1}{4} \cdot \dfrac{12}{51}$, as once we get our first hearts, there are 12 cards of 51 left, so $\mathbb{E}[H_iH_j] = \dfrac{1}{4} \cdot \dfrac{12}{51}.$ Therefore, $$\text{Cov}(H_i,H_j) = \dfrac{1}{4}\left(\dfrac{12}{51} - \dfrac{1}{4}\right) = -\dfrac{1}{272}$$ Plugging in, we have that $\text{Var}(T) = 8\text{Var}(H_i) + 8(7)\text{Cov}(H_1,H_2) = 8 \cdot \dfrac{3}{16} - \dfrac{56}{272} =  \dfrac{22}{17}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "22/17"
    ],
    "difficulty": "easy",
    "id": "CLWUNfpfekjq73NJYqfb",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 8072650,
    "source": "gabe book",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "8 Card Heart",
    "topic": "probability",
    "urlEnding": "8-card-heart"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "CLWUNfpfekjq73NJYqfb",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "8 Card Heart",
    "topic": "probability",
    "urlEnding": "8-card-heart"
  }
}
```
