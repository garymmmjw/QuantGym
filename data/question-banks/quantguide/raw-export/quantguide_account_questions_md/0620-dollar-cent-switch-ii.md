# QuantGuide Question

## 620. Dollar Cent Switch II

**Metadata**

- ID: `jsQVDTOhTrtYreIARsDN`
- URL: https://www.quantguide.io/questions/dollar-cent-switch-ii
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: 536 problems
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A man entered a store and spent half of the money in his pocket. When he left, he had just as many cents as he had dollars when he went in and half as many dollars as he had cents when he went in. His pocket was not empty upon arriving. How much money did he have on him when he entered?

### Hint

Let $y$ be the number of cents that he had and $x$ be the number of dollars he had upon entry. Upon arrival, he had $x + 0.01y$ in his pocket. He spent half of his money and had $x$ cents and $\dfrac{y}{2}$ dollars upon leaving. This means that $\dfrac{1}{2} \cdot (x + 0.01y) = \dfrac{y}{2} + 0.01x$. We can immediately note that $y$ is even as he has exactly half as many cents.


### 解答

Let $y$ be the number of cents that he had and $x$ be the number of dollars he had upon entry. Upon arrival, he had $x + 0.01y$ in his pocket. He spent half of his money and had $x$ cents and $\dfrac{y}{2}$ dollars upon leaving. This means that $\dfrac{1}{2} \cdot (x + 0.01y) = \dfrac{y}{2} + 0.01x$. We can immediately note that $y$ is even as he has exactly half as many cents.

$$$$

There are two cases to consider here, which correspond to if $x$ is even or odd. In the first case, we would get that $\dfrac{x}{2} = \dfrac{y}{2}$, meaning $x = y$. However, we would also get that $0.005y = 0.01x$, meaning $y = 2x$. The only possible case where these happen simultaneously is if $x = y = 0$, but his pocket is not empty, so this can't be correct. Therefore, $x$ must be odd. In this case, we have $\dfrac{x-1}{2}$ dollars and $0.50 + 0.005y$ cents beforehand.

$$$$

In this case, we would get that $\dfrac{x-1}{2} = \dfrac{y}{2}$, meaning $y = x-1$. We would also get that $0.50 + 0.005y = 0.01x$. Substituting in $y = x-1$, this yields that $0.495 = 0.005x$, meaning $x = 99$. Therefore $y = 99 - 1 = 98$, so he had $99.98$ upon entering.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "99.98"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "jsQVDTOhTrtYreIARsDN",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 4904627,
    "source": "536 problems",
    "status": "published",
    "tags": [],
    "title": "Dollar Cent Switch II",
    "topic": "brainteasers",
    "urlEnding": "dollar-cent-switch-ii"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "jsQVDTOhTrtYreIARsDN",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Dollar Cent Switch II",
    "topic": "brainteasers",
    "urlEnding": "dollar-cent-switch-ii"
  }
}
```
