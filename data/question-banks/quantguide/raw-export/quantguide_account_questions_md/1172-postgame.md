# QuantGuide Question

## 1172. Postgame

**Metadata**

- ID: `fkB8Y8ahFfDkDvDa33E6`
- URL: https://www.quantguide.io/questions/postgame
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: gabe textbook
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:56:45 America/New_York
- Last Edited By: Gabe

### 题干

Marc is exiting a function and walks out the door to go home. Each minute, he takes either one step left or one step right, independent of all other steps, with equal probability. Let $D_n$ be the distance (number of steps left or right) Marc is from the door after $n$ minutes. Find $\mathbb{E}[D_{10}^2]$. 

### Hint

Write $D_n$ as the sum of $n$ IID random variables.

### 解答

We solve this for general $n$. Let moving left be a movement of $-1$ and right be a movement of $1$. Let $X_i$ be his movement at minute $i$. We have that $X_1, \dots, X_n$ are IID with PMF $\mathbb{P}[X_i = 1] = \mathbb{P}[X_i = -1] = \dfrac{1}{2}$. We have $$D_n = \displaystyle \sum_{i=1}^n X_i$$ Thus, $$\mathbb{E}[D_n^2] = \mathbb{E}\left[\displaystyle \left(\sum_{i=1}^n X_i \right)^2\right] = \mathbb{E}\left[\displaystyle \sum_{i=1}^n X_i^2 + \displaystyle \sum_{i \neq j} X_iX_j\right] = \mathbb{E}\left[\displaystyle \sum_{i=1}^n X_i^2\right] + \mathbb{E}\left[\displaystyle \sum_{i\neq j} X_iX_j\right] = \displaystyle \sum_{i=1}^n \mathbb{E}[X_i^2] + \displaystyle \sum_{i\neq j} \mathbb{E}[ X_iX_j]$$ We have that $\mathbb{E}[X_i^2] = \dfrac{1}{2} \cdot (-1)^2 + \dfrac{1}{2} \cdot (1)^2 = 1$, and since each $X_i$ and $X_j$ are IID, $\mathbb{E}[X_iX_j] = \mathbb{E}[X_i]\mathbb{E}[X_j] = 0$, as the expectation of each $X_i$ is $0$. The entire second sum goes to $0$ then, and we have $\mathbb{E}[D_n^2] = \displaystyle \sum_{i=1}^n 1 = n$. In particular, $n = 10$, so our answer is $10$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "fkB8Y8ahFfDkDvDa33E6",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:56:45 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9761885,
    "source": "gabe textbook",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Postgame",
    "topic": "probability",
    "urlEnding": "postgame"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "fkB8Y8ahFfDkDvDa33E6",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Postgame",
    "topic": "probability",
    "urlEnding": "postgame"
  }
}
```
