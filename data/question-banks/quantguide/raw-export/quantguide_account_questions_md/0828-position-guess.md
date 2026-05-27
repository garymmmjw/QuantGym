# QuantGuide Question

## 828. Position Guess

**Metadata**

- ID: `9ZHX9PEdlrHxWOj8KZP2`
- URL: https://www.quantguide.io/questions/position-guess
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: MSE
- Tags: Games, Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:55:01 America/New_York
- Last Edited By: Gabe

### 题干

You are given $3$ IID $\text{Unif}(0,1)$ random variables but can't see the values. One of the values is revealed to you at random among the three. You want to determine if the revealed value is the minimum, median, or maximum of the three values. Assuming you guess optimally, what is your probability of being correct?

### Hint

The optimal strategy is going to be in the form of guessing the minimum if the value is $\leq x$, median if the value is between $x$ and $y$, and maximum if the value if $\geq y$. However, note that $y = 1-x$ because of the fact that if $X_1,X_2,X_3 \sim \text{Unif}(0,1)$ IID, $1 - X_1, 1- X_2, 1-X_3 \sim \text{Unif}(0,1)$ IID as well, so the threshold for guessing the maximum would be $1-x$. 


### 解答

The optimal strategy is going to be in the form of guessing the minimum if the value is $\leq x$, median if the value is between $x$ and $y$, and maximum if the value if $\geq y$. However, note that $y = 1-x$ because of the fact that if $X_1,X_2,X_3 \sim \text{Unif}(0,1)$ IID, $1 - X_1, 1- X_2, 1-X_3 \sim \text{Unif}(0,1)$ IID as well, so the threshold for guessing the maximum would be $1-x$. 

$$$$

Now, we need to find $p(x)$, the probability as a function of $x$ of guessing correctly under this rule. There are three cases to consider, which is if the value if $\leq x$, between $x$ and $1-x$, and then $\geq 1-x$. The first and third cases we can treat as the same by the same argument as above. The probability of the revealed value being at most $x$ is $x$. Then, given the value is in $(0,x)$, it is uniform on that interval. Say $X_1$ is the value showed to us. By conditioning on $X_1 = a$, $$\displaystyle \mathbb{P}[X_1 = \text{min}\{X_1,X_2,X_3\}] = \int_0^x \mathbb{P}[X_1 = \text{min}\{X_1,X_2,X_3\} \mid X_1 = a]f_{X_1}(a)da = \dfrac{1}{x}\int_0^x (1-a)^2da = \dfrac{1}{3}a^2 -a+1$$ The $(1-a)^2$ term comes from the probability both $X_2$ and $X_3$ are larger than $a$. Multiplying by the probability of $X_1 \leq a$ and doubling to account for the third case, we get a term of $2a\left(\dfrac{1}{3}a^2 - a + 1\right)$ for our final probability. 

$$$$

Now, we account for the middle case, which occurs with probability $1-2a$. If $X_1$ is in this interval, it is uniform throughout it. Therefore, conditioning on $X_1 = a$ once again, we would now guess $X_1$ is the median, so $$\mathbb{P}[X_1 = \text{med}\{X_1,X_2,X_3\}] = \displaystyle \int_x^{1-x} \mathbb{P}[X_1 = \text{med}\{X_1,X_2,X_3\} \mid X_1 = a]f_{X_1}(a)da = \dfrac{1}{1-2x} \int_x^{1-x} 2a(1-a)da = -\dfrac{2}{3}x^2 + \dfrac{2}{3}x + \dfrac{1}{3}$$ The $2a(1-a)$ term comes from the fact that one of the remaining two random variables is above and the other is below $a$ with $2$ ways to order them. Multiplying by $1-2x$ to account for the probability of the median being in $(x,1-x)$, adding it to the first term of $p(x)$ from above, and simplifying it all, we get $p(x) = 2x^3 - 4x^2 + 2x +\dfrac{1}{3}$. 

$$$$

To maximize $p(x)$, we take the derivative. Namely, $p'(x) = 6x^2 - 8x + 2$, of which the zeroes are $x^* = \dfrac{8 \pm \sqrt{64 - 48}}{12} = \dfrac{1}{3},1$. As $0 < x < \dfrac{1}{2}$ (since then the regions would overlap), we conclude $x^* = \dfrac{1}{3}$ is our maximizer, with $p(x^*) = \dfrac{17}{27}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "17/27"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "9ZHX9PEdlrHxWOj8KZP2",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:55:01 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6805654,
    "source": "MSE",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Position Guess",
    "topic": "probability",
    "urlEnding": "position-guess"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "9ZHX9PEdlrHxWOj8KZP2",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Position Guess",
    "topic": "probability",
    "urlEnding": "position-guess"
  }
}
```
