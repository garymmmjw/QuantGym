# QuantGuide Question

## 1100. Cheese Lover I

**Metadata**

- ID: `YxkToIpN04qsXqy2XtuA`
- URL: https://www.quantguide.io/questions/cheese-lover-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: og
- Tags: Limit Theorems, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-17 15:34:55 America/New_York
- Last Edited By: Gabe

### 题干

Jon loves cheese. He decides to make $100$ blocks of cheese. The distribution of the weight (in grams) of each block he makes follows IID Exp$\left(\dfrac{1}{250}\right)$ distribution. Let $W_i$ denote the weight of the $i$th block of cheese, and $T_{100}$ represent the total weight of the $100$ blocks of cheese. Using Markov's Inequality, what is an upper bound on $\mathbb{P}[T_{100} > 26000]$?

### Hint

Markov's Inequality states that for a non-negative random variable $X$ and $c > 0$, $\mathbb{P}[X > c] \leq \dfrac{\mathbb{E}[X]}{c}$

### 解答

Markov's Inequality states that $\mathbb{P}[T_{100} > 26000] \leq \dfrac{\mathbb{E}[T_{100}]}{26000}$, as it is already in the form of Markov's Inequality. By linearity of expectation (or recognition), you can find that $\mathbb{E}[T_{100}] = 100\mathbb{E}[W_1] = 100 \cdot 250 = 25000$, so we get the upper bound on the probability as $\dfrac{25}{26}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "25/26"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "YxkToIpN04qsXqy2XtuA",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 15:34:55 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8997662,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Limit Theorems"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Cheese Lover I",
    "topic": "probability",
    "urlEnding": "cheese-lover-i",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "YxkToIpN04qsXqy2XtuA",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Limit Theorems"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Cheese Lover I",
    "topic": "probability",
    "urlEnding": "cheese-lover-i"
  }
}
```
