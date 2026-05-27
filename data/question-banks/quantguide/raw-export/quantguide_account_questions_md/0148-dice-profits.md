# QuantGuide Question

## 148. Dice Profits

**Metadata**

- ID: `Z1ghT3x25SmG1XSXjbrh`
- URL: https://www.quantguide.io/questions/dice-profits
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: N/A
- Source: N/A
- Tags: Games, Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:36:35 America/New_York
- Last Edited By: Gabe

### 题干

Suppose you have a fair $20-$sided die. You must select a number of times to re-roll the die (or to not re-roll) before seeing any of the outcomes. However, each re-roll costs $\$1$. When the rolling process is complete, you receive $\$M$, where $M$ is the maximum value that appeared among all your rolls. Assuming you re-roll an optimal amount of times, find the expected profit.

### Hint

Find the expected profit when we have $n$ total rolls i.e. $n-1$ re-rolls.  The profit after $n$ rolls would be $P_n = \text{max}\{X_1,\dots,X_n\} - (n-1)$. Find an expression for $\mathbb{E}[\text{max}\{X_1,\dots, X_n\}]$, and you should have a discrete expression dependent on $n$. Test a few values and see if you notice any type of criterion to determine the maximum value.

### 解答

Let us find the expected profit when we have $n$ total rolls i.e. $n-1$ re-rolls. Our profit after $n$ rolls would be $P_n = \text{max}\{X_1,\dots,X_n\} - (n-1)$, as we are paid the maximum of the $n$ rolls and we pay $n-1$ for the re-rolls. For convenience, let $M_n = \text{max}\{X_1,\dots,X_n\}$. We can use the property for non-negative integer-valued random variables that $\mathbb{E}[X] = \displaystyle \sum_{k=1}^{\infty} \mathbb{P}[X \geq k]$. As the largest possible value is $20$, we can say that $\displaystyle \mathbb{E}[M_n] = \sum_{k=1}^{20} \mathbb{P}[M_n \geq k]$. $$$$To evaluate $\mathbb{P}[M_n \geq k]$, it is easier to evaluate via the complement, as the maximum being less than a certain value means all of them are less than that value, and then we can use independence. Namely, as $M_n$ is integer-valued, $\mathbb{P}[M_n \geq k] = 1 - \mathbb{P}[M_n < k] = 1 - \mathbb{P}[M_n \leq k-1]$. $M_n$ being at most $k-1$ means all of $X_1,\dots, X_n$ are at most $k-1$. The probability this occurs for each roll is $\dfrac{k-1}{20}$. Therefore, $\mathbb{P}[M_n \geq k] = 1 - \left(\dfrac{k-1}{20}\right)^n$. Plugging this in, $$\mathbb{E}[M_n] = \displaystyle \sum_{k=1}^{20} \left(1 - \left(\dfrac{k-1}{20}\right)^n\right) = 20 - \dfrac{1}{20^n}\sum_{k=0}^{19} k^n$$ The summation comes from an index shift by $1$. Now, we have that $$\mathbb{E}[P_n] = \displaystyle \mathbb{E}[M_n] - (n-1) = (21 - n) - \dfrac{1}{20^n} \sum_{k=0}^{19} k^n$$ Our objective is to maximize this value. We can note that $\mathbb{E}[M_n - M_{n-1}]$, the increase in our expected value of consecutive roll numbers, decreases as $n$ increases. This is because the maximum grows with smaller and smaller probabilities each time. Therefore, if we can find where $\mathbb{E}[P_n]$ starts to decrease, we have found our maximum, as it will never rise after.$$$$The first few values by direct substitution and evaluating using our known summation formulas are $\mathbb{E}[P_1] = \dfrac{21}{2}, \mathbb{E}[P_2] = \dfrac{513}{40}, \mathbb{E}[P_3] = \dfrac{1079}{80}, \mathbb{E}[P_4] = \dfrac{1078667}{80000}$. Note that $\mathbb{E}[P_4] < \mathbb{E}[P_3]$, as $1079000 > 1078667$. Therefore, we should have $3$ total rolls (so 2 rerolls). This yields expected profit of $\dfrac{1079}{80}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1079/80"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "Z1ghT3x25SmG1XSXjbrh",
    "internalDifficulty": 4,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:36:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1107403,
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
    "title": "Dice Profits",
    "topic": "probability",
    "urlEnding": "dice-profits"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "Z1ghT3x25SmG1XSXjbrh",
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
    "title": "Dice Profits",
    "topic": "probability",
    "urlEnding": "dice-profits"
  }
}
```
