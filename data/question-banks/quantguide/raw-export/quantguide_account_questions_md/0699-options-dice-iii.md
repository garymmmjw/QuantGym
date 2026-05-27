# QuantGuide Question

## 699. Option Dice III

**Metadata**

- ID: `lLLaLvjPMWv4PPvZpspF`
- URL: https://www.quantguide.io/questions/options-dice-iii
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Optiver, SIG, Old Mission, TransMarket Group
- Source: my brain
- Tags: Finance, Games
- Premium: False
- Solution Free: False
- Version: 9
- Last Edited: 2023-11-10 10:38:56 America/New_York
- Last Edited By: Gabe

### 题干

Pretend you have a simple options chain on the expected value of the product of two dice rolls. Make a $2$ unit wide market on the call at $19$.
$$$$
Enter your answer as the sum of the bid and ask. For example, if your market was $5$ @ $7$, you would enter $12$.

### Hint

Calculate the theoretical value of the call option, then make a market around that.

### 解答

First we need to calculate the true value of this call option. To do this, we first need to see how many combinations of dice rolls land us in profit. Listed in increasing order they are $(4,5)$, $(5,4)$, $(4,6)$, $(6,4)$, $(5,5)$, $(5,6)$, $(6,5)$, and $(6,6)$. With these combinations, a roll of $(4,5)$ or $(5,4)$ yields a profit of $1$ units ($20-19 = 2$) with a $\frac{2}{36}$ chance in doing so, and a roll of $(5,5)$ yields a profit of $6$ units ($25-19 = 6$) with a $\frac{1}{36}$ chance in doing so, a roll of $(5,6)$ or $(6,5)$ yields a profit of $11$ units ($30-19 = 11$) with a $\frac{2}{36}$ chance in doing so, and a roll of $(6,6)$ yields a profit of $17$ units ($36-19 = 17$) with a $\frac{1}{36}$ chance in doing so. Lastly, $(4,6)$ and $(6,4)$ yield profit of $5$ units ($24-19 = 5$) with probability $\frac{2}{36}$.
$$$$
Putting this all together we have $\frac{2}{36} \cdot1 + \frac{2}{36} \cdot 5 + \frac{1}{36} \cdot 6 + \frac{2}{36} \cdot 11 + \frac{1}{36} \cdot 17 = 19/12$, showing our contract should be priced at $19/12$.
$$$$
To make a $2-$wide market around this value, we buy $1$ unit cheaper than the theoretical value of $19/12$ and sell $1$ unit more expensive than $19/12$, which comes out to a market of $\frac{7}{12}$ @ $\frac{31}{12}$, and adding them together (the same as multiplying our theo by $2$) yields our final answer of $\frac{19}{6}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "19/6"
    ],
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Old Mission"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "lLLaLvjPMWv4PPvZpspF",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-10 10:38:56 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5726794,
    "source": "my brain",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Option Dice III",
    "topic": "finance",
    "urlEnding": "options-dice-iii",
    "version": 9
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Old Mission"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "medium",
    "id": "lLLaLvjPMWv4PPvZpspF",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Option Dice III",
    "topic": "finance",
    "urlEnding": "options-dice-iii"
  }
}
```
