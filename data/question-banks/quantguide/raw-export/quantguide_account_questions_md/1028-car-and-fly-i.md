# QuantGuide Question

## 1028. Car and Fly I

**Metadata**

- ID: `2GV1qZLhRHwEQalFYGCu`
- URL: https://www.quantguide.io/questions/car-and-fly-i
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: MSE
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-28 10:07:48 America/New_York
- Last Edited By: Gabe

### 题干

A road of length $400$ miles has two cars, say $A$ and $B$, starting at opposite ends of the road. Cars $A$ and $B$ respectively drive towards at each at constant rates of $120$ miles per hour and $60$ miles per hour. A fly starts on Car $B$ and flies towards Car $A$ at a rate of $180$ miles per hour. Then, once it hits Car $A$, it immediately starts to fly back to Car $B$ at the same rate. To the nearest minute, how long after the cars start driving will the fly return to Car $B$?

### Hint

Consider a number line where Car $A$ starts at $0$ and Car $B$ and the fly start at $400$. To return to Car $B$, the fly must reach Car $A$ and then return from $A$ to $B$. Starting from Car $B$, the fly and Car $A$ move towards each other at a relative rate of $180 + 60 = 240$ miles per hour. Where is $A$ once they meet?

### 解答

Consider a number line where Car $A$ starts at $0$ and Car $B$ and the fly start at $400$. To return to Car $B$, the fly must reach Car $A$ and then return from $A$ to $B$. Starting from Car $B$, the fly and Car $A$ move towards each other at a relative rate of $180 + 60 = 240$ miles per hour. 

$$$$

The fly and the car must travel a total of $400$ miles total to reach each other, as they start $400$ miles apart, so the amount of times that takes is $\dfrac{400}{240} = \dfrac{5}{3}$ hours, which is $100$ minutes. When the fly and Car $A$ meet, Car $A$ is now at location $100$ and Car $B$ has travelled $120 \cdot \dfrac{5}{3} = 200$ miles, so it is at location $200$. Therefore, Car $A$ and Car $B$ are now $100$ miles apart. Car $B$ and the fly move towards each other at the rate of $180 + 120 = 300$ miles per hour, so it will take $\dfrac{100}{300} = \dfrac{1}{3}$ hours for the fly to reach back to Car $B$, so this is an additional $20$ minutes. This means it takes a total of $120$ minutes for the fly to reach back.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "120"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "2GV1qZLhRHwEQalFYGCu",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-28 10:07:48 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8344582,
    "source": "MSE",
    "status": "published",
    "tags": [],
    "title": "Car and Fly I",
    "topic": "brainteasers",
    "urlEnding": "car-and-fly-i",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "2GV1qZLhRHwEQalFYGCu",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Car and Fly I",
    "topic": "brainteasers",
    "urlEnding": "car-and-fly-i"
  }
}
```
