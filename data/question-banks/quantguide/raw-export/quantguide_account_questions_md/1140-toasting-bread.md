# QuantGuide Question

## 1140. Toasting Bread

**Metadata**

- ID: `Xkskr9R9JPYZBmsWvWF4`
- URL: https://www.quantguide.io/questions/toasting-bread
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Your frying pan can hold up to three slices of bread for toasting. It takes one minute to toast one side of bread, and both sides of a slice of bread must be toasted in order for it to be considered toasted. Assuming that the time required to flip a slice of bread is negligible, how many minutes will it take you to toast four slices of bread?

### Hint

Think of the problem in terms of sides of bread, as opposed to entire slices of bread. Consider the idea that a slice of bread does not have to have its sides toasted consecutively.

### 解答

Denote the four slices of bread $A, B, C, D$ and their sides $A_1, A_2, B_1, B_2, ..., D_2$. For the first minute, you will toast $A_1, B_1,$ and $C_1$. For the second minute, you will toast $A_2, B_2$ and $D_1$. For the third and final minute, you will toast $C_2$ and $D_2$. More generally, if $M(x,y)$ is the number of minutes it takes to toast $x$ slices of bread on a pan that fits $y$ slices at once, then:$$M(x,y) = \lceil \frac{2x}{y} \rceil \forall x \geq 2, \forall y \geq 3$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "difficulty": "easy",
    "id": "Xkskr9R9JPYZBmsWvWF4",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9414485,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Toasting Bread",
    "topic": "brainteasers",
    "urlEnding": "toasting-bread"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "Xkskr9R9JPYZBmsWvWF4",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Toasting Bread",
    "topic": "brainteasers",
    "urlEnding": "toasting-bread"
  }
}
```
