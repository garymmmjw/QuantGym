# QuantGuide Question

## 387. Shuffled Deck

**Metadata**

- ID: `1LcGqQOtUicTUOwK8JqP`
- URL: https://www.quantguide.io/questions/shuffled-deck
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: andrews NT
- Tags: Pure Math
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-27 11:51:10 America/New_York
- Last Edited By: Gabe

### 题干

Suppose we have a standard deck of cards arranged in some order. We shuffle the cards by cutting the deck into two halves: Cards in positions $1-26$ and $27-52$. Then, we alternate cards from each half of the deck. Namely, the cards in positions $1-26$ are now in positions $2,4,\dots, 52$. and the cards in positions $27-52$ are now in positions $1,3,\dots, 51$. What is the minimum number of shuffles needed before the deck returns to it's original state?


### Hint

If a card starts in position $x$, after $1$ shuffle, the card will now be in position $y$, where $2x \equiv y \hspace{3pt} (\text{mod} \hspace{3pt} 53)$. Can $y$ ever be $0$? Iterate this logic.

### 解答

If a card starts in position $x$, after $1$ shuffle, the card will now be in position $y$, where $2x \equiv y \hspace{3pt} (\text{mod} \hspace{3pt} 53)$. Note that we never obtain the value $0$ as a position, as $2$ and $53$ are relatively prime, so we can say that $1 \leq y \leq 52$. Therefore, after $n$ shuffles, the card in position $x$ at the beginning is now in position $w$, where $2^nx \equiv w \hspace{3pt} (\text{mod} \hspace{3pt} 53)$. By the same logic, $1 \leq w \leq 52$. Therefore, we need to find the smallest $n$ such that $2^nx \equiv x \hspace{3pt} (\text{mod} \hspace{3pt} 53)$.

$$$$

As $53$ is prime, we can invert $x$ on both sides and say that it is the smallest $n$ such that $2^n \equiv 1 \hspace{3pt} (\text{mod} \hspace{3pt} 53)$. By Fermat's Little Theorem, we know that $2^{52} \equiv 2 \hspace{3pt} (\text{mod} \hspace{3pt} 53)$, as $53$ is prime. Inverting a $2$ on both sides yields that $n = 52$ works as a solution. One can also verify this is the minimum number of shuffles needed by noting that in the group $(\mathbb{Z}/p\mathbb{Z},\cdot)$, where $p$ is a prime, the order of all non-identity elements is $p-1$. This is a theorem from Abstract Algebra.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "52"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "1LcGqQOtUicTUOwK8JqP",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-27 11:51:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2993296,
    "source": "andrews NT",
    "status": "published",
    "tags": [
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Shuffled Deck",
    "topic": "brainteasers",
    "urlEnding": "shuffled-deck",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "1LcGqQOtUicTUOwK8JqP",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Shuffled Deck",
    "topic": "brainteasers",
    "urlEnding": "shuffled-deck"
  }
}
```
