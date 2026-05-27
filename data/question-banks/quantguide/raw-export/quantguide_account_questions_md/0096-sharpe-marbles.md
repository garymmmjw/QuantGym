# QuantGuide Question

## 96. Sharpe Marbles

**Metadata**

- ID: `2Apb9uKJ4IjVi8pXgvaC`
- URL: https://www.quantguide.io/questions/sharpe-marbles
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street
- Source: N/A
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 22:52:39 America/New_York
- Last Edited By: Gabe

### 题干

Siblings Alice and Bob play a game with marbles. Each player has one red and one blue marble and shows one marble to the other uniformly at random. If both show blue, Alice wins $\$1$. If both show red, Alice wins $\$3$. Else, Bob wins $\$2$. Note that the winnings come from their mother, not the other player. Let $A_r$ and $B_r$ define the ratio between the expected return and variance of Alice's and Bob's payoffs, respectively. What is $B_r - A_r$?

### Hint

Calculate the expected payoffs and payoff variances of Alice and Bob separately before calculating $A_r$ and $B_r$. Remember to weigh the payoffs and deviations according to their probabilities of occurring .

### 解答

Siblings Alice and Bob play a game with marbles. Each player has one red and one blue marble and shows one marble to the other uniformly at random. If both show blue, Alice wins $\$1$. If both show red, Alice wins $\$3$. Else, Bob wins $\$2$. Note that the winnings come from their mother, not the other player. Let $A_r$ and $B_r$ define the ratio between the expected return and variance of Alice's and Bob's payoffs, respectively. What is $B_r - A_r$?

We start by solving for the expected payoffs and their variances:

$$E[A] = \frac{1}{4}(1) + \frac{1}{4}(3) + \frac{1}{2}(0) = 1$$

$$E[B] = \frac{1}{2}(2) + \frac{1}{2}(0) = 1$$

$$V[A] = \frac{1}{4}(1-1)^2 + \frac{1}{4}(3-1)^2 + \frac{1}{2}(0-1)^2 = \frac{3}{2}$$

$$V[B] = \frac{1}{2}(2-1)^2 + \frac{1}{2}(0-1)^2 = 1$$

Now, we can calculate $A_r$ and $B_r$:

$$A_r = 1 \div \frac{3}{2} = \frac{2}{3}$$
$$B_r = 1 \div 1 = 1$$
$$B_r - A_r = \frac{1}{3}$$

This conclusion shows how expected return is not the only metric that should be used when calculating the practical payoff of an investment. Even though the two players have the same expected return, Alice is taking on additional risk for her position. Ceteris paribus, Bob's position is favored over Alice's because he achieves higher expected return per unit of positional risk he takes on.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "2Apb9uKJ4IjVi8pXgvaC",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 22:52:39 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 679619,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Sharpe Marbles",
    "topic": "statistics",
    "urlEnding": "sharpe-marbles"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "2Apb9uKJ4IjVi8pXgvaC",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Sharpe Marbles",
    "topic": "statistics",
    "urlEnding": "sharpe-marbles"
  }
}
```
