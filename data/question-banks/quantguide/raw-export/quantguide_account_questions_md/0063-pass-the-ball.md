# QuantGuide Question

## 63. Pass the Ball

**Metadata**

- ID: `p5wSO9WmKQcYkWb6Sjka`
- URL: https://www.quantguide.io/questions/pass-the-ball
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: DRW
- Source: Kaushik - DRW Interview
- Tags: Events
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-19 12:54:48 America/New_York
- Last Edited By: Gabe

### 题干

You and $4$ other people are sitting in a circle. You are given a ball to start the game. Every second of this game, the person with the ball has three choices they can make. They can either pass the ball to the left, pass the ball to the right, or keep the ball (all with equal probability). This game goes on till someone keeps the ball. What is the probability that you are the person to end the game and keep the ball?

### Hint

Consider the states of this problem.

### 解答

We can use Markov states to solve this question. You'll notice there is some symmetry in this problem that will allow us to solve this question with less states. The symmetry is in the placement of the other people. For example, the two people immediately next to you can be treated as the same state functionally (since they both behave the exact same), and the two people furthest from you are also functionally the same (again, since they both behave the exact same). Let $P_{1}$ be the probability you end with the ball. Let $P_{2}$ be the probability that someone immediately next to you has the ball and you are the one to end the game. Finally, let $P_{3}$ be the probability that someone furthest from you has the ball and you are the one to end the game. The equations for the states are as follows:
$$$$
$$P_{1} = \frac{1}{3}+\frac{2}{3}P_{2}$$
$$$$
$$P_{2} = \frac{1}{3}P_{1}+\frac{1}{3}P_{3}$$
$$$$
$$P_{3} = \frac{1}{3}P_{2} + \dfrac{1}{3}P_3$$
$$$$
Note that in the last equation, if one of the two people not immediately next to you has the ball, one of the passes will be to someone that is also not next to you, which is why there is only a $\dfrac{1}{3}P_2$ term. Solving these equations, we see that $P_{1}=\frac{5}{11}$ which is our final answer.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/11"
    ],
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "p5wSO9WmKQcYkWb6Sjka",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-19 12:54:48 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 451193,
    "source": "Kaushik - DRW Interview",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Pass the Ball",
    "topic": "probability",
    "urlEnding": "pass-the-ball",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "medium",
    "id": "p5wSO9WmKQcYkWb6Sjka",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Pass the Ball",
    "topic": "probability",
    "urlEnding": "pass-the-ball"
  }
}
```
