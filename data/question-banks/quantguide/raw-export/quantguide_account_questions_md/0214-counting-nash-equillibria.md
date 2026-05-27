# QuantGuide Question

## 214. Counting Nash Equillibria

**Metadata**

- ID: `yO5TW5ODe6Ii4tKIfXQQ`
- URL: https://www.quantguide.io/questions/counting-nash-equillibria
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: Jane Street
- Source: Modified Jane Street type question
- Tags: Combinatorics, Games, Pure Math
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-21 13:40:11 America/New_York
- Last Edited By: Gabe

### 题干

A treasure chest is up for auction and there are $10$ participants participating in the auction. The value of the treasure chest is determined as follows: behind a curtain $20$ fair coins are independently flipped and for each head that shows, $\$1$ is added to the chest (participants cannot see behind the curtian but are aware of the way the chest is valued). 

Each person chooses a non-negative integer number of dollars to submit as a sealed bid. The chest goes to a uniformly random person who was among the highest bidders, in return for the amount bid and everyone else has their bid returned. Count how many pure Nash equilibria there are for this game. (You may assume everyone's utility for money is linear in the range $\$0$ to $\$10$.)
$$$$

$\textbf{Note:}$ A pure Nash equilibrium means the strategy of each player must choose a single bid value with probability $1$ (e.g. a player's strategy cannot be to bid $3$ with probability $0.4$ and bid $4$ with probability $0.6$). 

### Hint

Count the number of Nash Equilibria for which exactly $k$ people bid $\$10$. 

### 解答

Let's first simplify the valuation of the chest, since we are interested in Nash equilibria we are interested in a set of strategies such that a $\textbf{single}$ person cannot increase their $\textit{expected value}$ from the chest when everyone uses the Nash strategy. Therefore, we can simply think of the chest containing $\$10$ since this is the expected number of heads. Now we begin with the observation that if one person submits a $\$10$ bid, then all 10 players at best will have a 0 EV strategy. It is not hard to see the person bidding $\$10$ will be 0 EV since the chest is $\$10$ in expectation. As for the remaining 9 people, if any of them bid less than $ \$10$, they don't win or lose anything since the chest goes to the $\$10$ bidder and their bid is returned. If they bid exactly $\$10$ then again this is $0$ EV, and if they bid any more than $\$10$ their EV is negative so at best the remaining 9 people can do a 0 EV strategy.
$$$$
However, it might be in the interest of a person bidding $\$10$ to decrease their bid. Consider a strategy where all $9$ people will bid $\$9$, what should the last person do to maximize their EV? Bidding $\$10$ here is 0 EV as discussed before, but bidding $\$9$ is actually positive EV since there is a $\frac{1}{10}$ probability their $\$9$ bid wins the chest worth $\$10$ for netting them a $\$1$ profit. This motivates our first statement.
$$$$
$\textbf{Claim:}$ All people bidding $\$9$ is a Nash Equilibrium. 
$$$$
$\textbf{Proof:}$ The expectation of this strategy for a given person is $\$0.1$ as shown above. A given person cannot exceed this in expectation since bidding any higher will result in a zero or negative expectation and bidding any lower will result in zero expectation since they will never win the auction due to the other people bidding $\$9$.
$$$$

Now, we begin to generalize. Let's consider counting the number of Nash Equilibrium by the number of people who are bidding $\$10$. If there are only 0 people bidding $\$10$, then the only Nash Equilibrium that can exist is when all bid $\$9$, if there was someone who was not bidding $\$9$ then they could increase their expectation by bidding $\$9$. 
If there is only 1 person bidding $\$10$, then no such Nash equilibrium can exist since this person can increase their expectation by bidding $\$9$.
$$$$

If there are only 2 people bidding $\$10$, then we claim this is a Nash equilibrium because everyone's strategy has an expected value of 0 and no one can gain by deviating. In fact, this logic holds as long as there are $\mathit{ at~least }$ 2 people bidding $\$10$. Therefore, to count the total number of strategies let us reframe the problem. Let's denote a strategy as a 10-d tuple so $S = \{b_1, b_2, ..., b_{10}\}$ where $b_i$ denotes the $i-$th person's bid meaning $b_i \in \{\$0, \$1, ..., \$10\}$. To count the number of Nash Equilibria which correspond to at least 2 people bidding $\$10$ we count the complement. That is, the number of Nash Equilibria with at least 2 people bidding ten = $\underbrace{11^{10}}_{\text{all~strategies}} - \underbrace{10^{10}}_{\text{no~ten~bids}} - \underbrace{{10 \choose 1} 10^{9}}_{\text{one~ten~bids}} = 5937424601$. Lastly, we must add one in the case of all bids being $\$9$ giving us our final answer of $5937424602$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5937424602"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "yO5TW5ODe6Ii4tKIfXQQ",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-21 13:40:11 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1713989,
    "source": "Modified Jane Street type question",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Games"
      },
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Counting Nash Equillibria",
    "topic": "probability",
    "urlEnding": "counting-nash-equillibria",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "id": "yO5TW5ODe6Ii4tKIfXQQ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Games"
      },
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Counting Nash Equillibria",
    "topic": "probability",
    "urlEnding": "counting-nash-equillibria"
  }
}
```
