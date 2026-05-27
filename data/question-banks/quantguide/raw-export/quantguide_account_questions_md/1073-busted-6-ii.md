# QuantGuide Question

## 1073. Busted 6 II

**Metadata**

- ID: `0kVUibOEoaFpeHACYbWt`
- URL: https://www.quantguide.io/questions/busted-6-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: js ceo edited
- Tags: Conditional Expectation, Games
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-17 13:17:04 America/New_York
- Last Edited By: Gabe

### 题干

Suppose you play a game where you continually roll a die until you obtain either a $5$ or a $6$. If you receive a $5$, then you cash out the sum of all of your previous rolls (excluding the $5$). If you receive a $6$, then you receive no payout. You also have the decision to cash out mid-game for the sum of all your previously obtained rolls. Assuming optimal play, what is your expected payout? Round your answer to the nearest hundredth.

### Hint

The optimal strategy will be to be stop once you have at least a sum of $k$ and roll again otherwise. The first goal is to find such a $k$. To do this, find the point at which you are indifferent to rolling again versus cashing out. Afterwards, set up a recursion to calculate the expected payout. 

### 解答

Our optimal strategy will be to be stop once we have at least a sum of $k$ and roll again otherwise. Our goal is to find such a $k$. To do this, we need to find the point at which we are indifferent to rolling again versus cashing out. If we currently have $k$ in the bank, then with probability $1/6$, we bust and get a payout of $0$. With probability $1/6$, we roll a $5$ and obtain a payout of $k$. Otherwise, if we don't roll either of those values, our bank increases by an average of $5/2$, as we roll a value $1-4$ uniformly at random. Therefore, we need to find $k$ such that $$\dfrac{1}{6} \cdot 0 + \dfrac{1}{6} \cdot k + \dfrac{2}{3} \cdot (k + 5/2) = k$$ This equation has the LHS represent the expected payout when rolling again and the RHS represent the expected payout when we stop. Solving this yields $k = 10$. 

$$$$

To compute the expected payout of the game, we can use a recursive approach. We set up the recursion here. The largest possible sum attainable under this strategy is $13$, as we would roll again on $9$ and obtain a $4$. Let $E_k$ be the expected payout when our current sum is $k$ under this strategy. We clearly have that $E_{13} = 13, E_{12} = 12, E_{11} = 11,$ and $E_{10} = 10$. For any $k < 10$, we can either cash out $k$ with probability $1/6$ (rolling a $5$), cash out nothing with probability $1/6$ (roll a $6$), or have an expected payout of $E_{k+1},E_{k+2},E_{k+3},$ or $E_{k+4}$ with probability $1/6$ each. Therefore, we have found that for $k < 10$, $$E_k = \dfrac{k + E_{k+1} + E_{k+2} + E_{k+3} + E_{k+4}}{6}$$ $E_0$ is the value we are interested in looking for, as we start with $0$ at the beginning. Using this recursion to recurse backwards to $0$, we get that $E_0 \approx 3.03$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3.03"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "0kVUibOEoaFpeHACYbWt",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-17 13:17:04 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8747364,
    "randomizable": "",
    "source": "js ceo edited",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Busted 6 II",
    "topic": "probability",
    "urlEnding": "busted-6-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "0kVUibOEoaFpeHACYbWt",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Busted 6 II",
    "topic": "probability",
    "urlEnding": "busted-6-ii"
  }
}
```
