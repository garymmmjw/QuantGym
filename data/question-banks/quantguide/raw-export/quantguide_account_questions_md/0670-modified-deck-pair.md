# QuantGuide Question

## 670. Modified Deck Pair

**Metadata**

- ID: `ODjOYyX2L4Zl2W29idhC`
- URL: https://www.quantguide.io/questions/modified-deck-pair
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: AIME
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Marissa has a deck of 40 cards: 4 1's, 4 2's, $\ldots$, 4 10's. A matching pair—2 cards with the same number—is removed from the deck without replacement. If Marissa randomly draws 2 more cards, what is the probability that she draws another matching pair? 

### Hint

You can get a matching pair by getting one of the ranks that didn't have a pair removed or by selecting the rank that did have the pair removed.

### 解答

If a matching pair has already been removed, then there are 38 cards remaining. There are 9 sets of 4 identically-numbered cards remaining, and 1 set of 2 identically-numbered cards remaining. The desired probability is simply 
\[
\begin{aligned}
    \frac{9\binom{4}{2} + 1}{\binom{38}{2}} = \frac{55}{703}.
\end{aligned}
\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "55/703"
    ],
    "difficulty": "easy",
    "id": "ODjOYyX2L4Zl2W29idhC",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 5378090,
    "source": "AIME",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Modified Deck Pair",
    "topic": "probability",
    "urlEnding": "modified-deck-pair"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "ODjOYyX2L4Zl2W29idhC",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Modified Deck Pair",
    "topic": "probability",
    "urlEnding": "modified-deck-pair"
  }
}
```
