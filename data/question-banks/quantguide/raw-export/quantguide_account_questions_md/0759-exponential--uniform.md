# QuantGuide Question

## 759. Exponential + Uniform

**Metadata**

- ID: `2xDUAnMQIoIaMwWSWU6r`
- URL: https://www.quantguide.io/questions/exponential--uniform
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: https://math.stackexchange.com/questions/2551188/pv-gt-1-given-u-sim-operatornameunif0-1-x-sim-operatornameexpo1?rq=1
- Tags: Continuous Random Variables, Conditional Probability
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 11:41:23 America/New_York
- Last Edited By: Gabe

### 题干

Let $U \sim \text{Unif}(0,1)$ and $V \sim \text{Exp}(1)$ be independent. Find $\mathbb{P}[U + V > 1]$. The answer is in the form $a - e^b$ for integers $a$ and $b$. Find $ab$.

### Hint

The easiest way to do this is to condition on the value of $U$. This is because the exponential is a lot easier to deal with to find a tail probability.

### 解答

The easiest way to do this is to condition on the value of $U$. This is because the exponential is a lot easier to deal with to find a tail probability. The CDF of $V$ is given by $F_V(v) = 1 - e^{-v}$ for $v > 0$. Therefore, as $0 \leq U \leq 1$, $1-U$ is as well. Therefore, $$\mathbb{P}[U + V > 1] = \displaystyle \int_0^1 \mathbb{P}[U + V > 1 \mid U = u]f_U(u)du$$ where $f_U(u)$ is the PDF of $U$. This PDF is just $1$ on $(0,1)$, so we are fine. 

$$$$

$\mathbb{P}[U + V > 1 \mid U = u] = \mathbb{P}[V > 1-u] = 1 - F_V(1-u) = e^{-(1-u)} = e^{u-1}$. This means our answer is $\displaystyle \int_0^1 e^{u-1}du = 1 - e^{-1}$. The answer is then $1 \cdot (-1) = -1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "2xDUAnMQIoIaMwWSWU6r",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 11:41:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6194707,
    "source": "https://math.stackexchange.com/questions/2551188/pv-gt-1-given-u-sim-operatornameunif0-1-x-sim-operatornameexpo1?rq=1",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Exponential + Uniform",
    "topic": "probability",
    "urlEnding": "exponential--uniform"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "2xDUAnMQIoIaMwWSWU6r",
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
    "title": "Exponential + Uniform",
    "topic": "probability",
    "urlEnding": "exponential--uniform"
  }
}
```
