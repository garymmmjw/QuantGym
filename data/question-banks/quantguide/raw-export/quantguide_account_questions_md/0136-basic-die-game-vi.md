# QuantGuide Question

## 136. Basic Die Game VI

**Metadata**

- ID: `USS351tZ4k22b2e14u8i`
- URL: https://www.quantguide.io/questions/basic-die-game-vi
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street, Chicago Trading Company, Akuna, SIG, Citadel, Optiver, Hudson River Trading, DRW, Goldman Sachs, Belvedere Trading
- Source: js doc + MSE
- Tags: Games, Conditional Expectation, Expected Value
- Premium: False
- Solution Free: False
- Version: 7
- Last Edited: 2023-11-7 13:29:30 America/New_York
- Last Edited By: Gabe

### 题干

Alice rolls a fair $6-$sided die with the values $1-6$ on the sides. She sees that value showing up and then is allowed to decide whether or not she wants to roll again. Each re-roll costs $\$1$. Whenever she decides to stop, Alice receives a payout equal to the upface of the last die she rolled. Note that there is no limit on how many times Alice can re-roll. Assuming optimal play by Alice, what is her expected payout on this game?

### Hint

Let $v_k$ be the value of the game if you accept a roll of $k$ or more and re-roll otherwise. Our optimal strategy will be in this form because we can view each round of the game as an independent trial. Therefore, our strategy should be the same between trials.

### 解答

Let $v_k$ be the value of the game if you accept a roll of $k$ or more and re-roll otherwise. Our optimal strategy will be in this form because we can view each round of the game as an independent trial. Therefore, our strategy should be the same between trials. Then
$$
\begin{array}{lll}
v_1=(1 / 6)(1+2+3+4+5+6) & \Rightarrow & v_1=7 / 2\\
v_2=(1 / 6)\left(v_2-1\right)+(1 / 6)(2+3+4+5+6) & \Rightarrow & v_2=19 / 5\\
v_3=(2 / 6)\left(v_3-1\right)+(1 / 6)(3+4+5+6) & \Rightarrow & v_3=4 \\
v_4=(3 / 6)\left(v_4-1\right)+(1 / 6)(4+5+6) & \Rightarrow & v_4=4 \\
v_5=(4 / 6)\left(v_5-1\right)+(1 / 6)(5+6) & \Rightarrow & v_5=7 / 2 \\
v_6=(5 / 6)\left(v_6-1\right)+(1 / 6)(6) & \Rightarrow & v_6=1
\end{array}
$$

All of these are derived from the fact that if we obtain a value at least our minimum stopping value, we just stop immediately. Otherwise, we just go again and it is the same game but we lose $1$ in payout from the cost of the roll. Therefore, this means that our optimal EV is $4$.



### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Chicago Trading Company"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "USS351tZ4k22b2e14u8i",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:29:30 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 980730,
    "source": "js doc + MSE",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Basic Die Game VI",
    "topic": "probability",
    "urlEnding": "basic-die-game-vi",
    "version": 7
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Chicago Trading Company"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "medium",
    "id": "USS351tZ4k22b2e14u8i",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Basic Die Game VI",
    "topic": "probability",
    "urlEnding": "basic-die-game-vi"
  }
}
```
