# QuantGuide Question

## 1128. Generational Wealth I

**Metadata**

- ID: `gZrxcC0yiaftYyrY2Qcw`
- URL: https://www.quantguide.io/questions/generational-wealth-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables, Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Suppose that you generate a uniformly random number in the interval $(0,1)$. You can either keep this number or generate a new number once. Your payout is the last number generated. Find your expected payout under a rational strategy.

### Hint

What is the expected value of one generation? When would you want to generate another number based on that?

### 解答

The expected value of a Unif$(0,1)$ random variable is $\dfrac{1}{2}$. Therefore, if $X_1$ is the first number we generate, we would keep $X_1$ if $X_1 > \dfrac{1}{2}$. Otherwise, we generate $X_2 \sim \text{Unif}(0,1)$. The probability $X_1 < \dfrac{1}{2}$ is $\dfrac{1}{2}$, and our expected profit in this case is $\dfrac{1}{2}$, as our profit would be $X_2$. Otherwise, if $X_1 > \dfrac{1}{2}$, which also occurs with probability $\dfrac{1}{2}$, your expected profit is $\dfrac{3}{4}$, as given that we don't generate $X_2$, $X_1$ is uniform on $(0.5,1)$, which has mean $\dfrac{3}{4}$. Therefore, our expected payout of this game is $\dfrac{1}{2} \cdot \dfrac{1}{2} + \dfrac{1}{2} \cdot \dfrac{3}{4} = \dfrac{5}{8}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/8"
    ],
    "difficulty": "easy",
    "id": "gZrxcC0yiaftYyrY2Qcw",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9307872,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Generational Wealth I",
    "topic": "probability",
    "urlEnding": "generational-wealth-i"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "gZrxcC0yiaftYyrY2Qcw",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Generational Wealth I",
    "topic": "probability",
    "urlEnding": "generational-wealth-i"
  }
}
```
