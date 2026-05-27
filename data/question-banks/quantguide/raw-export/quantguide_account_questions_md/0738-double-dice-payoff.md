# QuantGuide Question

## 738. Double Dice Payoff

**Metadata**

- ID: `1LhMUgxS8QhpuIlL0ybu`
- URL: https://www.quantguide.io/questions/double-dice-payoff
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Jane Street
- Source: Kaushik - JS Glassdoor
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-14 00:41:50 America/New_York
- Last Edited By: Michael

### 题干

You roll two fair dice. If you get double $6$s, you receive $\$100$. If you get a $6$ and a non-$6$, you lose $\$x$. If you get anything else, you reroll both dice until you get double $6$s or a $6$ and non-$6$. What is the maximum value of $x$ where the game still has non-negative expected value?

### Hint

How does the probability you roll again related to the other outcomes?

### 解答

First we need to find the probability of every outcome. Double $6$s occur with probability $(\frac{1}{6})^2 = \frac{1}{36}$. We can count the number of $6$ and non-$6$ combos there are and you’ll see there are $10$ ($1$-$5$ on the first die and $6$ on the other with two different orderings). This gives that event a probability of $\frac{10}{36}$. Since the other event is just a recurrence of these two events, we can normalize the probabilities of the two events we care about. We do this by finding the probability of our target event and divide it with the probability of the non-recurrent events. So the probability of a double $6$s in this case can be updated to $\dfrac{\frac{1}{36}}{(\frac{1}{36} + \frac{10}{36})} = \frac{1}{11}$. This gives the probability the game ends in a $6$ and non $6$ of $\frac{10}{11}$. Finally, we can solve for $x$. The profit equation here is $100\cdot\frac{1}{11} - x\cdot\frac{10}{11}$ which has to be greater than or equal to $0$. Thus $\frac{100}{11} \geq \frac{10x}{11}$. The maximum value of $x$ is thus $\$10$. 


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "1LhMUgxS8QhpuIlL0ybu",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-14 00:41:50 America/New_York",
    "lastEditedBy": "Michael",
    "orderId": 6038141,
    "randomizable": "",
    "source": "Kaushik - JS Glassdoor",
    "status": "published",
    "tags": [],
    "title": "Double Dice Payoff",
    "topic": "probability",
    "urlEnding": "double-dice-payoff",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "id": "1LhMUgxS8QhpuIlL0ybu",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Double Dice Payoff",
    "topic": "probability",
    "urlEnding": "double-dice-payoff"
  }
}
```
