# QuantGuide Question

## 495. Coin Priors

**Metadata**

- ID: `sSjGzrXqyw4meRA0woZh`
- URL: https://www.quantguide.io/questions/coin-priors
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: WorldQuant
- Source: N/A
- Tags: Continuous Random Variables, Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-17 15:48:10 America/New_York
- Last Edited By: Gabe

### 题干

We have a coin with unknown probability $p$ of heads. We prescribe a prior distribution to $p$ of $P \sim \text{Beta}(10,10)$. If $X_1,\dots,X_{80}$ are indicator random variables of the event that the $i$th flip is a heads, $1 \leq i \leq 80$, compute $\mathbb{E}\left[P \hspace{3pt} \Big| \hspace{3pt} \displaystyle \sum_{i=1}^{80} X_i = 50\right]$.

### Hint

Consider the Beta-Binomial Paradigm. The prior distribution being Beta$(10,10)$ means that we can treat ourselves starting with $10$ heads and $10$ tails on the coin as "prior information" when calculating the distribution of $p$.

### 解答

The prior distribution being Beta$(10,10)$ means that we can treat ourselves starting with $10$ heads and $10$ tails on the coin as "prior information" when calculating the distribution of $p$. Then, the information provided says that in the next $80$ flips, we obtain $50$ heads, meaning we also obtain 30 tails. This means that after $100$ total flips, we have $60$ heads and $40$ tails. Therefore, our posterior distribution is Beta$(60,40)$. The mean of a Beta$(a,b)$ distribution is $\dfrac{a}{a+b}$, so the mean of our posterior distribution is $\dfrac{60}{100} = \dfrac{3}{5}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/5"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "sSjGzrXqyw4meRA0woZh",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-17 15:48:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3936657,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Coin Priors",
    "topic": "probability",
    "urlEnding": "coin-priors",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "id": "sSjGzrXqyw4meRA0woZh",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Coin Priors",
    "topic": "probability",
    "urlEnding": "coin-priors"
  }
}
```
