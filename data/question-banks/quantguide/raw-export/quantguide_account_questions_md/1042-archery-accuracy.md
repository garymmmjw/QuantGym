# QuantGuide Question

## 1042. Archery Accuracy

**Metadata**

- ID: `mTP6r6K2N2C7Q8kbAKaD`
- URL: https://www.quantguide.io/questions/archery-accuracy
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Citadel, Belvedere Trading
- Source: citadel oa
- Tags: Events
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 21:36:45 America/New_York
- Last Edited By: Gabe

### 题干

An archer is shooting at a dartboard. If she has a $\dfrac{3}{4}$ chance of hitting any given shot, find the probability that she hits at least one of her next three shots.

### Hint

The complementary event is that she misses all three of her shots.

### 解答

The complementary event is that she misses all three of her shots. This occurs with probability $\dfrac{1}{4}$ per shot, so the probability she misses all of the next three shots is $\dfrac{1}{4^3} = \dfrac{1}{64}$. Thus, the probability she makes at least one of the next three shots is $1 - \dfrac{1}{64} = \dfrac{63}{64}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "63/64"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "mTP6r6K2N2C7Q8kbAKaD",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 21:36:45 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8500220,
    "source": "citadel oa",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Archery Accuracy",
    "topic": "probability",
    "urlEnding": "archery-accuracy"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "id": "mTP6r6K2N2C7Q8kbAKaD",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Archery Accuracy",
    "topic": "probability",
    "urlEnding": "archery-accuracy"
  }
}
```
