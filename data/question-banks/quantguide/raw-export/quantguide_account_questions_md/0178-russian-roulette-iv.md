# QuantGuide Question

## 178. Russian Roulette IV

**Metadata**

- ID: `i51xauraA9FmNQAyJfe1`
- URL: https://www.quantguide.io/questions/russian-roulette-iv
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Jane Street, TransMarket Group
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-8 09:57:54 America/New_York
- Last Edited By: Gabe

### 题干

You're playing a game of Russian Roulette with a friend. The six-chambered revolver is loaded with two consecutively placed bullets. Initially, the cylinder is spun to randomize the order of the chambers. Your friend goes first, and lives after the first trigger pull. You are then given the choice to either spin the barrel or not before pulling the trigger. What is the different in probability of you surviving between not spinning and spinning the barrel?

### Hint

Look at the two cases separately. What is the probability of surviving if you do not spin the barrel conditioned on your friend surviving?

### 解答

If you spin the barrel, the probability that you survive is $\frac{4}{6}$. If you don't spin the barrel, the probability that you survive is $\frac{3}{4}$. To understand this case, let us define the chambers 1-6 and further define chambers 5 and 6 to hold the two consecutive bullets, without loss of generality. Because our friend survives, we know that he shot either chambers 1, 2, 3, or 4. Of these 4 equal possibilities, only one of these leads to our loss (if he shot the fourth chamber, then the following is a bullet); hence, the probability of survival in this case is $\frac{3}{4}$ and the difference between these probabilities is: $$\frac{3}{4} - \frac{2}{3} = \frac{1}{12}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/12"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "i51xauraA9FmNQAyJfe1",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:57:54 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1385978,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Russian Roulette IV",
    "topic": "probability",
    "urlEnding": "russian-roulette-iv",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "id": "i51xauraA9FmNQAyJfe1",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Russian Roulette IV",
    "topic": "probability",
    "urlEnding": "russian-roulette-iv"
  }
}
```
