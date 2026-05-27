# QuantGuide Question

## 17. Specific Card Pull II

**Metadata**

- ID: `em5TDR18r1lbbMMegL8A`
- URL: https://www.quantguide.io/questions/specific-card-pull-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: https://math.stackexchange.com/questions/4668608/probability-of-no-jack-queen-king-before-the-first-ace?rq=1
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-9 11:11:43 America/New_York
- Last Edited By: Gabe

### 题干

A deck of cards is shuffled well. The cards are dealt one-by-one, until the two of hearts appears. Find the probability that exactly one king, queen and jack appear before the two of hearts.

### Hint

How many cards are actually of interest in this scenario? Can we discard all uninteresting cards and therefore simplify the problem?

### 解答

We have $13$ cards of interest in this scenario, and we can ignore the other $39$. Initially, we have a $\frac{12}{13}$ chance to draw one of the cards that we need (being one of the $4$ kings, $4$ queens, or $4$ jacks). On our next draw, let's imagine we drew a king, then we have an $\frac{8}{12}$ chance to draw one of the cards that we need (being one of the $4$ queens or $4$ jacks). For our third draw, imagine we just drew a queen and the pattern continues, meaning we have a $\frac{4}{11}$ chance to draw one of the cards we need (being the $4$ jacks). For our last draw, we need the ace and just the ace, and we have a $\frac{1}{10}$ chance of doing so.
$$$$
Combining all of the above probabilities, we get $$\frac{12}{13} \cdot \frac{8}{12} \cdot \frac{4}{11} \cdot \frac{1}{10} = \frac{16}{715}$$

$$$$

For a more combinatorial approach, there are $3!$ ways to arrange around the jack, queen, and king that come before the two of hearts. There are $4$ ways to pick each of the suits from the three ranks above. After these three, the next card must be the two of hearts. Thus, there are $3! \cdot 4^3$ such sequences that satisfy our condition in the first four cards, and there are $13 \cdot 12 \cdot 11 \cdot 10$ total ways to draw the first four cards, so the probability is $$\dfrac{3! \cdot 4^3}{13 \cdot 12 \cdot 11 \cdot 10} = \dfrac{16}{715}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "16/715"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "em5TDR18r1lbbMMegL8A",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-9 11:11:43 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 150614,
    "source": "https://math.stackexchange.com/questions/4668608/probability-of-no-jack-queen-king-before-the-first-ace?rq=1",
    "status": "published",
    "tags": [],
    "title": "Specific Card Pull II",
    "topic": "probability",
    "urlEnding": "specific-card-pull-ii",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "em5TDR18r1lbbMMegL8A",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Specific Card Pull II",
    "topic": "probability",
    "urlEnding": "specific-card-pull-ii"
  }
}
```
