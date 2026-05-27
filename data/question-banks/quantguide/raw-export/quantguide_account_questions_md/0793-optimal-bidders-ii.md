# QuantGuide Question

## 793. Optimal Bidders II

**Metadata**

- ID: `NU964epp725LWvCPYvb8`
- URL: https://www.quantguide.io/questions/optimal-bidders-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG
- Source: N/A
- Tags: Continuous Random Variables, Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-13 11:47:52 America/New_York
- Last Edited By: Gabe

### 题干

Carter has come into contact with a bounty of gold. He takes it to an auction shop. The auction shop says that each person that bids will place a bid that is uniformly distributed between $\$500$ and $\$1000$. They also state that they can recruit people to bid for a price of $\$10$ per person. However, the auction shop also states that Carter will only receive the payment of the second highest bid. Assuming Carter selects the optimal number of people to bid on his gold, what is his expected payout?

### Hint

Write the expected payout as a function of $n$, the number of people that they recruit. Try to maximize it with respect to $n$.

### 解答

It is known that given $X_1,\dots, X_n \sim \text{Unif}(0,1)$ IID and $S_{i,n}$ is the $i$th smallest, $1 \leq i \leq n$, among $X_1,\dots, X_n$, $\mathbb{E}[S_{i,n}] = \dfrac{i}{n+1}$. This also extends now to Unif$(500,1000)$, as this is just a scaling and shifting of a Unif$(0,1)$. Namely, if $X \sim \text{Unif}(0,1)$, $500X + 500 \sim \text{Unif}(500,1000)$. Therefore, if $S_{i,n}'$ is the $i$th smallest among $n$ IID Unif$(500,1000)$ random variables and $S_{i,n}$ is as above, $\mathbb{E}[S_{i,n}'] = 500\mathbb{E}[S_{i,n}] + 500 = 500 + \dfrac{500i}{n+1}$. In this case, $i = n-1$, as we are paid out the second largest bid, so the expected payout with $n$ people is $500 + 500\dfrac{n-1}{n+1} = 1000\left(1 - \dfrac{1}{n+1}\right)$. The cost of obtaining $n$ people is $10n$. Therefore, our profit, which we can denote as $P_n$, is $P_n = S_{i,n}' - 10n$, so $\mathbb{E}[P_n] = \mathbb{E}[S_{i,n}'] - 10n = 1000\left(1 - \dfrac{1}{n+1}\right) - 10n$. We want to find $n$ that maximizes this. Calling this function $f(n)$, we can treat $n$ as continuous and find the value of $n$ that maximizes it by taking the derivative and setting it equal to $0$.

$$$$

This means $f'(n) = \dfrac{1000}{(n+1)^2} - 10 = 0$. Rearranging yields $(n+1)^2 = 100$, so as $n$ must be positive, $n = 9$ bidders gives us the maximal expected profit. Plugging this in, $\mathbb{E}[P_9] = 810$, which is our solution.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "810"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "NU964epp725LWvCPYvb8",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-13 11:47:52 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6464156,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Optimal Bidders II",
    "topic": "probability",
    "urlEnding": "optimal-bidders-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "NU964epp725LWvCPYvb8",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Optimal Bidders II",
    "topic": "probability",
    "urlEnding": "optimal-bidders-ii"
  }
}
```
