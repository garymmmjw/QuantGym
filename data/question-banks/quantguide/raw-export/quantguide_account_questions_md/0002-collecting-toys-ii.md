# QuantGuide Question

## 2. Collecting Toys II

**Metadata**

- ID: `9lMYt4RZ35l5wKWV5g8h`
- URL: https://www.quantguide.io/questions/collecting-toys-ii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Optiver, Squarepoint Capital
- Source: N/A
- Tags: Expected Value
- Premium: False
- Solution Free: True
- Version: 4
- Last Edited: 2023-10-27 17:14:06 America/New_York
- Last Edited By: Gabe

### 题干

Every box of cereal contains one toy from a group of $5$ distinct toys, each of which is mutually independent from the others and is equally likely to be within a given box. How many distinct toys can you expect to collect if you bought $7$ boxes?

### Hint

Try to define indicator random variables as a way to utilize the linearity of expectation. Notice that each toy follows the same distribution, despite mutual dependence.

### 解答

Let $X$ be the number of distinct toys you collect from the set of 5 toys; we are looking for $E[X]$. $$$$Let $I_i$  ($i = 1,2,...,5$) be the indicator random variable where:$$I_i = \left\{   \begin{array}{ c l }    1 & \quad \textrm{if } \textrm{the $i$-th toy type exists in the set of seven boxes} \\    0                 & \quad \textrm{otherwise}  \end{array}\right.$$We can define $X$ as $\displaystyle X = I_1 + I_2 + ... + I_5 = \sum_{i=1} ^5 I_i$. For a particular toy type, the probability that it is not observed in the first box is $\frac{4}{5}$, and the probability that it is observed in none of the seven boxes is $(\frac{4}{5})^7$ since each box is independent. Therefore, the probability that it is observed in at least one of the seven boxes is $1 - (\frac{4}{5})^7$. Applying the linearity of expectation and the fact that each toy type follows the same distribution, we can solve for $E[X]:$$$E[X] = E\left[\sum_{i=1} ^5 I_i\right] = 5E[I_1] = 5 \times \left[1 \times \left(1 - \left(\frac{4}{5}\right)^7\right)+ 0 \times \left(\frac{4}{5}\right)^7\right] = \frac{61741}{15625}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "61741/15625"
    ],
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "9lMYt4RZ35l5wKWV5g8h",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": true,
    "lastEditedAt": "2023-10-27 17:14:06 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 12,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Collecting Toys II",
    "topic": "probability",
    "urlEnding": "collecting-toys-ii",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "hard",
    "id": "9lMYt4RZ35l5wKWV5g8h",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Collecting Toys II",
    "topic": "probability",
    "urlEnding": "collecting-toys-ii"
  }
}
```
