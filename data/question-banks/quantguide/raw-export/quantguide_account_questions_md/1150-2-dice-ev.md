# QuantGuide Question

## 1150. Sum Over Min Die

**Metadata**

- ID: `8YOTHvNSbpHlYlSzsa62`
- URL: https://www.quantguide.io/questions/2-dice-ev
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: The brain
- Tags: Events, Discrete Random Variables, Expected Value
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-4 14:18:28 America/New_York
- Last Edited By: Gabe

### 题干

You have been tasked to find the expected value of a die game in which you are rolling $2$ dice at a time. Your first roll of the dice will all be summed up and will be your starting score. Your next, and final, roll of the $2$ dice will be your divisor, in which you are going to pick the optimal die out of the two to divide your total by, which will be your final score.
$$$$
Calculate the expected value of playing this game optimally.


### Hint

Split this into two parts, first EV of the sum of two dice, then EV of the min of two dice.

### 解答

The first thing we want to do is calculate the expected value of our starting score. Since the average value for a single dice roll is $3.5$, by linearity, the expected value of the sum is $2 \cdot 3.5 = 7$. Now we must calculate the $E_{min}$ of the two dice rolls, and store these values in a PMF for our final calculation.
$$$$
Following the same logic as Dice Order III, we can calculate our PMF as our sum EV divided by the min of the two dice, multiplied by the probability our divisor will be our minimum die:
$$\frac{1}{36} \cdot \dfrac{7}{6} + \frac{3}{36} \cdot \dfrac{7}{5} + \frac{5}{36}\cdot \frac{7}{4} + \frac{7}{36}\cdot \frac{7}{3} + \frac{9}{36}\cdot \frac{7}{2} + \frac{11}{36}\cdot \frac{7}{1} = \frac{2779}{720}$$
$$$$
For example, in order to get a $6$ as our minimum die, we need to roll a $6$ twice, yielding a $1/36$ chance, and then multiplied by $7/6$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2779/720"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "8YOTHvNSbpHlYlSzsa62",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 14:18:28 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9488151,
    "source": "The brain",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Sum Over Min Die",
    "topic": "probability",
    "urlEnding": "2-dice-ev",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "8YOTHvNSbpHlYlSzsa62",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Sum Over Min Die",
    "topic": "probability",
    "urlEnding": "2-dice-ev"
  }
}
```
