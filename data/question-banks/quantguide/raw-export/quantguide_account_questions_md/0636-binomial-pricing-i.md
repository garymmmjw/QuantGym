# QuantGuide Question

## 636. Binomial Pricing I

**Metadata**

- ID: `EXIz18BpLZ8O8AysXObz`
- URL: https://www.quantguide.io/questions/binomial-pricing-i
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-10-7 08:53:39 America/New_York
- Last Edited By: Gabe

### 题干

You have a stock, $S$, which has an initial price of $S_0 = 10$. You want to price a European call option with a strike of $K = 5$. The stock will either increase by $100\%$ or decrease by $50\%$. What is the price of the time-$0$ call option, $C_0$? Assume interest rates are $0$.

### Hint

Is the probability of the stock increasing by $100\%$ the same as the stock decreasing by $50\%$?

### 解答

First, we need to calculate the risk-neutral probabilities. We cannot assume that the stock has a $50\%$ chance of increasing by $100\%$ or decreasing by $50\%$. We setup the following equation:

$$2q + (1-q).5 = 1$$

This gives $q = 1/3$. We can now setup our one-period binomial pricing model. We know that the stock price can be either $S_1 = 20$ or $S_1 = 5$, depending on if we increase by $100\%$ or decrease by $50\%$. If we end at $S_1 = 20$, then we have an option payoff of $C_1 = 15$. Otherwise, we have an option payoff of $C_1 = 0$. We know the risk-neutral probabilities, so we can now calculate the fair price of our call option.

$$E(C_0) = \frac{1}{3}(15) + \frac{2}{3}(0) = 5$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "EXIz18BpLZ8O8AysXObz",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-7 08:53:39 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5056414,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Binomial Pricing I",
    "topic": "finance",
    "urlEnding": "binomial-pricing-i",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "EXIz18BpLZ8O8AysXObz",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Binomial Pricing I",
    "topic": "finance",
    "urlEnding": "binomial-pricing-i"
  }
}
```
