# QuantGuide Question

## 48. First Ace

**Metadata**

- ID: `OhJFwCK1ctmFEAolxqNU`
- URL: https://www.quantguide.io/questions/first-ace
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street, Citadel, Akuna, IMC, Optiver, Hudson River Trading
- Source: N/A
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-24 15:56:42 America/New_York
- Last Edited By: Gabe

### 题干

On average, how many cards in a normal deck of 52 playing cards do you need to flip over to observe your first ace?

### Hint

How can you use the linearity of expectation to distribute expectation across a sum of random variables, regardless of independence?

### 解答

The four aces are dispersed throughout the deck and cut the 48 remaining cards into 5 distinct sections, each of some random length $X_{i} \in [0, 48]$ where $1 \leq i \leq 5$; that is, $\displaystyle \sum_{i=1}^5 X_i = 48$. Furthermore, by symmetry, $E[X_1] = E[X_2] = \dots = E[X_5]$, as in the absence of any additional information, none of the sections is expected to be any larger or smaller than any other. Thus, by linearity of expectation:

$$E\left[\displaystyle \sum_{i=1}^5 X_i\right] = 5\times E[X_1] = 48 \Rightarrow E[X_1] = \frac{48}{5}$$

We have found that the expected number of cards in the first section is $\frac{48}{5}$, so we will observe the first ace on the next card. Hence, we expect to flip $\frac{48}{5}+1 = 10.6$ cards to observe the first ace.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10.6"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "IMC"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "OhJFwCK1ctmFEAolxqNU",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-24 15:56:42 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 338905,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "First Ace",
    "topic": "probability",
    "urlEnding": "first-ace",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "IMC"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "medium",
    "id": "OhJFwCK1ctmFEAolxqNU",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "First Ace",
    "topic": "probability",
    "urlEnding": "first-ace"
  }
}
```
