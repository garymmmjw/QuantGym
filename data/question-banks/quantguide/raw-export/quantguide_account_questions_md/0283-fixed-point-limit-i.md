# QuantGuide Question

## 283. Fixed Point Limit I

**Metadata**

- ID: `I9HMukZJo6qRUCYhqdjx`
- URL: https://www.quantguide.io/questions/fixed-point-limit-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Citadel, WorldQuant
- Source: tqd
- Tags: Discrete Random Variables, Limit Theorems
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-17 20:52:22 America/New_York
- Last Edited By: Gabe

### 题干

Let $F_n$ be the number of fixed points of a random function $f: S_n \rightarrow S_n$, where $S_n = \{1,2,\dots,n\}$. Find $\displaystyle \lim_{n \rightarrow \infty}\mathbb{P}[F_n = 5]$. The answer is in the form $\dfrac{c}{e}$, where $e$ is Euler's constant and $c$ is a constant. Find $c$.

### Hint

The events that each of the values is a fixed point are independent, as we can choose a function $f$ from the set of all functions

### 解答

The events that each of the values is a fixed point are independent, as we can choose a function $f$ from the set of all functions, so as there are $n$ possible values in $S_n$ and each has probability $1/n$ of being fixed (exactly one of the $n$ values would make it fixed), we have that $F_n \sim \text{Binom}(n,1/n)$. By Poisson Limit Theorem, we have that $F_n \implies \text{Poisson}(1)$, so $\mathbb{P}[F_n = 5] = \dfrac{1}{5!}e^{-5}$, so our answer is $1/120$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/120"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "I9HMukZJo6qRUCYhqdjx",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 20:52:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2189985,
    "source": "tqd",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Fixed Point Limit I",
    "topic": "probability",
    "urlEnding": "fixed-point-limit-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "id": "I9HMukZJo6qRUCYhqdjx",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Fixed Point Limit I",
    "topic": "probability",
    "urlEnding": "fixed-point-limit-i"
  }
}
```
