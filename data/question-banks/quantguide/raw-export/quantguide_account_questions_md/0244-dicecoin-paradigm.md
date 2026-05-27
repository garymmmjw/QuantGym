# QuantGuide Question

## 244. Dice-Coin Paradigm

**Metadata**

- ID: `Q4ArBNQrJZCrBryvKJWf`
- URL: https://www.quantguide.io/questions/dicecoin-paradigm
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-11 13:42:38 America/New_York
- Last Edited By: Gabe

### 题干

We flip a fair coin until we obtain our first tails. Given the first tails occurs on the $n$th flip, we roll a fair $6-$sided die $n$ times. Find the probability that the die value 1 is observed in the rolls.

### Hint

Condition on the number of times the coin was flipped before seeing the first tails.

### 解答

The easier term to calculate is the probability that do not observe any 1's, and then subtract this probability from $1$. We condition on the number of flips of the coin needed to see the first tails. Let $O$ be the event that we don't see a $1$ in the game and $T_k$ be the event that we see the first tails on the $k$th flip, $k \geq 1$. We have that $\mathbb{P}[O] = \sum_{k=1}^{\infty} \mathbb{P}[O \mid T_k]\mathbb{P}[T_k]$. We have that $\mathbb{P}[T_k]$ is the probability that the first $k-1$ flips are heads and the $k$th is tails. The probability of this is $\dfrac{1}{2^k}$. Then, $\mathbb{P}[O \mid T_k]$ is the event that there are no $1$s in the $k$ rolls, which is $\left(\dfrac{5}{6}\right)^k$. Therefore, we get that our sum is $$\sum_{k=1}^{\infty} \left(\dfrac{5}{12}\right)^{k} = \dfrac{5}{12}\sum_{k=1}^{\infty} \left(\dfrac{5}{12}\right)^{k-1}$$ This sum evaluates to $\dfrac{\frac{5}{12}}{1 - \frac{5}{12}} = \dfrac{5}{7}$. Therefore, the probability we see a 1 somewhere is $1 - \dfrac{5}{7} = \dfrac{2}{7}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/7"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "Q4ArBNQrJZCrBryvKJWf",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-11 13:42:38 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1927519,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Dice-Coin Paradigm",
    "topic": "probability",
    "urlEnding": "dicecoin-paradigm",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "Q4ArBNQrJZCrBryvKJWf",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Dice-Coin Paradigm",
    "topic": "probability",
    "urlEnding": "dicecoin-paradigm"
  }
}
```
