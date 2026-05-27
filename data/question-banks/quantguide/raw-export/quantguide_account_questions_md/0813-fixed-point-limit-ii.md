# QuantGuide Question

## 813. Fixed Point Limit II

**Metadata**

- ID: `lk3USJxfrEujj62AMsvZ`
- URL: https://www.quantguide.io/questions/fixed-point-limit-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel, WorldQuant
- Source: tqd
- Tags: Discrete Random Variables, Limit Theorems
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-17 20:48:35 America/New_York
- Last Edited By: Gabe

### 题干

Let $F_n$ be the number of fixed points of a random permutation $f: S_n \rightarrow S_n$, where $S_n = \{1,2,\dots,n\}$. Find $\displaystyle \lim_{n \rightarrow \infty}\mathbb{P}[F_n = 5]$. The answer is in the form $\dfrac{c}{e}$, where $e$ is Euler's constant and $c$ is a constant. Find $c$.

### Hint

Think about Poisson Limit Theorem and the approximate distribution of $F_n$ for large $n$.

### 解答

For large $n$, the distribution of $F_n \approx \text{Binom}(n,1/n)$ because each of the $n$ values has probability $1/n$ of being mapped to itself. However, each value being a fixed point are not independent events, as knowledge of one being fixed increases the probability of another being fixed. However, for large $n$, the change is so small that it is nearly independent. One can make this argument rigorous to show that the (formal) conditions of the Poisson Limit Theorem apply. Since Poisson Limit Theorem applies, we can conclude that as $n \rightarrow \infty$, $F_n \implies \text{Poisson}(1)$ (this means convergence in distribution). Therefore, $\mathbb{P}[F_n = 5]$ will converge to $\dfrac{1}{5!}e^{-5}$, so our answer is $\dfrac{1}{120}$.

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
    "difficulty": "medium",
    "hasEdits": false,
    "id": "lk3USJxfrEujj62AMsvZ",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 20:48:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6659818,
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
    "title": "Fixed Point Limit II",
    "topic": "probability",
    "urlEnding": "fixed-point-limit-ii",
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
    "difficulty": "medium",
    "id": "lk3USJxfrEujj62AMsvZ",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Fixed Point Limit II",
    "topic": "probability",
    "urlEnding": "fixed-point-limit-ii"
  }
}
```
