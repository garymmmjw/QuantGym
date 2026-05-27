# QuantGuide Question

## 646. Defeating Dragons

**Metadata**

- ID: `M9J18oZDRas2YfGEmNTG`
- URL: https://www.quantguide.io/questions/defeating-dragons
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG, Citadel
- Source: Kaushik - SIG Hiring Manager/"The Quant Guide"
- Tags: Events
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-3 09:36:12 America/New_York
- Last Edited By: Gabe

### 题干

A $3$-headed dragon is attacking your village! You, the mightiest of knights, are tasked with taking down this dragon with your trusty sword. The dragon is defeated if you chop off all of its heads. However, this dragon uses magic and has the ability to grow heads over time! If you attack the dragon, one of three events can happen. You either chop of $2$ of its heads, you chop of $1$ head (which will ALWAYS grow back), or you miss entirely and the dragon grows $1$ head. The probability you chop of $2$ heads and miss the dragon are the same (assuming the dragon has $2$ or more heads). You know that if the dragon has $5$ or more heads, the dragon is too strong for you to take care of (in which case you and the rest of the villagers will perish). What is the probability you defeat the dragon?

### Hint

How can we model the different states of this scenario?

### 解答

Since there are changing states to this situation, we need to employ a Markov Chain to answer this question. Each state is differentiated by the amount of heads the dragon has. Let $P_{x}$ be the probability you defeat the dragon when the dragon is at $x$ heads. We already know that $P_{0}=1$ and $P_{5}=0$, thus we need to make equations for every other state in between. Also, its important to notice you are either going to a state with two less, the same amount, or one more head. Since the probability of going down two heads is the same as one more head, the probability of each scenario happening is $\frac{1}{2}$ as if you repeat the same state, you'll still have to either go down two heads or up one head again. Also, when the dragon is at one head, you will either stay at the same number or increase the number of heads by one, so $P_{1}=P_{2}$. Every other state equation is as follows:
$$$$
$$P_{2} = \frac{1}{2}\cdot P_{0}+\frac{1}{2}\cdot P_{3}$$
$$$$
$$P_{3} = \frac{1}{2}\cdot P_{1}+\frac{1}{2}\cdot P_{4}$$
$$$$
$$P_{4} = \frac{1}{2}\cdot P_{2} + \frac{1}{3}\cdot P_{5}$$
$$$$
Solving all these equations, we obtain the answer of $P_{3} = \frac{3}{5}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/5"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "M9J18oZDRas2YfGEmNTG",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-3 09:36:12 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5184169,
    "source": "Kaushik - SIG Hiring Manager/\"The Quant Guide\"",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Defeating Dragons",
    "topic": "probability",
    "urlEnding": "defeating-dragons",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "id": "M9J18oZDRas2YfGEmNTG",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Defeating Dragons",
    "topic": "probability",
    "urlEnding": "defeating-dragons"
  }
}
```
