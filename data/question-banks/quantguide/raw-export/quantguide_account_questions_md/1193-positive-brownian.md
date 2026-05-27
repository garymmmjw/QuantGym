# QuantGuide Question

## 1193. Positive Brownian I

**Metadata**

- ID: `3lJzqGx9vaW7VMIFEScT`
- URL: https://www.quantguide.io/questions/positive-brownian
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Goldman Sachs, JP Morgan
- Source: common question
- Tags: Stochastic Calculus
- Premium: True
- Solution Free: False
- Version: 5
- Last Edited: 2023-9-30 23:17:22 America/New_York
- Last Edited By: Gabe

### 题干

Let $W_t$ be a standard Brownian Motion. Find $\mathbb{P}[W_1 > 0, W_2 > 0]$.

### Hint

The trick here is to write $W_2 > 0$ as $W_2 - W_1 > -W_1$. This is because now $W_2 - W_1$ is independent of $W_1$. Draw it in the plane.

### 解答

The trick here is to write $W_2 > 0$ as $W_2 - W_1 > -W_1$. This is because now $W_2 - W_1$ is independent of $W_1$. Doing this, we have that $$\mathbb{P}[W_1 > 0, W_2 - W_1 > -W_1] = \mathbb{P}[W_2 - W_1 > -W_1 \mid W_1 > 0]\mathbb{P}[W_1 > 0]$$ The latter term is just $\dfrac{1}{2}$ as $W_1 \sim N(0,1)$ which is symmetric about $0$. For the former term, we can note that in the plane, this region covers the entire right half of the plane except below $y = -x$. As normal random variables have radial symmetry, the region below $y = -x$ is $\dfrac{\pi}{4}$ radians of an entire $\pi$ radians in the right half of the plane. Therefore, the probability of being below that is $\dfrac{1}{4}$, meaning the conditional probability in question is $1 - \dfrac{1}{4} = \dfrac{3}{4}$. Therefore, our answer is $$\dfrac{3}{4} \cdot \dfrac{1}{2} = \dfrac{3}{8}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/8"
    ],
    "companies": [
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "JP Morgan"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "3lJzqGx9vaW7VMIFEScT",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:17:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9900614,
    "source": "common question",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Positive Brownian I",
    "topic": "pure math",
    "urlEnding": "positive-brownian",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "JP Morgan"
      }
    ],
    "difficulty": "medium",
    "id": "3lJzqGx9vaW7VMIFEScT",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Positive Brownian I",
    "topic": "pure math",
    "urlEnding": "positive-brownian"
  }
}
```
