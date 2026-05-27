# QuantGuide Question

## 724. Pricing Put Spread

**Metadata**

- ID: `gWAcYzrWzCHRhh92siFe`
- URL: https://www.quantguide.io/questions/pricing-put-spread
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 23:14:20 America/New_York
- Last Edited By: Gabe

### 题干

We have two puts: a put at strike $K_1 = 20$ and a put at $K_2 = 24$. We want to create a put spread. In other words, we will short the $K = 20$ put and long the $K = 24$ put. Find the best upper bound for the time-$0$ price of the spread. You have access to the underlying, with $S_0 = 23$ and bonds that pay $1$ at time-$T$ with initial price $B_0 = 0.9$. 

### Hint

What does the payoff of the spread look like? 

### 解答

We can plot the payout and see that the maximum payout is $4$ when $S_T < 20$. So, the best upper-bound at time-$T$ is $4$. By no arbitrage, this relationship must hold to time $t = 0$. Since this is a constant, this acts like a bond and we should apply the discount factor. This gives us our answer of $V_0 = 4 * 0.9 = 3.6$. 

This then gives us another no-arbitrage relationship for puts of different strikes: 

$$P(K_2) - P(K_1) \le (K_2 - K_1)B$$

where $K_2 > K_1$ and $B$ is the discount factor. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3.6"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "gWAcYzrWzCHRhh92siFe",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:14:20 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5904860,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Pricing Put Spread",
    "topic": "finance",
    "urlEnding": "pricing-put-spread",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "gWAcYzrWzCHRhh92siFe",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Pricing Put Spread",
    "topic": "finance",
    "urlEnding": "pricing-put-spread"
  }
}
```
