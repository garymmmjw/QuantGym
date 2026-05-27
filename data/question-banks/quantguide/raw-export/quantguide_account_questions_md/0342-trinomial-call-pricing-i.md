# QuantGuide Question

## 342. Trinomial Call Pricing I

**Metadata**

- ID: `AIr7QXM6TL462K4z72GJ`
- URL: https://www.quantguide.io/questions/trinomial-call-pricing-i
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-31 10:35:36 America/New_York
- Last Edited By: Gabe

### 题干

We want to price a European call option of strike $K = 8$ using a $1$-period trinomial tree. The initial stock price is $S_0 = 8$ and has a $50\%$ chance of having a $0\%$ increase, a $30\%$ chance of a $50\%$ decrease, and a $20\%$ chance of a $30\%$ increase. 

$$\\$$

What is the time-$0$ price of the option?

### Hint

Calculate an expectation

### 解答

First, note that the probabilities are given rather than calculating any risk-neutral probabilities. This is due to the fact that there are infinite probabilities that can be used (i.e the system of equations that needs to be solved has infinite solutions). To provide an exact answer, the probabilities must be provided for a trinomial model, when compared to the binomial model.

$$\\$$

We can see that the stock price has final values $10.4, 8, 4$. Of these, the option only has value when the stock price is $10.4$. More specifically, the call option will have value $S_T - K = 10.4 - 8 = 2.4$. The time-$0$ price is simply the expected value at time-$1$, which is just $0.2 * 2.4 = 0.48$.  

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      ".48"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "AIr7QXM6TL462K4z72GJ",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-31 10:35:36 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2605898,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Trinomial Call Pricing I",
    "topic": "finance",
    "urlEnding": "trinomial-call-pricing-i",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "AIr7QXM6TL462K4z72GJ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Trinomial Call Pricing I",
    "topic": "finance",
    "urlEnding": "trinomial-call-pricing-i"
  }
}
```
