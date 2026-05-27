# QuantGuide Question

## 899. Hide and Seek

**Metadata**

- ID: `IzEn9fHu3bLa7lVjV2Yi`
- URL: https://www.quantguide.io/questions/hide-and-seek
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:15:11 America/New_York
- Last Edited By: Gabe

### 题干

You are playing a game of hide-and-seek with two friends. While one of your friends counts, you and your other friend are given a chance to hide in one of five possible hiding spots. You are each allowed to pick a hiding spot, and are permitted to share a hiding spot. Your friend finishes counting and checks one of the five hiding spots.
Assuming that everyone's decisions are made uniformly at random, what are the chances that your friend does not find anyone in the first spot that they check?

### Hint

In order for the seeker to not find anyone in the first spot, you and your friend must be in one of the four other spots.

### 解答

In order for the seeker to not find anyone in the first spot, you and your friend must be in one of the four other spots. Thus, the probability that you and your friend are not caught in the first spot is:

$$\frac{4}{5} \times \frac{4}{5} = \frac{16}{25}$$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "16/25"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "IzEn9fHu3bLa7lVjV2Yi",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:15:11 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7370569,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Hide and Seek",
    "topic": "probability",
    "urlEnding": "hide-and-seek",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "IzEn9fHu3bLa7lVjV2Yi",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Hide and Seek",
    "topic": "probability",
    "urlEnding": "hide-and-seek"
  }
}
```
