# QuantGuide Question

## 909. Game Time

**Metadata**

- ID: `kbMv8dlJJ30yLYG17gBy`
- URL: https://www.quantguide.io/questions/game-time
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: classic question
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-30 21:30:17 America/New_York
- Last Edited By: Gabe

### 题干

$$38$ people are looking to see a tennis match. The match costs $\$5$ to enter. $19$ of the people only have $\$5$ bills, while the other $19$ only have $\$10$ bills. The cashier currently has no change. If the $38$ people arrange themselves in line completely at random, find the probability that all of the people can successfully purchase a ticket without reordering in line.

### Hint

When a person with a $\$5$ bill purchases a ticket, the cashier gains a $\$5$ bill. However, when a person with a $\$10$ bill purchases a ticket, the cashier loses a $\$5$ bill in change. What we are looking for in this scenario is the number of arrangements in which at any point, there have been more people with a $\$10$ bill purchasing the ticket than the $\$5$ bill. 

$$$$

A way to think about this problem is to let someone with a $\$5$ bill be an $($ and someone with a $\$10$ bill be a $)$.

### 解答

When a person with a $\$5$ bill purchases a ticket, the cashier gains a $\$5$ bill. However, when a person with a $\$10$ bill purchases a ticket, the cashier loses a $\$5$ bill in change. What we are looking for in this scenario is the number of arrangements in which at any point, there have been more people with a $\$10$ bill purchasing the ticket than the $\$5$ bill. 

$$$$

A way to think about this problem is to let someone with a $\$5$ bill be an $($ and someone with a $\$10$ bill be a $)$. The equivalent formulation of the problem above is to count the number of proper parenthesizations of $19$ $($ and and $19$ $)$. This is equivalent because of the fact that a proper parenthesization can't have more closing parentheses than opening parentheses at any point throughout. For example, in the $2$ opening and closing case, $(())$ and $()()$ are valid, but $)(()$ and $())($ are not valid. This problem is well-known to be solved by the Catalan numbers. In particular, the number of proper parenthesizations with $n$ opening and closing parentheses is $C_n = \dfrac{1}{n+1}\binom{2n}{n}$.

$$$$

In the above, we are only identifying people by their bill number. This means that there are $\displaystyle \binom{2n}{n}$ distinct arrangements of people in the line with $n$ of each type. Therefore, our final probability is just $\dfrac{1}{n+1}$ by division. In particular, $n = 19$ here, so the answer is $\dfrac{1}{20}$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/20"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "kbMv8dlJJ30yLYG17gBy",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-30 21:30:17 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7455305,
    "randomizable": "",
    "source": "classic question",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Game Time",
    "topic": "probability",
    "urlEnding": "game-time",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "kbMv8dlJJ30yLYG17gBy",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Game Time",
    "topic": "probability",
    "urlEnding": "game-time"
  }
}
```
