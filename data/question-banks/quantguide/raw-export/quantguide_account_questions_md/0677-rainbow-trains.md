# QuantGuide Question

## 677. Rainbow Trains

**Metadata**

- ID: `foP9ECePJYN3nmL9umpg`
- URL: https://www.quantguide.io/questions/rainbow-trains
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Events
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-9 21:50:51 America/New_York
- Last Edited By: Gabe

### 题干

There are three train cars: a blue one, a red one, and a green one. This train has a conductor whose job is to disconnect the back train cars and put it in front. They can do this as many or as few times as they want.
If the three train cars are randomly ordered, what is the probability that the conductor can rearrange it into rainbow order? (Note: Here, rainbow order means red, then green, then blue).

### Hint

To be able to be arranged into rainbow order, the cars must be in cycle of $RGB$.

### 解答

Let us denote the colors 1, 2, and 3 such that a correct rainbow ordering of the cars is 123. There are $6!$ ways to order the three cars, and of those orders, only three preserve the rainbow order of the cars: 123, 231, and 312. Thus, the probability that the conductor can rearrange the order of the cars into rainbow order is:

$$\frac{3}{6!} = \frac{1}{2}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "foP9ECePJYN3nmL9umpg",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:50:51 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5474208,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Rainbow Trains",
    "topic": "probability",
    "urlEnding": "rainbow-trains",
    "version": 2
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "foP9ECePJYN3nmL9umpg",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Rainbow Trains",
    "topic": "probability",
    "urlEnding": "rainbow-trains"
  }
}
```
