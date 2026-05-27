# QuantGuide Question

## 142. Leap Frog

**Metadata**

- ID: `RKb91bK2h2hLYjFnytqv`
- URL: https://www.quantguide.io/questions/leap-frog
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: DRW, Squarepoint Capital, Five Rings
- Source: N/A
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-15 00:15:43 America/New_York
- Last Edited By: Gabe

### 题干

A frog starting at position $0$ is going to jump on the integers. At each step, the frog will choose to jump forward $1$ or $2$ steps with equal probability. Let $p_k$ be the probability that the frog hits position $k > 0$. Find the largest value of $p_k$.

### Hint

If we want to reach position $k$, what are the possible positions we can reach it from? From those positions, how many steps need to be taken to reach position $k$? You may consider deriving a second-order recurrence relation for $p_k$.

### 解答

We want to maximize $p_k$. We are going to explicitly solve for $p_k$. We know that the frog jumps $1$ or $2$ steps at each time. Therefore, for position $k$, we can only reach it from positions $k-1$ or $k-2$. Namely, by Law of Total Probability, $p_k = \dfrac{1}{2}p_{k-1} + \dfrac{1}{2}p_{k-2}$. The $\dfrac{1}{2}$ represents the probability of selecting $1$ or $2$ steps when at position $k-1$ and $k-2$, respectively. This is a homogeneous second-order recurrence relation with constant coefficients. We can see this by rearranging to get $-p_k + \dfrac{1}{2}p_{k-1} + \dfrac{1}{2}p_{k-2} = 0$. The characteristic polynomial is $-r^2 + \dfrac{1}{2}r + \dfrac{1}{2} = 0$. By multiplying both sides by $-2$, this is equivalent to $2r^2 - r - 1 = 0$. By using the quadratic equation, the roots are $r = 1, -\dfrac{1}{2}$. Therefore, our solution is in the form $p_k = c_0 + c_1\left(-\dfrac{1}{2}\right)^k$. We need some initial conditions on this. Namely, it is very easy to calculate $p_0$ and $p_1$. We have that $p_0 = 1$ as we start at $0$. Additionally, $p_1 = \dfrac{1}{2}$ since we must take $1$ step starting from $0$ to reach it. Otherwise, we do not hit it. We get the system of equations $c_0 + c_1 = 1$ and $c_0 - \dfrac{1}{2}c_1 = \dfrac{1}{2}$. It is simple enough to verify that $c_0 = \dfrac{2}{3}$ and $c_1 = \dfrac{1}{3}$ solve this system.

$$$$

Plugging this in $p_k = \dfrac{2}{3} + \dfrac{1}{3} \left(-\dfrac{1}{2}\right)^k$. Note that $\left(-\dfrac{1}{2}\right)^k$ is positive for even $k$ and negative for odd $k$. Therefore, to maximize this probability, we want to maximize how positive $\left(-\dfrac{1}{2}\right)^k$ is for $k > 0$. Namely, we just want $k$ to be as small as possible and even, as evenness makes it positive and $k$ being the smallest even one makes the term as large as possible over the positive integers. The smallest positive integer is $k = 2$, so $k = 2$ will maximize $p_k$. Namely, $p_2 = \dfrac{3}{4}$, and this is our solution.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/4"
    ],
    "companies": [
      {
        "company": "DRW"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "RKb91bK2h2hLYjFnytqv",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-15 00:15:43 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1011623,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Leap Frog",
    "topic": "probability",
    "urlEnding": "leap-frog",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "RKb91bK2h2hLYjFnytqv",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Leap Frog",
    "topic": "probability",
    "urlEnding": "leap-frog"
  }
}
```
