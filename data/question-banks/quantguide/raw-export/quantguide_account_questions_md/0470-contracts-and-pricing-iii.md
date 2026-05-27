# QuantGuide Question

## 470. Contracts and Pricing III

**Metadata**

- ID: `o81oiSxZqsnjTacCkvrx`
- URL: https://www.quantguide.io/questions/contracts-and-pricing-iii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: Original (from Andy)
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-23 13:15:09 America/New_York
- Last Edited By: Gabe

### 题干

After being caught in an embarrassing high-profile data fabrication scandal, Calambya University decides to stop sharing data with the national college ranking organization, effective in 2023. Rival school Mahogany University is overjoyed and offers each student a tuition refund worth $X$ thousand dollars, where $X = \text{Calambya's 2023 Ranking} - \text{Mahogany's 2023 Ranking}$. One Mahogany student, Justin, offers to sell the following contract to his friend Kevin for $0.70$ thousand dollars, before $X$ is known: Justin will give Kevin the right but not the obligation to purchase Justin's tuition refund for only $0.5$ thousand dollars. Suppose $X \sim \text{Exp}(\beta)$, where $\beta$ is the scale. Compute $\beta$ to the nearest tenth under the assumption that the contract is priced fairly.

### Hint

Condition on the value of $X$ when computing the expected gain/loss.

### 解答

Removing all the extra useless information, we know $X \sim \text{Exp}(\beta)$ and the fair contract is worth $\$0.7$ thousand dollars, meaning the expected gain should be 0.

$$$$

Assuming Kevin bought the contract, he will only exercise his right to purchase Justin's tuition refund if the actual value of the tuition refund is worth more than $0.5$ thousand dollars. Otherwise, Kevin will simply take the loss in the price paid for the contract. Kevin's gain/loss, $G$ may be expressed as follows:
\[
\begin{aligned}
    G &= \begin{cases}
        -0.7 + X - 0.5 & \quad X > 0.5 \\
        -0.7 & \quad X \leq 0.5
    \end{cases}
\end{aligned}
\]
The expected gain can then be computed via the law of total expectation.
\[
\begin{aligned}
\mathbb{E}[G] &= \mathbb{E}[G|X > 0.5] \mathbb{P}(X > 0.5) + \mathbb{E}[G|X \leq 0.5] \mathbb{P}(X \leq 0.5)
\end{aligned}
\]
Note that
\[
\begin{aligned}
    \mathbb{E}[G|X > 0.5] &= -1.2 + \int_{0.5}^\infty \frac{x}{\beta} e^{-x / \beta} \, dx \\
    &= -1.2 + \left[ -xe^{-x / \beta }\right]_{0.5}^\infty + \int_{0.5}^\infty e^{-x/\beta} \,dx \\
    &= -1.2 - \left[ e^{-x / \beta} (\beta + x) \right]_{0.5}^\infty \\
    &= -1.2 + e^{-0.5 / \beta} (\beta + 0.5),  \\
    \mathbb{P}(X > 0.5) &= \int_{0.5}^\infty \frac{1}{\beta} e^{-x / \beta} \, dx \\
    &= e^{-0.5 / \beta}
\end{aligned}
\]
So, our expected gain is 
\[
\begin{aligned}
\mathbb{E}[G] &= \mathbb{E}[G|X > 0.5] \mathbb{P}(X > 0.5) + \mathbb{E}[G|X < 0.5] \\
&= \left( -1.2 + e^{-0.5 / \beta} (\beta + 0.5) \right) e^{-0.5 / \beta}  -0.7 \left( 1 - e^{-0.5 / \beta} \right) \\
&= e^{-1 / \beta} (\beta + 0.5) - 0.5 e^{-0.5/\beta} - 0.7 \\
&= 0
\end{aligned}
\]
Solving the above equation for $\beta$ with the help of a computer, we find $\beta \approx 1.5$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1.1"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "o81oiSxZqsnjTacCkvrx",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-23 13:15:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3754097,
    "source": "Original (from Andy)",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Contracts and Pricing III",
    "topic": "probability",
    "urlEnding": "contracts-and-pricing-iii",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "o81oiSxZqsnjTacCkvrx",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Contracts and Pricing III",
    "topic": "probability",
    "urlEnding": "contracts-and-pricing-iii"
  }
}
```
