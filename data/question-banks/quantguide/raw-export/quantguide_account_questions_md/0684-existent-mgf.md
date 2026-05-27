# QuantGuide Question

## 684. Existent MGF

**Metadata**

- ID: `Sm6PWitekMhSZ281Lqhv`
- URL: https://www.quantguide.io/questions/existent-mgf
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: original
- Tags: Limit Theorems
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-8 10:20:22 America/New_York
- Last Edited By: Gabe

### 题干

Let $X$ be a random variable with MGF $M(\theta)$ such that $M(1) = 7$. Find the smallest possible value for $M(4)$.

### Hint

We know that $M(\theta) = \mathbb{E}[e^{\theta X}]$ for all $\theta$ such that this expectation exists. Thus, $M(1) = \mathbb{E}[e^X] = 7$. Consider the random variables $Y = e^X$ and $Z = e^{2X}$

### 解答

We know that $M(\theta) = \mathbb{E}[e^{\theta X}]$ for all $\theta$ such that this expectation exists. Thus, $M(1) = \mathbb{E}[e^X] = 7$. Consider the random variable $Y = e^X$. Then $$\text{Var}(Y) = \mathbb{E}[Y^2] - (\mathbb{E}[Y])^2 = \mathbb{E}[e^{2X}] - (\mathbb{E}[e^X])^2 = M(2) - (M(1))^2$$ By definition, $\text{Var}(Y) \geq 0$, so $M(2) - 7^2 \geq 0$, meaning $M(2) \geq 49$. 

$$$$

By applying the same logic now to $Z = e^{2X}$, we have that $\text{Var}(Z) = M(4) - (M(2))^2 \geq M(4) - 49^2 \geq 0$, so $M(4) \geq 49^2 = 2401$. 

$$$$

Alternatively, one can apply Jensen's Inequality to $Y = e^X$ and $f(y) = y^4$. As $y^4$ is convex on $(0,\infty)$, we have that $(\mathbb{E}[Y])^4 = (M(1))^4 = 7^4 = 2401 \leq \mathbb{E}[Y^4] = M(4)$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2401"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "Sm6PWitekMhSZ281Lqhv",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-8 10:20:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5577950,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Existent MGF",
    "topic": "probability",
    "urlEnding": "existent-mgf",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "Sm6PWitekMhSZ281Lqhv",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Existent MGF",
    "topic": "probability",
    "urlEnding": "existent-mgf"
  }
}
```
