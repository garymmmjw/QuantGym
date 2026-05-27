# QuantGuide Question

## 921. Last Light Bulb Standing

**Metadata**

- ID: `A8VqEzDhdpY6dUde8eJe`
- URL: https://www.quantguide.io/questions/last-light-bulb-standing
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: https://math.stackexchange.com/questions/3310820/probability-of-sum-of-exponentials-r-v-s-greater-than-an-exponential-r-v
- Tags: Continuous Random Variables, Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-16 16:32:27 America/New_York
- Last Edited By: Gabe

### 题干

Suppose you have $10$ independent light bulbs labelled $1-10$ whose lifetime is modelled by $T_i \sim \text{Exp}(1/10)$ for each $1 \leq i \leq 10$. Furthermore, suppose you have an $11$th light bulb whose lifetime is modelled by $X \sim \text{Exp}(1/90)$. Find $\mathbb{P}[X > T_1 + \dots + T_{10}]$. The answer is in the form $q^{b}$, where $0 < q < 1$ is a rational number and $b$ is an integer with $b$ maximal. Find $qb$. 

### Hint

Use a generalization of the memorylessness property for exponential random variables called the strong memorylessness property, which states that if $A$ and $B$ are independent non-negative random variables that are almost surely finite and $X \sim \text{Exp}(\lambda)$, then $\mathbb{P}[X > A+B \mid X > A] = \mathbb{P}[X > B]$.

### 解答

We are going to use a generalization of the memorylessness property for exponential random variables called the strong memorylessness property, which states that if $A$ and $B$ are independent non-negative random variables that are almost surely finite and $X \sim \text{Exp}(\lambda)$, then $\mathbb{P}[X > A+B \mid X > A] = \mathbb{P}[X > B]$. Note that this is not just the memorylessness property itself, as that deals with deterministic (non-random) times. Proving this is very similar to how you prove the standard memorylessness property. Assuming this and the standard property of exponentials that if $X_1 \sim \text{Exp}(\lambda_1)$ and $X_2 \sim \text{Exp}(\lambda_2)$, $\mathbb{P}[X_1 > X_2] = \dfrac{\lambda_2}{\lambda_1 + \lambda_2}$, we can complete this question fairly easily. For notation, let $S_n = \displaystyle \sum_{i=1}^n T_i$. Namely, we have that $$\mathbb{P}[X > S_{10}] = \mathbb{P}[X > S_{10} \mid X > S_{9}]\mathbb{P}[X > S_{9}] = \mathbb{P}[X > S_{9} + T_{10} \mid X > S_{9}]\mathbb{P}[X > S_{9}] = \mathbb{P}[X > T_{10}]\mathbb{P}[X > S_9]$$ The last equality comes from the strong memorylessness. Iterating this, we have that $$\mathbb{P}[X > S_{10}] = \mathbb{P}[X > T_{10}] \dots \mathbb{P}[X > T_1] = \left(\mathbb{P}[X > T_1]\right)^{10}$$ The last equality here comes from the fact that each of the $T_i$ are IID. Therefore, using the other property we stated at the beginning, $$\mathbb{P}[T_1 < X] = \dfrac{1/10}{1/10 + 1/90} = \dfrac{9}{10}$$ Therefore, $q = \dfrac{9}{10}$ and $b = 10$, so $qb = 9$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "9"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "A8VqEzDhdpY6dUde8eJe",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-16 16:32:27 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7552654,
    "source": "https://math.stackexchange.com/questions/3310820/probability-of-sum-of-exponentials-r-v-s-greater-than-an-exponential-r-v",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Last Light Bulb Standing",
    "topic": "probability",
    "urlEnding": "last-light-bulb-standing",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "A8VqEzDhdpY6dUde8eJe",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Last Light Bulb Standing",
    "topic": "probability",
    "urlEnding": "last-light-bulb-standing"
  }
}
```
