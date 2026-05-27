# QuantGuide Question

## 931. Last Lightbulb

**Metadata**

- ID: `4XNPUKKRIj9icvk0zdUX`
- URL: https://www.quantguide.io/questions/last-lightbulb
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: https://math.stackexchange.com/questions/1731364/expected-value-of-the-max-of-three-exponential-random-variables?rq=1
- Tags: Continuous Random Variables, Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $X_1,X_2,X_3,X_4 \sim \text{Exp}(1)$ IID represent the lifetimes of $4$ lightbulbs before burning out. Find the expected time until the last lightbulb burns out.

### Hint

If $X_1,X_2,\dots,X_n \sim \text{Exp}(\lambda)$ IID, then $\text{min}\{X_1,\dots, X_n\} \sim \text{Exp}(n\lambda)$.

### 解答

We use the fact that if $X_1,X_2,\dots,X_n \sim \text{Exp}(\lambda)$ IID, then $\text{min}\{X_1,\dots, X_n\} \sim \text{Exp}(n\lambda)$. This is a good exercise to prove if you have not done so before. The time until the $4$th lightbulb burns out is equal to the sum of the times between lightbulb burnouts. Namely, let $T_1$ be the time until the first lightbulb burns out, $T_2$ be the time until the second lightbulb burns out after the first, $T_3$ be the time until the third lightbulb burns out after the second, and $T_4$ be the additional time until the last lightbulb burns out after. Then $S = T_1 + T_2 + T_3 + T_4$ represents the total time it takes until no lightbulbs are left. 

$$$$

$T_1 = \text{min}\{X_1,X_2,X_3,X_4\}$, as it is the time for the first lightbulb to die. Therefore, $T_1 \sim \text{Exp}(4)$ by our fact before and $\mathbb{E}[T_1] = \dfrac{1}{4}$. As the exponential distribution is memoryless, at the time the first dies, the remaining life of the other lightbulbs are still each $\text{Exp}(1)$ distributed. Without loss of generality, say lightbulb $4$ was the one that burned out. If $R_1,R_2,R_3 \sim \text{Exp}(1)$ IID represent the time after the first lightbulb burnt out until the next, Therefore, $T_2 = \text{min}\{R_1,R_2,R_3\}$, meaning $T_2 \sim \text{Exp}(3)$ by our fact before, meaning $\mathbb{E}[T_2] = \dfrac{1}{3}$. Continuing this same logic on two lightbulbs and the final lightbulb yields $\mathbb{E}[T_3]  =\dfrac{1}{2}$ and $\mathbb{E}[T_4] = 1$. By linearity of expectation, we get that $$\mathbb{E}[S] = 1 + \dfrac{1}{2} + \dfrac{1}{3} + \dfrac{1}{4} = \dfrac{25}{12}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "25/12"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "4XNPUKKRIj9icvk0zdUX",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 7614586,
    "randomizable": "",
    "source": "https://math.stackexchange.com/questions/1731364/expected-value-of-the-max-of-three-exponential-random-variables?rq=1",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Last Lightbulb",
    "topic": "probability",
    "urlEnding": "last-lightbulb"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "4XNPUKKRIj9icvk0zdUX",
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
    "title": "Last Lightbulb",
    "topic": "probability",
    "urlEnding": "last-lightbulb"
  }
}
```
