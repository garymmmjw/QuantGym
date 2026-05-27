# QuantGuide Question

## 1134. Color Swap

**Metadata**

- ID: `2wtBjbtdqT6Z8biiU9US`
- URL: https://www.quantguide.io/questions/color-swap
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: Prob and Stoch Calc questions
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Two urns $A$ and $B$ are presented before you. Urn $A$ has $100$ green and $400$ red balls. Urn $B$ has $400$ green and $100$ red balls. $300$ of the balls from Urn $A$ are randomly selected and moved to Urn $B$. Then, one ball in Urn $B$ is selected uniformly at random from the $800$ balls. Find the probability that this ball is red. 

### Hint

Condition on whether or not the ball selected came from Urn $A$.

### 解答

Let $A$ be the event that the ball selected originated from Urn $A$ and $R$ be the event of a red ball. By Law of Total Probability, $$\mathbb{P}[R] = \mathbb{P}[R \mid A] \mathbb{P}[A] + \mathbb{P}[R \mid A^c]\mathbb{P}[A^c]$$ We know that $\mathbb{P}[A] = \dfrac{3}{8}$, as $300$ of the $800$ balls came from Urn $A$. This means that $\mathbb{P}[A^c] = \dfrac{5}{8}$. Given that the ball is from $A$, there $\dfrac{4}{5}$ it is red. Given that the ball is not from $A$ i.e. from $B$, there is a $\dfrac{1}{5}$ chance it is red. Therefore, the total probability the ball is red is $$\dfrac{4}{5} \cdot \dfrac{3}{8} + \dfrac{1}{5} \cdot \dfrac{5}{8} = \dfrac{17}{40}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "17/40"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "2wtBjbtdqT6Z8biiU9US",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9361666,
    "randomizable": "",
    "source": "Prob and Stoch Calc questions",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Color Swap",
    "topic": "probability",
    "urlEnding": "color-swap"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "2wtBjbtdqT6Z8biiU9US",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Color Swap",
    "topic": "probability",
    "urlEnding": "color-swap"
  }
}
```
