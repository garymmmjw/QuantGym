# QuantGuide Question

## 20. Cheese Lover II

**Metadata**

- ID: `z0jwf9paSi4Iyf46H83m`
- URL: https://www.quantguide.io/questions/cheese-lover-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: og
- Tags: Limit Theorems
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-18 20:08:56 America/New_York
- Last Edited By: Gabe

### 题干

Jon loves cheese. He decides to make $100$ blocks of cheese. The distribution of the weight (in grams) of each block he makes follows IID Exp$\left(\dfrac{1}{250}\right)$ distribution. Let $W_i$ denote the weight of the $i$th block of cheese, and $T_{100}$ represent the total weight of the $100$ blocks of cheese. Using Chebyshev's Inequality, what is an upper bound on $\mathbb{P}[T_{100} > 30000]$?

### Hint

Chebyshev's Inequality states that for any random variable $X$ with mean $\mu$ and variance $\sigma^2$, $\mathbb{P}[|X - \mu| > c] \leq \dfrac{\sigma^2}{c^2}$.

### 解答

Chebyshev's Inequality states that for any random variable $X$ with mean $\mu$ and variance $\sigma^2$, $\mathbb{P}[|X - \mu| > c] \leq \dfrac{\sigma^2}{c^2}$. In this case, we first need to center $T_{100}$. Namely, $$\mathbb{P}[T_{100} > 30000] = \mathbb{P}[T_{100} - 25000 > 5000] \leq \mathbb{P}[|T_{100} - 25000| > 5000] \leq \dfrac{\text{Var}(T_{100})}{5000^2}$$ The inequality comes from the fact that $\{T_{100} - 25000 > 5000\} \subseteq \{|T_{100} - 25000| > 5000\}$. By the independence of the individual blocks of cheese, $\text{Var}(T_{100}) = 100\text{Var}(T_{100}) = 100 \cdot 250^2$, so we get the upper bound on the probability as $\dfrac{100 \cdot 250^2}{5000^2} = \dfrac{1}{4}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/4"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "z0jwf9paSi4Iyf46H83m",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-18 20:08:56 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 167089,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Cheese Lover II",
    "topic": "probability",
    "urlEnding": "cheese-lover-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "z0jwf9paSi4Iyf46H83m",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Cheese Lover II",
    "topic": "probability",
    "urlEnding": "cheese-lover-ii"
  }
}
```
