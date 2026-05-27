# QuantGuide Question

## 672. Optimal Bidders I

**Metadata**

- ID: `qePMu2YgpUZhpEBBttay`
- URL: https://www.quantguide.io/questions/optimal-bidders-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG
- Source: N/A
- Tags: Expected Value, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-13 11:48:03 America/New_York
- Last Edited By: Gabe

### 题干

Carter has come into contact with a bounty of gold. He takes it to an auction shop. The auction shop says that each person that bids will place a bid that is uniformly distributed between $\$500$ and $\$1000$. They also state that they can recruit people to bid for a price of $\$5$ per person. Assuming Carter selects the optimal number of people to bid on his gold, what is his expected payout?

### Hint

Write the expected payout as a function of $n$, the number of people that they recruit. Try to maximize it with respect to $n$.

### 解答

It is known that given $X_1,\dots, X_n \sim \text{Unif}(0,1)$ IID and $M_n = \text{max}\{X_1,\dots,X_n\}$, $\mathbb{E}[M_n] = \dfrac{n}{n+1} = 1 - \dfrac{1}{n+1}$. This also extends now to Unif$(500,1000)$, as this is just a scaling and shifting of a Unif$(0,1)$. Namely, if $X \sim \text{Unif}(0,1)$, $500X + 500 \sim \text{Unif}(500,1000)$. Therefore, if $M_n'$ is the maximum of $n$ IID Unif$(500,1000)$ random variables and $M_n$ is as above, $\mathbb{E}[M_n'] = 500\mathbb{E}[M_n] + 500 = 1000 - \dfrac{500}{n+1}$. The cost of obtaining $n$ people is $5n$. Therefore, our profit, which we can denote as $P_n$, is $P_n = M_n' - 5n$, so $\mathbb{E}[P_n] = \mathbb{E}[M_n'] - 5n = 1000 - \dfrac{500}{n+1} - 5n$. We want to find $n$ that maximizes this. Calling this function $f(n)$, we can treat $n$ as continuous and find the value of $n$ that maximizes it by taking the derivative and setting it equal to $0$.

$$$$

This means $f'(n) = \dfrac{500}{(n+1)^2} - 5 = 0$. Rearranging yields $(n+1)^2 = 100$, so as $n$ must be positive, $n = 9$ bidders gives us the maximal expected profit. Plugging this in, $\mathbb{E}[P_9] = 905$, which is our solution.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "905"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "qePMu2YgpUZhpEBBttay",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-13 11:48:03 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5403766,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Optimal Bidders I",
    "topic": "probability",
    "urlEnding": "optimal-bidders-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "qePMu2YgpUZhpEBBttay",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Optimal Bidders I",
    "topic": "probability",
    "urlEnding": "optimal-bidders-i"
  }
}
```
