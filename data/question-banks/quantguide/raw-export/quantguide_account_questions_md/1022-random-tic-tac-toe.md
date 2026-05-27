# QuantGuide Question

## 1022. Random Tic Tac Toe

**Metadata**

- ID: `bnIhbFy0UIId7Aeg545b`
- URL: https://www.quantguide.io/questions/random-tic-tac-toe
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG
- Source: Kaushik - TQD and some blog
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:59:31 America/New_York
- Last Edited By: Gabe

### 题干

We toss 3 pebbles at a tic-tac-toe board at the same time. Each of those pebbles will land in one of the nine squares of the board with uniform probability. What is the probability that the pebbles will land in such a way that they form a tic-tac-toe (all pebbles in a row either vertically, horizontally, or diagonally)?

### Hint

Each pebble doesn't have to be in a unique square!

### 解答

There are 8 ways to forma a tic-tac-toe (3 vertically, 3 horizontally, 2 diagonally). Including the permutations, we multiply by $3!$. Thus the total ways is $8*3! = 48$. Now we have to see how many different ways the pebbles can land on the board. 

$$$$

The first scenario is that they all land in distinct squares. Since there are 9 total squares and we pick 3 to be where the pebbles land, the total combinations are $\displaystyle \binom{9}{3} = 84$. Each of these combinations has $3!$ permutations in their order. Thus $84*3! = 504$. 

$$$$

Now we have to calculate the number of ways the pebbles could land in two distinct squares. Similar to the three square scenario, we choose two squares from the nine. Including permutations, the total number of arrangements with two squares is $\displaystyle \binom{9}{2}*3! = 216$. 

$$$$

Finally, all three pebbles can land in the same square which adds an extra 9 ways. Thus in total there are $504+216+9 = 729$ ways. Thus the probability is $$\dfrac{48}{729} = \dfrac{16}{243}$$


$$$$

Alternatively, a faster way to do this is to consider that there are $9*9*9 = 729$ total possibilities how each pebble lands. Since there are 8 winning patterns and each has $3!$ permutations, there are $\dfrac{8*3!}{729} = \dfrac{48}{729} = \dfrac{16}{243}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "16/243"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "bnIhbFy0UIId7Aeg545b",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:59:31 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8299962,
    "source": "Kaushik - TQD and some blog",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Random Tic Tac Toe",
    "topic": "probability",
    "urlEnding": "random-tic-tac-toe"
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "bnIhbFy0UIId7Aeg545b",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Random Tic Tac Toe",
    "topic": "probability",
    "urlEnding": "random-tic-tac-toe"
  }
}
```
