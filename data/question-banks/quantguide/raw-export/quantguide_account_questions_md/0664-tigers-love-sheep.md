# QuantGuide Question

## 664. Tigers Love Sheep

**Metadata**

- ID: `P0hpQDGEuTW0JavAUVSk`
- URL: https://www.quantguide.io/questions/tigers-love-sheep
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Citadel
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-28 15:03:42 America/New_York
- Last Edited By: Gabe

### 题干

Tigers on this magical grass island are rational and prioritize survival first and eating sheep over grass second. Assume that at each time step, only one tiger can eat one sheep, and that tiger itself will become a sheep after it eats the sheep. One hundred tigers and one sheep are on the magic grass island. How many sheep are left?

### Hint

Begin with a simplified version of the problem. In the 1-tiger case, the tiger will eat the sheep since it does not need to worry about being eaten after.

### 解答

In the 1-tiger case, the tiger will eat the sheep since it does not need to worry about being eaten after. In the 2-tiger case, either tiger knows that if they eat the sheep, then they will be eaten by the other tiger once they become a sheep. Thus, neither tiger will eat the sheep. In the 3-tiger case, the sheep will be eaten since each tiger will realize that once it eats the sheep and turns into a sheep, there will be 2 tigers left, and neither tiger will eat in the 2-tiger case. In the 4-tiger case, each tiger understands that if it eats the sheep, then it will be eaten after turning into a sheep, since they know that the sheep is eaten in the 3-tiger case. Following this logic, we can naturally show that if the number of tigers is even, the sheep will not be eaten. If the number is odd, the sheep will be eaten.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "P0hpQDGEuTW0JavAUVSk",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-28 15:03:42 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5343865,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Tigers Love Sheep",
    "topic": "brainteasers",
    "urlEnding": "tigers-love-sheep",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "easy",
    "id": "P0hpQDGEuTW0JavAUVSk",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Tigers Love Sheep",
    "topic": "brainteasers",
    "urlEnding": "tigers-love-sheep"
  }
}
```
