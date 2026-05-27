# QuantGuide Question

## 431. Russian Roulette III

**Metadata**

- ID: `cbkobiEHuj7x00c7j7WP`
- URL: https://www.quantguide.io/questions/russian-roulette-iii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Jane Street, TransMarket Group
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-8 09:57:45 America/New_York
- Last Edited By: Gabe

### 题干

You're playing a game of Russian Roulette with a friend. The six-chambered revolver is loaded with two randomly placed bullets. Initially, the cylinder is spun to randomize the order of the chambers. The two of you take turns pulling the trigger until the person who fires the gun loses. Your friend goes first, and lives after the first trigger pull. You are then given the choice to either spin the barrel or not before pulling the trigger. What is the different in probability of you surviving between spinning and not spinning the barrel?

### Hint

Because your friend survived, if you don't spin, you lose a safe chamber. How can you use this to calculate the probability of survival given you don't spin?

### 解答

If you don't spin the barrel, the probability that you survive is $\frac{3}{5}$, since one of the safe chambers has already been pulled by your friend. If you do spin the barrel, the probability that you survive is $\frac{4}{6}$, since any of the 6 chambers is possible, 2 of which are lethal. Thus, the difference in probability is: $$\frac{4}{6} - \frac{3}{5} = \frac{1}{15}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/15"
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
    "id": "cbkobiEHuj7x00c7j7WP",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:57:45 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3452818,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Russian Roulette III",
    "topic": "probability",
    "urlEnding": "russian-roulette-iii",
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
    "id": "cbkobiEHuj7x00c7j7WP",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Russian Roulette III",
    "topic": "probability",
    "urlEnding": "russian-roulette-iii"
  }
}
```
