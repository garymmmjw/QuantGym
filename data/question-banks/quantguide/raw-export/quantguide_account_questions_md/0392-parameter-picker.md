# QuantGuide Question

## 392. Parameter Picker

**Metadata**

- ID: `YBVe9fbKm5SDwhOzwyCB`
- URL: https://www.quantguide.io/questions/parameter-picker
- Topic: probability
- Difficulty: medium
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $X \sim \text{Beta}(a,b)$ for some unknown parameters $a$ and $b$. Suppose we know that for some $c,d \in \mathbb{R}$, the support of $Y = cX + d$ is $[-0.02,0.04]$, $\mathbb{E}[Y] = \dfrac{1}{400}$, and Var$(Y) = \dfrac{3}{32000}$. What is $a-b$?

### Hint

Use the new support to find $c$ and $d$. Afterwards, use properties of mean and variance to relate our expression back to $X$.

### 解答

The easiest thing to first look at is the support. Note that our support of $Y$ is an interval of $0.06$ length, so this implies that $Y = 0.06X + b$, as the support of $X$ is normally an interval of length $1$. Then, note that it starts at $-0.02$, so $b = -0.02$, as this shifts the support to our desired interval of $[-0.02,0.04]$. In other words, we have that $Y = \dfrac{3X-1}{50}$. We have that $\mathbb{E}[Y] = \dfrac{3\mathbb{E}[X] - 1}{50} = \dfrac{1}{400}$, so $\mathbb{E}[X] = \dfrac{3}{8}$. Then, we have that Var$(Y) = \dfrac{9}{2500}\text{Var}(X) = \dfrac{3}{32000}$, so Var$(X) = \dfrac{5}{192}$. Plugging in the expressions for $\mathbb{E}[X]$ and Var$(X)$ in terms of $a$ and $b$, $\dfrac{a}{a+b} = \dfrac{3}{8}$ and $\dfrac{ab}{(a+b)^2(a+b+1)} = \dfrac{5}{192}$. Note that $\dfrac{ab}{(a+b)^2} = \left(\dfrac{a}{a+b}\right)\left(1 - \dfrac{a}{a+b}\right) = \mathbb{E}[X](1 - \mathbb{E}[X]) = \dfrac{3}{8} \cdot \dfrac{5}{8} = \dfrac{15}{64}$. Thus, $\dfrac{15}{64} \cdot \dfrac{1}{a+b+1} = \dfrac{5}{192}$. In other words, $a+b+1 = 9$, so $a+b = 8$. Therefore, $\dfrac{a}{a+b} = \dfrac{a}{8} = \dfrac{3}{8}$, so $a = 3$. Plugging back in, since $a+ b = 8$, $b = 8-a = 5$. Therefore, $a-b=3-5=-2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-2"
    ],
    "difficulty": "medium",
    "id": "YBVe9fbKm5SDwhOzwyCB",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 3039207,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Parameter Picker",
    "topic": "probability",
    "urlEnding": "parameter-picker"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "YBVe9fbKm5SDwhOzwyCB",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Parameter Picker",
    "topic": "probability",
    "urlEnding": "parameter-picker"
  }
}
```
