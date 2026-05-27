# QuantGuide Question

## 274. The Ten Cards

**Metadata**

- ID: `IC3zE9xD5qDhMxLMLD2r`
- URL: https://www.quantguide.io/questions/the-ten-cards
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: Puzzles and Curious probelms
- Tags: Games
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-1 09:54:01 America/New_York
- Last Edited By: Gabe

### 题干

Place any ten playing cards in a row face up. There are two players. The first player may turn face down any single card he chooses. Then the second player can turn face down any single card or any 2 adjacent cards. And so on. Thus the first player must turn face down a single, but afterwards either player may turn down either a single or two adjacent cards. The player who turns down the last card wins. Should the first or second player win? Answer $1$ for the first player or $2$ for the second player. 

### Hint

How can Player $1$ win? How can Player $2$ win? 

### 解答

Let $A$ denote the person who plays first, and $B$ denote the person who plays second. Let $O$ denote a card turned up, and $X$ denote a card turned down. There are $3$ ways $A$ can win. 

$$\\$$

For the third card: $A$ turns down the $3$rd from either end. This leaves: $00X0000000$. Whatever happens next, $A$ can always leave one of the following:

$$\begin{align*}
&000X000 \\
&00X00X0X0 \\
&0X00X000
\end{align*}$$
The order does not matter.

In the first case, $A$ copies in one triplet what $B$ does in the other triplet, until he gets the last card.

In the second case, $A$ similarly copies B until he gets the last card.

In the third case, whatever B does, $A$ can leave:

$$\begin{align*}
&0X0 \\ 
&0X0X0X0 \\ 
&00X00 \\
\end{align*}$$
and again the win is apparent.


Second Card: $A$ turns down the $2$nd from either end.

This leaves:

$$0X00000000$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "IC3zE9xD5qDhMxLMLD2r",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-1 09:54:01 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2111056,
    "source": "Puzzles and Curious probelms",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "The Ten Cards",
    "topic": "brainteasers",
    "urlEnding": "the-ten-cards",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "IC3zE9xD5qDhMxLMLD2r",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "The Ten Cards",
    "topic": "brainteasers",
    "urlEnding": "the-ten-cards"
  }
}
```
