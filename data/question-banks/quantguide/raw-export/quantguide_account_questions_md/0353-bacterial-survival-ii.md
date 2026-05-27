# QuantGuide Question

## 353. Bacterial Survival II

**Metadata**

- ID: `ePkt1FhJj3ICwoWDD76g`
- URL: https://www.quantguide.io/questions/bacterial-survival-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street, Morgan Stanley
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-13 10:29:55 America/New_York
- Last Edited By: Gabe

### 题干

There is one bacterium on a cell plate. After every minute, the bacterium may die, stay the same, split into two, or split into three with equal probabilities. Assuming all bacteria behave the same and independent of other bacteria, what is the probability that the bacterial population will die out? The answer is in the form $\sqrt{a} - b$ for integers $a$ and $b$. Find $a + b$.

### Hint

How can you derive the probability conditioned on what happens to the first bacterium at the next time step?

### 解答

Let $x$ be the probability that the bacterial population will die out. There are 4 total possibilities for the first bacterium: either it dies, stays the same, splits into two, or splits into three. In the first case, the bacterial population dies with probability 1. In the second case, the bacterial population dies with probability $x$, since the bacterial population dies when the bacterium that stays the same dies, which happens with probability $x$. In the third case, the bacterial population dies with probability $x^2$, as both bacteria that are formed must die in order for the population to die. In the fourth and final case, the bacterial population dies with probability $x^3$, as all three bacteria that are formed must die in order for the population to die. Thus, we can write $$x = \frac{1}{4} \times 1 + \frac{1}{4}x + \frac{1}{4}x^2 + \frac{1}{4}x^3 = \sqrt{2} - 1 \approx 0.41$$ Therefore, our answer is $2 + 1 = 3$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Morgan Stanley"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ePkt1FhJj3ICwoWDD76g",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-13 10:29:55 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2703461,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Bacterial Survival II",
    "topic": "probability",
    "urlEnding": "bacterial-survival-ii",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Morgan Stanley"
      }
    ],
    "difficulty": "medium",
    "id": "ePkt1FhJj3ICwoWDD76g",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Bacterial Survival II",
    "topic": "probability",
    "urlEnding": "bacterial-survival-ii"
  }
}
```
