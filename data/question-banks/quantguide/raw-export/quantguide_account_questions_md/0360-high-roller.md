# QuantGuide Question

## 360. High Roller

**Metadata**

- ID: `dBtZx3T32vm2wFthCdVC`
- URL: https://www.quantguide.io/questions/high-roller
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Games, Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-22 16:15:02 America/New_York
- Last Edited By: Gabe

### 题干

Two fair $6-$sided dice are rolled. You can either keep the product of the observed values or re-roll both dice once for $\$4$. What is your expected payout on this game under a rational strategy?

### Hint

What is the mean value of the dice rolls? What inequality needs to be satisfied to keep your rolls? It may help to draw out a table of the possible outcomes and the products corresponding to each.

### 解答

If $X$ and $Y$ represent the individual die outcomes, then $XY$ is our payout. By independence of the dice rolls, $\mathbb{E}[XY] = \mathbb{E}[X]\mathbb{E}[Y] = (3.5)^2 = \dfrac{49}{4}$. If we are to re-roll, then we know the expected value of our second roll would be $\dfrac{49}{4}$. Therefore, our strategy is to re-roll if our product is $8$ or less. This is because $8$ would be the first integer that is at least $4$ less than the mean product of the two dice, $\dfrac{49}{4}$.

$$$$

The probability we obtain a product of $8$ or less is $\dfrac{6 + 4 + 2 + 2 + 1 + 1}{36} = \dfrac{4}{9}$. We obtain these terms from looking at the ways to obtain a product at most $8$ by fixing the value of the first die. For example, if you have a $1$ on the first die, regardless of your other die value, you will have a product at most $8$, yielding $6$ combinations to our total. Therefore, we re-roll with probability $\dfrac{4}{9}$, in which our expected value is $\dfrac{49}{4} - 4 = \dfrac{33}{4}$ for the re-roll. Otherwise, we keep the value of the die. If we keep the value, by drawing out a table that has all the die rolls on the axes and the products at the intersection of rows and columns, one can find that the expected value of the die roll given that it is more than $8$ is $\dfrac{92}{5}$. Therefore, our expected value on the game is $\dfrac{4}{9} \cdot \dfrac{33}{4} + \dfrac{5}{9} \cdot \dfrac{92}{5} = \dfrac{125}{9}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "125/9"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "dBtZx3T32vm2wFthCdVC",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-22 16:15:02 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2780628,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "High Roller",
    "topic": "probability",
    "urlEnding": "high-roller",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "dBtZx3T32vm2wFthCdVC",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "High Roller",
    "topic": "probability",
    "urlEnding": "high-roller"
  }
}
```
