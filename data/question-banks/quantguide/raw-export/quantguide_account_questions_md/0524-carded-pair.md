# QuantGuide Question

## 524. Carded Pair

**Metadata**

- ID: `SxSiE7gSOY4NIyFKHBLd`
- URL: https://www.quantguide.io/questions/carded-pair
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: Citadel, Five Rings
- Source: tqd
- Tags: Conditional Probability, Conditional Expectation
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-9 11:00:00 America/New_York
- Last Edited By: Gabe

### 题干

Cards are dealt one-by-one from a standard deck of $52$ cards without replacement. The card dealing ends when either $2$ kings appear OR at least $1$ king and $1$ ace appear, whichever comes first. Find the expected number of cards that are dealt in the game.

### Hint

Use a "first ace" approach and condition on whether or not the first card between king and ace to appear is king vs. ace. What needs to happen afterwards in each scenario?

### 解答

To observe either $2$ kings or $1$ king and $1$ ace, we need to condition on which of king or ace appears first in the deck. If king appears first, then we need to find the number of cards until we observe either a king or an ace. If ace appears first, then we need to find the number of cards until we observe a king. For the first king/ace to be drawn, it is equally likely to be either of them. From here on out, $K$ is king and $A$ is ace.

$$$$

First, we need to find the expected number of cards until the first $K$ or $A$ appears. We can use the First Ace methodology to use the dividers as $K$ or $A$, yielding $8$ dividers. These $8$ dividers divide the other $52-8 = 44$ cards into $9$ equally-sized regions in expectation, so there are $44/9$ cards on average before the first $K$ or $A$. Then, we need to add in $1$ card for actually picking that $K$ or $A$. 

$$$$

Now, with probability $1/2$, we selected $K$. In this case, we need to find the expected number of cards until either a $K$ or $A$ appears in the remaining deck. There are now $7$ dividers ($4$ $A$ and $3$ $K$) and $52 - 44/9 - 1 - 7 = 352/9$ cards left in the deck on average. Since there are $7$ dividers, there are now $8$ equally-sized regions in expectation, so the expected number of cards before observing the next $K$ or $A$ is $352/72$. Then, we must add in $1$ for selecting the $K$ or $A$, yielding a conditional expectation of $424/72$ in this case.

$$$$

With probability $1/2$, we selected $A$. In this case, we need to find the expected number of cards until a $K$ appears. There are now $4$ dividers (corresponding to the $4$ $K$) and $52 - 44/9 - 1 - 4 = 379/9$ cards left in the deck on average. The $4$ dividers split up our remaining deck into $5$ equally-sized regions in expectation, so there are $379/45$ cards before the first $K$ on average. Then, we need to add in $1$ more back for selecting the $K$, so our conditional expectation here is $424/45$.

$$$$

Putting it all together, our final answer is $$\dfrac{44}{9} + 1 + \dfrac{1}{2} \cdot \dfrac{424}{45} + \dfrac{1}{2} \cdot \dfrac{424}{72} = \dfrac{1219}{90} \approx 13.54$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1219/90"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "SxSiE7gSOY4NIyFKHBLd",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-9 11:00:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4171664,
    "source": "tqd",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Carded Pair",
    "topic": "probability",
    "urlEnding": "carded-pair",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "hard",
    "id": "SxSiE7gSOY4NIyFKHBLd",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Carded Pair",
    "topic": "probability",
    "urlEnding": "carded-pair"
  }
}
```
