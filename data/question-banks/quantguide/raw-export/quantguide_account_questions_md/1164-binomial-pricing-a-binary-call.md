# QuantGuide Question

## 1164. Binomial Pricing a Binary Call

**Metadata**

- ID: `ILlsBYOkMjmxQBKtKoej`
- URL: https://www.quantguide.io/questions/binomial-pricing-a-binary-call
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-13 23:40:04 America/New_York
- Last Edited By: Gabe

### 题干

We want to find the fair-value of a European binary call on an underlying $S$ with initial value $S_0 = 4$. At each time step, the underlying can either grow by $90\%$ or shrink by $30\%$. At expiry ($T = 2$), the call will pay $1$ if $S > 2$ and $0$ otherwise. Round to $3$ decimal points.



### Hint

Find the risk-neutral probabilities and iterate backwards. 

### 解答

In order to price properly, we need to use risk-neutral probabilities. We solve the following equation to obtain the risk-neutral probability of up and down moves. In other words, our fair value is the expected future price. 

$$q*1.9 + (1-q)*.3 = 1$$

Solving for $q$, we get $q = .4375$. We can then populate the payoffs at $T = 2$ and iterate backwards. Our underlying will either become $14.44, 2.28, .36$. $2$ of which will have a payoff of $1$ and the other a payoff of $0$. Using these risk neutral probabilities, we can iterate backwards to get our expected future price. This value is $0.684$. Another interpretation is that this is the risk-neutral probability that the underlying ends with a value larger than $2$. 


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      ".684"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ILlsBYOkMjmxQBKtKoej",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-13 23:40:04 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9680499,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Binomial Pricing a Binary Call",
    "topic": "finance",
    "urlEnding": "binomial-pricing-a-binary-call",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "ILlsBYOkMjmxQBKtKoej",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Binomial Pricing a Binary Call",
    "topic": "finance",
    "urlEnding": "binomial-pricing-a-binary-call"
  }
}
```
