# QuantGuide Question

## 584. Casino Combo

**Metadata**

- ID: `Ek5NNmWWKifGzAsJue9H`
- URL: https://www.quantguide.io/questions/casino-combo
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Belvedere Trading
- Source: N/A
- Tags: Conditional Probability, Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-7 13:29:55 America/New_York
- Last Edited By: Gabe

### 题干

A fair $6-$sided die, a standard roulette wheel (has 38 values with two zeroes and $1-36$), and a standard deck of cards are in a casino. Letting Aces count as ones, what is the probability that when the roulette wheel is spun, the die is rolled, and a card is dealt from the deck, all of them show the same value?

### Hint

How many possible values are there in common?1

### 解答

The die has the most restrictive values (only 1-6), so roll the die and let it land on one of the sides arbitrarily. The probability that we choose a card of that rank from the deck is $\dfrac{1}{13}$. The probability the roulette wheel lands on that value is $\dfrac{1}{38}$. Therefore, the probability, by independence, is $\dfrac{1}{13 \cdot 38} = \dfrac{1}{494}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/494"
    ],
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Ek5NNmWWKifGzAsJue9H",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:29:55 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4690635,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Casino Combo",
    "topic": "probability",
    "urlEnding": "casino-combo",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "id": "Ek5NNmWWKifGzAsJue9H",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Casino Combo",
    "topic": "probability",
    "urlEnding": "casino-combo"
  }
}
```
