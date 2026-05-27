# QuantGuide Question

## 619. Soccer Bets

**Metadata**

- ID: `L0sCwFFWMIiBOFkKg5vA`
- URL: https://www.quantguide.io/questions/soccer-bets
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG, Optiver
- Source: SIG Quizlet (https://quizlet.com/542824675/sig-flash-cards/)
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-17 07:49:10 America/New_York
- Last Edited By: Gabe

### 题干

You are betting on the outcome of a soccer match. Team Quant has $2:1$ odds (you get $\$3$ back if you win, $\$2$ profit) and Team Guide has $3:1$ odds. You can also bet that both teams will tie which has $10:1$ odds. Let $A, B,$ and $C$ be the lowest round bet (can only bet whole dollars) amount you bet on Team Quant, Team Guide, and a tie respectively. Assume that if you are betting, you want to make the same amount no matter the outcome of the game. How much do you profit? If you shouldn’t bet on this game, enter $0$.

### Hint

Think about the payouts for each situational outcome.

### 解答

The best way to tackle this question is to look at the outcomes and make equations for the net amount given each case. For example, if Team Quant wins, your net value is $2A - B - C$, as you receive $2A$ profit, and then lose the $B$ you bet on Team Guide and the $C$ you bet on a tie. Repeating this logic, you obtain the following equations: 
$$
\begin{align*}
\text{If Team Quant wins:} \hspace{3pt} 2A-B-C\\
\text{If Team Guide wins:} \hspace{3pt} 3B-A-C\\
\text{If tie:} \hspace{3pt} 10C-A-B
\end{align*}
$$
Since we want our profit to be the same irrespective of the outcome, we need to make all these equations equal to each other. Solving these systems of equations, we get $A=44$, $B=33$, $C=12$ as the smallest even bets you can make. To double check, when we plug these values into the three equations we made, we seem to profit $43$ no matter the scenario. Thus, the answer is $43$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "43"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "L0sCwFFWMIiBOFkKg5vA",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 07:49:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4897559,
    "source": "SIG Quizlet (https://quizlet.com/542824675/sig-flash-cards/)",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Soccer Bets",
    "topic": "probability",
    "urlEnding": "soccer-bets",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "id": "L0sCwFFWMIiBOFkKg5vA",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Soccer Bets",
    "topic": "probability",
    "urlEnding": "soccer-bets"
  }
}
```
