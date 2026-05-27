# QuantGuide Question

## 455. Identical Hands

**Metadata**

- ID: `A08y1ChrBtHOIkjGEt23`
- URL: https://www.quantguide.io/questions/identical-hands
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: https://math.stackexchange.com/questions/3755782/probability-that-every-player-gets-1-queen-jack-and-king?rq=1
- Tags: Events, Combinatorics
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-9 11:04:33 America/New_York
- Last Edited By: Gabe

### 题干

A dealer is dealing a deck with $12$ cards to $4$ players. The deck consists of $4$ Kings, $4$ Queens, and $4$ Jacks. What is the probability that every person receives the same hand of $1$ of each card?

### Hint

Figure out how many total combinations of deals there are, and then how many ways are there to give out all the kings, queens, and jacks correctly.

### 解答

This is going to boil down to a combinatorics problem. First let us determine the denominator, which is total combinations of cards that our dealer can give out. For our first player, he as $12$ cards and he is going to choose $3$ of them to give, yielding our first term as $12\choose3$. Similarly for the second player, there are $9$ cards, and he will be giving out $3$ of them, so our denominator will then be multiplied by $9\choose3$. This pattern continues, yielding our denominator as $12 \choose 3$$\cdot $$9\choose3$$ \cdot$$ 6\choose3$$ \cdot$$ 3\choose3$.
$$$$
For our numerator, there are $4$ ways to choose the first king for the first player, $3$ ways to choose the second king for the second player, $2$ for the third, and $1$ for the last player. This pattern is similar for the queens and jacks, leaving our final equation as:
$$$$
\[
\frac{4! \cdot 4! \cdot 4!}{\binom{12}{3} \cdot \binom{9}{3} \cdot \binom{6}{3} \cdot \binom{3}{3}} = \frac{72}{1925}
\]


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "72/1925"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "A08y1ChrBtHOIkjGEt23",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-9 11:04:33 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3660643,
    "source": "https://math.stackexchange.com/questions/3755782/probability-that-every-player-gets-1-queen-jack-and-king?rq=1",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Identical Hands",
    "topic": "probability",
    "urlEnding": "identical-hands",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "A08y1ChrBtHOIkjGEt23",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Identical Hands",
    "topic": "probability",
    "urlEnding": "identical-hands"
  }
}
```
