# QuantGuide Question

## 1124. Ken Flipping Coins

**Metadata**

- ID: `36k2i06CxyDHa6DFHPJM`
- URL: https://www.quantguide.io/questions/ken-flipping-coins
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Virtu Financial, Goldman Sachs
- Source: N/A
- Tags: Expected Value, Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-7 12:37:49 America/New_York
- Last Edited By: Gabe

### 题干

Ken flips a fair coin until he observes a head. He receives the minimum of $\$64$ and $\$2^n$, where $n$ is the number of times that Ken flips the coin. What is his expected payoff?

### Hint

Break up the problem into the cases where $n \leq 6$ and $n>6$. What is the payoff for each case?

### 解答

The expected payoff when $1 \leq n \leq 6$ is $\frac{1}{2^n} \times 2^n = \$1$ for each $n$. For example, if $n=1$, which happens with probability $\frac{1}{2}$, Ken receives $\$2$, so the expected payoff is $\$1$. If $n=2$, which happens with probability $\frac{1}{4}$, Ken receives $\$4$, so the expected payoff is $\$1$. This pattern continues until $n=7$, when the minimum payoff stays fixed at $\$64$. When $n \geq 7$, the expected payoff is:

$$ \frac{1}{2^7} \times 2^6 + \frac{1}{2^8} \times 2^6 + \ldots = \frac{1}{2} + \frac{1}{4} + \ldots = \sum_{x>0}\frac{1}{2^x} = 1$$

Thus, the expected payoff of the game is:

$$6 \times 1 + 1 = 7$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7"
    ],
    "companies": [
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "36k2i06CxyDHa6DFHPJM",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:37:49 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9252733,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Ken Flipping Coins",
    "topic": "probability",
    "urlEnding": "ken-flipping-coins",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "36k2i06CxyDHa6DFHPJM",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Ken Flipping Coins",
    "topic": "probability",
    "urlEnding": "ken-flipping-coins"
  }
}
```
