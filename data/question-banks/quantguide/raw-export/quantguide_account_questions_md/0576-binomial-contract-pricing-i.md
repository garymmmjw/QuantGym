# QuantGuide Question

## 576. Binomial Contract Pricing I

**Metadata**

- ID: `M5FK2x6zNduJUlVmS4b0`
- URL: https://www.quantguide.io/questions/binomial-contract-pricing-i
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-13 23:42:16 America/New_York
- Last Edited By: Gabe

### 题干

We want to price a derivatives contract on the underlying $S$, which has payoff $S_T^2$ at expiry, where $T = 2$. At each step, the underlying will either double or half. Assuming the initial price of the underlying is $S_0 = 5$, what is the time-$0$ price of the contract? 

### Hint

What are the potential final payoffs? Back-propagate. 

### 解答

First, we need to figure out the risk-neutral probabilities. We solve the following equation to determine these probabilities.

$$2q = (1-q)*0.5 = 1$$

This gives us $q = 1/3$. We can then find the final potential payoffs, we can either double twice, half twice, or double, then half. This gives us final underlying values of either $20, 5, 1.25$. We can square these to get the contract values. We can then use the risk-neutral probabilities to back-propagate to determine the initial value.

For example, for the first up-move, when the underlying has value $S_1 = 10$, we either will have $S_2 = 20$ or $S_2 = 5$. We have these contract values and can then calculate the expectation of the contract for this time and value. This gives us:

$$E_1 = \frac{1}{3}(400) + \frac{2}{3}(25) = 150$$

This can be repeated for the other values to get $E_0 = 56.25$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "56.25"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "M5FK2x6zNduJUlVmS4b0",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-13 23:42:16 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4618856,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Binomial Contract Pricing I",
    "topic": "finance",
    "urlEnding": "binomial-contract-pricing-i",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "M5FK2x6zNduJUlVmS4b0",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Binomial Contract Pricing I",
    "topic": "finance",
    "urlEnding": "binomial-contract-pricing-i"
  }
}
```
