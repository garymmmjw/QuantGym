# QuantGuide Question

## 204. Uniform Order II

**Metadata**

- ID: `RkfUU5eJr5CeINbQPyv5`
- URL: https://www.quantguide.io/questions/uniform-order-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: og
- Tags: Continuous Random Variables, Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-19 12:41:09 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1,X_2,\dots,X_{20}$ be IID Unif$(0,1)$ random variables. Compute $\mathbb{P}[X_1 > X_{10} \mid X_{10} < X_{20}]$.

### Hint

Use the definition of conditional probability.

### 解答

By the definition of conditional probability, this is the same as $\dfrac{\mathbb{P}[X_1 > X_{10}, X_{20} > X_{10}]}{\mathbb{P}[X_{10} < X_{20}]}$. Since these random variables are exchangeable, we have that $\mathbb{P}[X_{10} < X_{20}]$ is just $\dfrac{1}{2}$, as either of the two random variables are equally likely to be larger than one another. For the numerator, that probability is really the same as the probability that $X_{10}$ is the smallest of $X_1,X_{10},X_{20}$. Since each of the three random variables are equally likely to be the smallest by exchangeability, the numerator is just $\dfrac{1}{3}$. Therefore, the probability in question is just $\dfrac{\frac{1}{3}}{\frac{1}{2}} = \dfrac{2}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "RkfUU5eJr5CeINbQPyv5",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-19 12:41:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1568097,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Uniform Order II",
    "topic": "probability",
    "urlEnding": "uniform-order-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "RkfUU5eJr5CeINbQPyv5",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Uniform Order II",
    "topic": "probability",
    "urlEnding": "uniform-order-ii"
  }
}
```
