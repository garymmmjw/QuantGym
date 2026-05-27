# QuantGuide Question

## 370. 2 In A Row

**Metadata**

- ID: `tEDsVXu4CX5OdtqUd5Nb`
- URL: https://www.quantguide.io/questions/over-3-heads
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: og
- Tags: Discrete Random Variables, Games, Calculus
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-30 16:27:44 America/New_York
- Last Edited By: Gabe

### 题干

You have a coin where you can decide the probability $p$ of obtaining a heads before flipping the coin $4$ times. What value of $p$ maximizes the probability that you obtain exactly two consecutive heads in your $4$ flips? For example, $HHHT$ and $HHHH$ are not allowed, but $HHTH$ is allowed. The answer is in the form $\dfrac{a-\sqrt{b}}{c}$ for integers $a,b,$ and $c$ with $c$ minimal. Find $a + b + c$. 

### Hint

There are three cases to consider: $HHT-$, $THHT$, and $-THH$. Write the probability of these as a function of $p$ and then maximize with Calculus.

### 解答

There are three cases to consider: $HHT-$, $THHT$, and $-THH$, where the $-$ can be either $H$ or $T$. The probability of the first and last occurring are $p^2(1-p)$ each, as we obtain two heads and a tail in those respective orders. The probability of the second case is $p^2(1-p)^2$, as you must obtain two heads and two tails in that order. Therefore, if $f(p)$ represent our probability of this event as a function of $p$, $$f(p) = 2p^2(1-p) + p^2(1-p)^2 = p^4 - 4p^3 + 3p^2$$ To maximize $f(p)$, we take the derivative with respect to $p$ and set it equal to $0$. Namely, $$f'(p) = 4p^3 - 12p^2 + 6p = 2p(2p^2 - 6p+3) = 0 \iff p = \dfrac{6 \pm \sqrt{12}}{4}$$ Since $\dfrac{6+\sqrt{12}}{4} > 1$, we take the negative square root on this, and our answer is $p^* = \dfrac{3-\sqrt{3}}{2}$ after simplification. Thus, $a + b + c = 8$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "8"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "tEDsVXu4CX5OdtqUd5Nb",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 16:27:44 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2866930,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Games"
      },
      {
        "tag": "Calculus"
      }
    ],
    "title": "2 In A Row",
    "topic": "probability",
    "urlEnding": "over-3-heads",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "tEDsVXu4CX5OdtqUd5Nb",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Games"
      },
      {
        "tag": "Calculus"
      }
    ],
    "title": "2 In A Row",
    "topic": "probability",
    "urlEnding": "over-3-heads"
  }
}
```
