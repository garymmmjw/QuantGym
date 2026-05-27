# QuantGuide Question

## 308. Restack Rings

**Metadata**

- ID: `i8mFNPSlLCrte4YGRnfb`
- URL: https://www.quantguide.io/questions/restack-rings
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: Kaushik - HOTS
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-14 00:12:17 America/New_York
- Last Edited By: Gabe

### 题干

You have a three identical poles in front of you however one has rings in the form of a tower labeled $1-10$ ($1$ being on the top, then $2$, all the way down to $10$ on the bottom). You are trying to make this same tower on one of the other poles. There are a couple constraints though. You can not move more than one ring at a time and you can't have rings with higher numbers on top of smaller numbers. How many moves does it take to remake the tower on another pole? 

### Hint

Try and find a pattern with small $n$ rings. 

### 解答

Try to do this with smaller $n$. If there's only one ring, it only takes $1$ move. With two rings, it takes $3$ moves. With three rings, it takes $7$ moves. You will see, and can formally prove, that it will take $2^{n}-1$ moves to recreate the tower for any $n$. Plugging in $n=10$, we arrive at the answer $1023$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1023"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "i8mFNPSlLCrte4YGRnfb",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-14 00:12:17 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2397864,
    "source": "Kaushik - HOTS",
    "status": "published",
    "tags": [],
    "title": "Restack Rings",
    "topic": "brainteasers",
    "urlEnding": "restack-rings",
    "version": 4
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "i8mFNPSlLCrte4YGRnfb",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Restack Rings",
    "topic": "brainteasers",
    "urlEnding": "restack-rings"
  }
}
```
