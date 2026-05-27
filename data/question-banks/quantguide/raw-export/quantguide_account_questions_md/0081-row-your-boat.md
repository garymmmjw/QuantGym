# QuantGuide Question

## 81. Row Your Boat

**Metadata**

- ID: `Ru4863cMy9h1xvWQRc6n`
- URL: https://www.quantguide.io/questions/row-your-boat
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG, Belvedere Trading
- Source: SIG OA
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 10:22:22 America/New_York
- Last Edited By: Gabe

### 题干

A group of friends travels in a canoe. They travel upstream from their campsite for three hours. After a while, they want to go back home. However, they travel five hours downstream and end up $32$ miles downstream below their initial campsite. The next morning, they travel back up the river to their campsite and arrive at $7$:$00$ PM. If the river flows downstream at a constant rate of $2$ miles per hour and the friends row their canoe at a constant speed, what time did they leave to go back home the next morning? Enter your answer in military time. For example, if the time is $4$:$30$ AM, then enter $430$ as your answer. If the answer is $4$:$30$ PM, enter $1630$ as your answer.

### Hint

Let $x$ be the constant rowing speed in miles per hour. When travelling upstream, they move at $x-2$ miles per hour because the stream opposes them. How about travelling downstream?

### 解答

The first order of business to find the speed at which the friends travelled. Let $x$ be this constant speed in miles per hour. When travelling upstream, they move at $x-2$ miles per hour because the stream opposes them. When travelling downstream, the move at $x+2$ miles per hour. Therefore, we have that $3(x-2) - 5(x+2) = -32$, as they travel upstream for $3$ hours and downstream for $5$ hours and end up $26$ miles below their initial spot. Solving for $x$ here yields $x = 8$. Therefore, as they travel upstream going back to the campsite the next morning, they will be travelling at $6$ miles per hour going back up. Therefore, it takes the friends $\dfrac{32}{6} = \dfrac{16}{3}$ hours to get back to their campsite. This is $5$ hours and $20$ minutes. This means they must have started at $1$:$40$ PM. Therefore, our answer is $1340$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1340"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "Ru4863cMy9h1xvWQRc6n",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:22:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 564236,
    "source": "SIG OA",
    "status": "published",
    "tags": [],
    "title": "Row Your Boat",
    "topic": "brainteasers",
    "urlEnding": "row-your-boat",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "medium",
    "id": "Ru4863cMy9h1xvWQRc6n",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Row Your Boat",
    "topic": "brainteasers",
    "urlEnding": "row-your-boat"
  }
}
```
