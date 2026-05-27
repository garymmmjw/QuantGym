# QuantGuide Question

## 601. Uniformly Correlated

**Metadata**

- ID: `h6OgRzMaE90Pm7r2pWFG`
- URL: https://www.quantguide.io/questions/uniformly-correlated
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: gabe book
- Tags: Covariance
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 11:49:59 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $X,Y \sim \text{Unif}(0,1)$ IID. Define $U = 1 - X^2 - Y^2$ and $V = X^2 + Y^2$. Find Cov$(U,V)$.

### Hint

Note that we can write $U = 1 - V$. This will help us simplify some of the calculations. Thus, $$\text{Cov}(U,V) = \text{Cov}(1-V,V) = -\text{Var}(V) = -\text{Var}(X^2 + Y^2)$$ Use definition of variance or variance of a sum formula afterwards.

### 解答

Note that we can write $U = 1 - V$. This will help us simplify some of the calculations. Thus, $$\text{Cov}(U,V) = \text{Cov}(1-V,V) = -\text{Var}(V) = -\text{Var}(X^2 + Y^2)$$ We need to calculate this variance, which requires some algebra on the definition of variance. We have that Var$(X^2 + Y^2) = \mathbb{E}[(X^2 + Y^2)^2] - (\mathbb{E}[X^2 + Y^2])^2$. We have that $\mathbb{E}[X^2 + Y^2] = \mathbb{E}[X^2] + \mathbb{E}[Y^2]$. We have that $\mathbb{E}[X^2] = \text{Var}(X) + (\mathbb{E}[X])^2 = \dfrac{1}{3}$ from the formulas for the variance and expectation of a Unif$(0,1)$. The same holds for $\mathbb{E}[Y^2]$. The harder term is the first one. We have that $$\mathbb{E}[(X^2 + Y^2)^2] = \mathbb{E}[X^4 + Y^4 + 2X^2Y^2] = \mathbb{E}[X^4] + \mathbb{E}[Y^4] + 2\mathbb{E}[X^2]\mathbb{E}[Y^2]$$ $$$$A fairly easy to show fact is that for a Unif$(0,1)$, the $k$th moment is $\dfrac{1}{k+1}$. You can see this by noting that if $R \sim \text{Unif}(0,1)$, $\mathbb{E}[R^k] = \displaystyle \int_0^1 r^kdr = \dfrac{1}{k+1}$ by LOTUS. Thus, each of the first two terms in this are $\dfrac{1}{5}$. Thus, we have that Var$(X^2 + Y^2) = \left(\dfrac{1}{5} + \dfrac{1}{5} + 2\left(\dfrac{1}{3}\right)^2\right) - \left(\dfrac{1}{3} + \dfrac{1}{3}\right)^2 = \dfrac{28}{45} - \dfrac{20}{45} = \dfrac{8}{45}$. Thus, $\text{Cov}(U,V) = -\dfrac{8}{45}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-8/45"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "h6OgRzMaE90Pm7r2pWFG",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 11:49:59 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4783513,
    "source": "gabe book",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Uniformly Correlated",
    "topic": "probability",
    "urlEnding": "uniformly-correlated"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "h6OgRzMaE90Pm7r2pWFG",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Uniformly Correlated",
    "topic": "probability",
    "urlEnding": "uniformly-correlated"
  }
}
```
