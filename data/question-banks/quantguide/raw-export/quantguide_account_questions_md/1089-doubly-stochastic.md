# QuantGuide Question

## 1089. Doubly Stochastic

**Metadata**

- ID: `ST5GR7eczjVoBKTwqr37`
- URL: https://www.quantguide.io/questions/doubly-stochastic
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: standard stoch process question
- Tags: Pure Math
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-27 20:49:38 America/New_York
- Last Edited By: Gabe

### 题干

We say that a transition matrix $P$ is $\textit{doubly stochastic}$ if 1) every entry is non-negative and 2) every row and column sums to $1$. Suppose that you have a Markov Chain with a doubly stochastic transition matrix $P$ on $S = \{1,2,\dots, 100\}$. Let $\pi$ be the stationary distribution of this Markov Chain. Find $||\pi||$.

### Hint

The stationary distribution is a row vector satisfying $\pi = \pi P$. Writing this out in matrix multiplication form, $\displaystyle \pi_j = \sum_{i=1}^{100} \pi_i P_{ij}$. Use the fact that columns sum to $1$.

### 解答

The stationary distribution is a row vector satisfying $\pi = \pi P$. Writing this out in matrix multiplication form, we have that $\displaystyle \pi_j = \sum_{i=1}^{100} \pi_i P_{ij}$. As we know $\displaystyle \sum_{i=1}^{100}P_{ij} = 1$ from the fact that columns sum to $1$ in a doubly stochastic matrix, suppose that $\pi_i = 1$ for all $i$. Then $$1 = \sum_{i=1}^{100} P_{ij} = 1$$ However, we note that $\displaystyle \sum_{i=1}^{100} \pi_i = 1$ by definition of being a distribution. Therefore, the above allows us to conclude that $\pi$ is uniform on $S$, so that $\pi_i = \dfrac{1}{100}$ for all $i$. This means that $||\pi|| = \sqrt{100 \cdot \dfrac{1}{100^2}} = \dfrac{1}{10}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/10"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ST5GR7eczjVoBKTwqr37",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-27 20:49:38 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8892679,
    "source": "standard stoch process question",
    "status": "published",
    "tags": [
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Doubly Stochastic",
    "topic": "probability",
    "urlEnding": "doubly-stochastic",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "ST5GR7eczjVoBKTwqr37",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Doubly Stochastic",
    "topic": "probability",
    "urlEnding": "doubly-stochastic"
  }
}
```
