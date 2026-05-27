# QuantGuide Question

## 1131. Birthday Twins I

**Metadata**

- ID: `Yhd0sZgB2RZfgT1zDyzO`
- URL: https://www.quantguide.io/questions/birthday-twins-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Events
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-7 12:24:38 America/New_York
- Last Edited By: Gabe

### 题干

What is the probability that at least two people in a group of three friends were born on the same day of the week?

### Hint

The complement is that everyone is born on a distinct day of the week.

### 解答

Instead of trying to compute the probability that at least two people are born on the same day, it is easier to work with the complement, which is that everyone is born on a distinct day of the week. Then, all we need to do is subtract this probability from $1$ to get the probability of the event we are interested in. 

$$$$

The first friend has all $7$ days of the week available to them. The second has $6$ options since one is taken by the first friend. The last has $5$ days to select from, so the number of ways to pick the days of the week the people are born on with all days distinct is $7 \cdot 6 \cdot 5$. The total number of days to pick with no restriction is $7^3$. Therefore, the probability all days are distinct is $\dfrac{7\cdot 6 \cdot 5}{7^3} = \dfrac{30}{49}$. Therefore, the probability that at least two of the people share a birthday is $1 - \dfrac{30}{49} = \dfrac{19}{49}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "19/49"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Yhd0sZgB2RZfgT1zDyzO",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:24:38 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9350554,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Birthday Twins I",
    "topic": "probability",
    "urlEnding": "birthday-twins-i",
    "version": 2
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "Yhd0sZgB2RZfgT1zDyzO",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Birthday Twins I",
    "topic": "probability",
    "urlEnding": "birthday-twins-i"
  }
}
```
