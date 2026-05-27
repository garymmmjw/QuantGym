# QuantGuide Question

## 967. Card Diff

**Metadata**

- ID: `aFSzz82BOvsrf8KtoJPA`
- URL: https://www.quantguide.io/questions/card-diff
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Jane Street
- Source: js
- Tags: Games
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-4 17:23:39 America/New_York
- Last Edited By: Gabe

### 题干

You have all the clubs from a standard deck ($13$ cards) and you can choose $2$ from the deck and get paid the product of their values. All face cards are considered to have value $0$ and Ace is considered to have value $1$. You can pay $\$1$ to reveal the difference of any two cards you choose. You can exercise this "difference" option between any two cards as many times as you would like. However, in the end, you must select two cards be to the ones you take the product of for your payout. Under a rational strategy, what is the maximum guaranteed profit you can achieve?

### Hint

Considering fixing your first card and differencing with the other $12$ cards. Can you optimize in any way?

### 解答

The claim here is that one can always locate the places of the $9$ and $10$ within $11$ card draws. Therefore, the payout would be $9 \cdot 10 - 11 = 79$.

$$$$

Suppose you pick one card. You start paying $\$1$ to reveal the difference between that card and each other card of the remaining $12$. We can split up into two cases: The first card you selected does have value $0$ or does not have value $0$.

$$$$

If the first card is a $0$, then at some point in the first $11$ differences, you will either two differences of $0$ (in which you completely identify your card as a $0$) and a difference of $9$ or you obtain a difference of $10$ (or both!). You would only need to spend $\$11$ at worst, as if one of the two scenarios doesn't occur in the first $11$ differences, we know that the $9$ or $10$ (whichever difference wasn't obtained) is the last card whose value you didn't difference yet. This means that in the worst case scenario you only need to ask for the difference between your card and $11$ more cards out of the $12$ total cards, which yields $\$11$ payment.

$$$$

If the value of the first card is not $0$, we know that there are $3$ cards with value $0$ still remaining in the deck. You can identify which card you picked as soon as you obtain $2$ face cards, as their values are $0$ and you would be told the same number twice. Therefore, in this case, you also need to pay only $\$11$ at most in order to be able to have full knowledge of where the $9$ and the $10$ are located.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "79"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "aFSzz82BOvsrf8KtoJPA",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 17:23:39 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7882931,
    "source": "js",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Card Diff",
    "topic": "brainteasers",
    "urlEnding": "card-diff",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "id": "aFSzz82BOvsrf8KtoJPA",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Card Diff",
    "topic": "brainteasers",
    "urlEnding": "card-diff"
  }
}
```
