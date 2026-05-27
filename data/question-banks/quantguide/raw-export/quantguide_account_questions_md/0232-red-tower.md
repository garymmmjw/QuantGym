# QuantGuide Question

## 232. Red Tower

**Metadata**

- ID: `HeLX8WMvt0QKB2LcKVoS`
- URL: https://www.quantguide.io/questions/red-tower
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: common question
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A tower of $12$ blocks tall is going to be comprised of either $1-$tall or $2-$tall red blocks. Assume you have at least $12$ of each type of block. How many different tower configurations can be made?

### Hint

Let $T_n$ be the number of $n-$tall towers that can be made using these blocks. We know that the last block in the tower is either $1-$tall or $2-$tall. Condition on the two cases. 

### 解答

Let $T_n$ be the number of $n-$tall towers that can be made using these blocks. We know that the last block in the tower is either $1-$tall or $2-$tall. We condition on the two cases. If the last block is $1-$tall, then there are $T_{n-1}$ valid towers stemming from this case. If the last block is $2-$tall, there are $T_{n-2}$ valid towers stemming from this case. Therefore, we have the recurrence relation $T_n = T_{n-1} + T_{n-2}$. 

$$$$

We need $2$ initial conditions, as this is a second-order recurrence. We can clearly see that $T_1 = 1$, as only a $1-$tall block works. Additionally, we see $T_2 = 2$, as we either have a $2-$tall block or two $1-$tall blocks stacked. Now, we see that this is just the Fibonacci Sequence shifted up $1$ term, as the Fibonacci sequence typically starts off with $T_1 = T_2 = 1$. Therefore, $T_n = F_{n+1}$. In particular, $T_{12} = F_{13} = 233$ by using the recurrence.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "233"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "HeLX8WMvt0QKB2LcKVoS",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 1833357,
    "source": "common question",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Red Tower",
    "topic": "probability",
    "urlEnding": "red-tower"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "HeLX8WMvt0QKB2LcKVoS",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Red Tower",
    "topic": "probability",
    "urlEnding": "red-tower"
  }
}
```
