# QuantGuide Question

## 590. Weird Die

**Metadata**

- ID: `t5cvMyBXol32QRw2i55F`
- URL: https://www.quantguide.io/questions/weird-die
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: og
- Tags: Discrete Random Variables, Conditional Probability, Calculus
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-28 20:28:23 America/New_York
- Last Edited By: Gabe

### 题干

A $6-$sided die shows the values $1-6$ with respective probabilities $1/6, 1/5 - x, 1/10 + 2x, 1/5-x, 1/6,$ and $1/6$. Find the value of $x$ that maximizes the probability of obtaining a sum of $7$ when you roll this die twice. 

### Hint

You can obtain a sum of $7$ by rolling a permutation of $(1,6), (2,5),$ or $(3,4)$. Write a function $p(x)$ that yields the probability of a sum of $7$ in $2$ rolls given $x$. Then, take the derivative to maximize.

### 解答

You can obtain a sum of $7$ by rolling a permutation of $(1,6), (2,5),$ or $(3,4)$. The probability of a permutation of $(1,6)$ is $2 \cdot 1/6 \cdot 1/6 = 1/18$. The probability of a permutation of $(2,5)$ is $2 \cdot 1/6 \cdot \left(1/5 - x\right)$. The probability of a permutation of $(3,4)$ is $(1/10 + 2x) \cdot (1/5 - x)$. Adding all of these and expanding, if $p(x)$ represents the probability of obtaining a sum of $7$ in $2$ rolls with $x$ as the input for our die, $$p(x) = -4x^2 + \dfrac{4}{15}x + \dfrac{73}{450}$$ We can use the formula $x^* = -\dfrac{b}{2a}$ to find the $x-$coordinate of the maximum. In particular, $x^* = -\dfrac{4/15}{-8} = \dfrac{1}{30}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/30"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "t5cvMyBXol32QRw2i55F",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-28 20:28:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4731803,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Calculus"
      }
    ],
    "title": "Weird Die",
    "topic": "probability",
    "urlEnding": "weird-die",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "t5cvMyBXol32QRw2i55F",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Calculus"
      }
    ],
    "title": "Weird Die",
    "topic": "probability",
    "urlEnding": "weird-die"
  }
}
```
