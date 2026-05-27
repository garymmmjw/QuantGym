# QuantGuide Question

## 1189. Bridge Crossing

**Metadata**

- ID: `xNet1ESJdvF2DwRFpUwa`
- URL: https://www.quantguide.io/questions/bridge-crossing
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG, Jane Street, Belvedere Trading
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-7 13:35:13 America/New_York
- Last Edited By: Gabe

### 题干

Alice, Bob, Charlie, and Daniel need to get across a river. The only way to cross the river is by an old wooden bridge, which holds at most two people at a time. Because it is dark, they can't cross the bridge without a lantern, of which they only have one. Each pair can only walk at the speed of the slower person. They need to get all of them across to the other side as quickly as possible. Alice takes 10 minutes to cross; Bob takes 5 minutes; Charlie takes 2 minutes; Daniel takes 1 minute. What is the minimum time to get all of them across to the other side?

### Hint

The key point is to realize that the person returning with the lantern does not have to be from the most recent pairing.

### 解答

The key point is to realize that the person returning with the lantern does not have to be from the most recent pairing. Another point to realize is that Alice and Bob should go together, and not in the first crossing- otherwise, one of them has to go back, which will take too long. Therefore, Charlie and Daniel should go across first, which takes two minutes. Then, send Daniel back with the lantern, which takes one minute. Alice and Bob go across, which takes ten minutes. Charlie returns with the lantern, which takes two minutes. Finally, Charlie and Daniel cross again, which takes two minutes, for a total of 17 minutes.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "17"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "xNet1ESJdvF2DwRFpUwa",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:35:13 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9873600,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Bridge Crossing",
    "topic": "brainteasers",
    "urlEnding": "bridge-crossing",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "id": "xNet1ESJdvF2DwRFpUwa",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Bridge Crossing",
    "topic": "brainteasers",
    "urlEnding": "bridge-crossing"
  }
}
```
