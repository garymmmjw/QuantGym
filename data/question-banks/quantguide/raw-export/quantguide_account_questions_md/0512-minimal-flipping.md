# QuantGuide Question

## 512. Minimal Flipping

**Metadata**

- ID: `fgCN0IR9jbtdDGaRs9GQ`
- URL: https://www.quantguide.io/questions/minimal-flipping
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: original
- Tags: Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:31:40 America/New_York
- Last Edited By: Gabe

### 题干

$$3$ people flip a weighted coin with probability of heads $p=0.25$ until they obtain their first tails. Find the probability that none of the three people flip more than twice. 

### Hint

Let $X_i$ be the number of flips person $i$ performs until they obtain their first tails. The statement that none flip more than 2 times is the same as $\text{max}(X_1,X_2,X_3) \leq 2$. 

### 解答

Let $X_i$ be the number of flips person $i$ performs until they obtain their first tails. The statement that none flip more than 2 times is the same as $\text{max}(X_1,X_2,X_3) \leq 2$. 

$$$$

Thus, we want $$\mathbb{P}[\text{max}(X_1,X_2,X_3) \leq 2] = \mathbb{P}[X_1 \leq 2]\mathbb{P}[X_2 \leq 2]\mathbb{P}[X_3 \leq 2] = (\mathbb{P}[X_1 \leq 2])^3$$ by the fact the $X_i$ random variables are IID. We have that $X_1 \sim \text{Geom}(0.75)$, as there is a $75\%$ chance of obtaining a tails on any flip, so $\mathbb{P}[X_1 \leq 2] = \mathbb{P}[X_1 = 1] + \mathbb{P}[X_1 = 2] = \dfrac{3}{4} + \dfrac{3}{4} \cdot \dfrac{1}{4} = \dfrac{15}{16}$, so the probability is $\left(\dfrac{15}{16}\right)^3$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3375/4096"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "fgCN0IR9jbtdDGaRs9GQ",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:31:40 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4093545,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Minimal Flipping",
    "topic": "probability",
    "urlEnding": "minimal-flipping",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "fgCN0IR9jbtdDGaRs9GQ",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Minimal Flipping",
    "topic": "probability",
    "urlEnding": "minimal-flipping"
  }
}
```
