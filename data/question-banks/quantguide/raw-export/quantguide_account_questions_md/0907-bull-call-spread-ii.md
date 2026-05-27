# QuantGuide Question

## 907. Bull Call Spread II

**Metadata**

- ID: `BJaLwnvdOke07e2URdfz`
- URL: https://www.quantguide.io/questions/bull-call-spread-ii
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-15 09:25:54 America/New_York
- Last Edited By: Gabe

### 题干

Consider the following asset $S$, with initial price $S_0 = 7$. Now, let's look at a bull call spread with $K_1 = 5$ and $K_2 = 10$. We want to price the bull call spread, but we do not have access to a computer. The only information we know is that there exists a discount factor of $0.9$ and that the initial price is $7$. Give the best upper-bound for the price of this bull call spread. 



### Hint

Similar to pricing via replication, find a function that superreplicates the payoff. 

### 解答

Similar to pricing via replication, we can also establish bounds using replication when we cannot do a perfect replication. If we had the prices of the calls, we could calculate the exact price of the bull-call spread through exact replication. When we want to look at the best upper-bound, we want to find a replicate that super-replicates the portfolio $\textit{everywhere}$. In this case, the line $y = 5$ will give the best superreplication (from the given information). Since $5$ is a constant, it is essentially risk-free cashflow and we need to discount this by the discount factor.

Hence, we get obtain $0.9 * 5 = 4.5$.  

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4.5"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "BJaLwnvdOke07e2URdfz",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-15 09:25:54 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7446003,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bull Call Spread II",
    "topic": "finance",
    "urlEnding": "bull-call-spread-ii",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "BJaLwnvdOke07e2URdfz",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bull Call Spread II",
    "topic": "finance",
    "urlEnding": "bull-call-spread-ii"
  }
}
```
