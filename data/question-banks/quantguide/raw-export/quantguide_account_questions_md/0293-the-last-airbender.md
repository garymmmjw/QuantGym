# QuantGuide Question

## 293. The Last Airbender

**Metadata**

- ID: `xiZLXIxOKF1CkP14tzqG`
- URL: https://www.quantguide.io/questions/the-last-airbender
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Events
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-6 10:58:40 America/New_York
- Last Edited By: Gabe

### 题干

Four cards labelled water, earth, fire, and air are placed in front of you faced down. You flip each of the cards over one at a time. You win if you flip over both the air and water cards before the fire card. Otherwise, you lose. What is the probability that you win?

### Hint

The earth card is absent from our sample space and thus does not affect your probability of winning.

### 解答

The earth card is absent from our sample space and thus does not affect your probability of winning. Imagine ordering the remaining three cards in the order that you flip them- there are a total of $3!$ possible permutations. Of these permutations, favorable outcomes are those where the first two cards are air then water or water then air. Thus, the probability that you win is:
$$\frac{2}{3!}=\frac{1}{3}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "xiZLXIxOKF1CkP14tzqG",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-6 10:58:40 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2272078,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "The Last Airbender",
    "topic": "probability",
    "urlEnding": "the-last-airbender",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "xiZLXIxOKF1CkP14tzqG",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "The Last Airbender",
    "topic": "probability",
    "urlEnding": "the-last-airbender"
  }
}
```
