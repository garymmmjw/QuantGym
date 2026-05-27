# QuantGuide Question

## 170. Peaky Poisson

**Metadata**

- ID: `ypDL1ZOy51SWiQK7Gjpc`
- URL: https://www.quantguide.io/questions/peaky-poisson
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: original
- Tags: Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-27 10:42:00 America/New_York
- Last Edited By: Gabe

### 题干

Let $X \sim \text{Poisson}(13.4)$. Find the largest value of $k$ such that $\dfrac{\mathbb{P}[X=k]}{\mathbb{P}[X=k-1]} \geq 1$. Note that $k$ must be in the support of $X$.


### Hint

Plug in the Poisson PMF and reduce it.

### 解答

We will solve this for general $\lambda$. Plugging in the Poisson PMF and taking the ratio yields that we want to find the largest $k$ such that $$\dfrac{\lambda^k e^{-\lambda} / k! }{\lambda^{k-1}e^{-\lambda}/(k-1)!} \geq 1$$ After cancellation, this yields $\dfrac{\lambda}{k} \geq 1$, or that $k \leq \lambda$. Since $\lambda$ is not necessarily an integer, we have that $\lfloor \lambda \rfloor$ will be the maximum possible value in the support of $X$ satisfying that inequality. In this case, $\lfloor 13.4 \rfloor = 13$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "13"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "ypDL1ZOy51SWiQK7Gjpc",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-27 10:42:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1302853,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Peaky Poisson",
    "topic": "probability",
    "urlEnding": "peaky-poisson",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "ypDL1ZOy51SWiQK7Gjpc",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Peaky Poisson",
    "topic": "probability",
    "urlEnding": "peaky-poisson"
  }
}
```
