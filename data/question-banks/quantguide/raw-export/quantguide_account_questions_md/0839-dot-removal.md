# QuantGuide Question

## 839. Dot Removal

**Metadata**

- ID: `kMsZHYt04WiJXIrMxOPC`
- URL: https://www.quantguide.io/questions/dot-removal
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Jane Street
- Source: Varied
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A fair $6-$sided die has the values $1-6$ on the sides. The values of one of the sides (selected uniformly at random) is decreased by $1$. Find the probability an even value is rolled on this die.

### Hint

It is equally likely to select an even or odd value to decrease the value by $1$ on. Subtracting one turns the side into one of opposite parity.

### 解答

It is equally likely to select an even or odd value to decrease the value by $1$ on. Subtracting one turns the side into one of opposite parity. If we select an even value to decrease, with probability $\dfrac{2}{6} = \dfrac{1}{3}$ we roll an even value. If we select an odd value to decrease, with probability $\dfrac{4}{6} = \dfrac{2}{3}$ we roll an even value. Therefore, the total probability is $$\dfrac{\frac{1}{3} + \frac{2}{3}}{2} = \dfrac{1}{2}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "id": "kMsZHYt04WiJXIrMxOPC",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6888483,
    "randomizable": "",
    "source": "Varied",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Dot Removal",
    "topic": "probability",
    "urlEnding": "dot-removal"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "id": "kMsZHYt04WiJXIrMxOPC",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Dot Removal",
    "topic": "probability",
    "urlEnding": "dot-removal"
  }
}
```
