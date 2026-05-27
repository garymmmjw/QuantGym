# QuantGuide Question

## 111. 112 Appearance

**Metadata**

- ID: `yx0dd53pBHRMN14WyMrr`
- URL: https://www.quantguide.io/questions/112-appearance
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG
- Source: SIG OA
- Tags: Expected Value, Conditional Expectation
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 14:01:08 America/New_York
- Last Edited By: Gabe

### 题干

Suppose you roll a fair $6-$sided die until you either obtain a $2$ for the first time or $2$ consecutive $1$s. Find the expected number of rolls you perform.

### Hint

Let $\mu$ represent the mean number of rolled needed. Apply law of total expectation here to compute $\mu$ based on the first roll.

### 解答

Let $\mu$ represent the mean number of rolled needed. We are going to apply law of total expectation here to compute $\mu$ based on our first roll. If our first roll is $2$, we are done. If our first roll is $1$, then we only need one more $1$ until we are done. We will call the expected number of rolls to finish starting with a $1$ in our sequence $\mu_1$. Otherwise, we just are at our current state again. Together, these imply that $$\mu = \dfrac{1}{6} \cdot 1 + \dfrac{1}{6} \cdot (1 + \mu_1) + \dfrac{2}{3} \cdot (1 + \mu)$$
To compute $\mu_1$, note that rolling either a $1$ or $2$ will make the game finish in $1$ turn. Otherwise, we are back to the "nothing" state. Therefore, $$\mu_1 = \dfrac{1}{3} \cdot 1 + \dfrac{2}{3} \cdot (1 + \mu) = 1 + \dfrac{2}{3}\mu$$ Substituting this into the first equation, we get that $$\mu = 1 + \dfrac{1}{6} \cdot \left(1 + \dfrac{2}{3}\mu\right) + \dfrac{2}{3}\mu$$ Rearranging this yields $\dfrac{2}{9}\mu = \dfrac{7}{6}$, so $\mu = \dfrac{21}{4}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "21/4"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "yx0dd53pBHRMN14WyMrr",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:01:08 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 782110,
    "randomizable": "",
    "source": "SIG OA",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "112 Appearance",
    "topic": "probability",
    "urlEnding": "112-appearance"
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "yx0dd53pBHRMN14WyMrr",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "112 Appearance",
    "topic": "probability",
    "urlEnding": "112-appearance"
  }
}
```
