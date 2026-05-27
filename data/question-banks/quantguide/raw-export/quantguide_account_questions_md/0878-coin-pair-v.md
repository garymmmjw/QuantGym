# QuantGuide Question

## 878. Coin Pair V

**Metadata**

- ID: `IjGWZozWxyqtFvwcWWOl`
- URL: https://www.quantguide.io/questions/coin-pair-v
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Jane Street
- Source: Jane Street
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-2 11:58:26 America/New_York
- Last Edited By: Gabe

### 题干

Four fair coins appear in front of you. You flip all four at once and observe the outcomes of the coins. After seeing the outcomes, you select any pair of coins to reconsider. One of the two coins can be turned over, while the other must be flipped again. If you already have $3$ heads, you still must perform both actions. You iterate this process until you end up with all $4$ coins being heads. A movement of a coin is when you either turn over or flip it. Find the expected number of coin movements needed to obtain $4$ heads.

### Hint

Four fair coins appear in front of you. You all four at once and observe the outcomes of the coins. After seeing the outcomes, you select any pair of coins to reconsider. One of the two coins can be turned over, while the other must be flipped again. You iterate this process until you end up with all $4$ coins being heads. A movement of a coin is when you either turn over or flip it. Find the expected number of coin movements needed to obtain $4$ heads.

### 解答

Let $T$ be the total number of coin flips needed and $X$ be the total number of heads that appear on the first flipping of the coins. Then $\mathbb{E}[T] = \mathbb{E}[\mathbb{E}[T \mid X]] = \sum_{k=0}^{4}\mathbb{E}[T \mid X =k]\mathbb{P}[X = k]$ by Law of Total Expectation. $X \sim \text{Binom}\left(4,\dfrac{1}{2}\right)$ because $X$ counts the number of heads appearing in $4$ flips of a fair coin. To set our notation, let $e_i$ represent the additional number of flips needed to stop our process once we have $i$ heads.

$$$$

If $X = 4$, then obviously we don't flip any coins again, so $\mathbb{E}[T \mid X = 4] = 4$. This would mean $e_4 = 0$.

$$$$

If $X = 3$, then we would be consider one heads and one tails. We should turn over the tails so that we have a guaranteed head i.e. we end up with either $3$ or $4$ heads after this process. Then, with equal probability, we would get a heads or tails on the remaining coin, so $e_3 = 2 + \dfrac{1}{2}e_3 + \dfrac{1}{2}e_4$. Putting in $e_4 = 0$ yields that $e_3 = 4$. This means $\mathbb{E}[T \mid X = 3] = 8$.

$$$$

If $X = 2$, then we are considering $2$ tails, meaning we turn one over and flip the other. This is exactly the same scenario as above, as we are guaranteed to have $3$ or $4$ heads after with the same probabilities, so $e_2 = 4$ as well. This means $\mathbb{E}[T \mid X = 2] 
= 8$.

$$$$

If $X = 1$, then we consider $2$ tails. We turn one over, and then we flip the other. We will end with either $2$ or $3$ heads after this iteration with equal probability. Therefore, $e_1 = 2 + \dfrac{1}{2}e_2 + \dfrac{1}{2}e_3$. As $e_2 = e_3 = 4$, $e_1 = 6$. This means $\mathbb{E}[T \mid X = 1] = 10$.

$$$$

Lastly, if $X = 0$, we just consider $2$ tails one again. We turn one over, and then we flip the other. We will end with either $1$ or $2$ heads after this iteration with equal probability, so $e_0 = 2 + \dfrac{1}{2}e_1 + \dfrac{1}{2}e_2$. Plugging in $e_1 = 6$ and $e_2 = 4$ yields $e_0 = 7$, so $\mathbb{E}[T \mid X = 0] = 11$.

$$$$

Plugging the values and the PMF of $X$ into our expression from the beginning, we get that $$\mathbb{E}[T] = \dfrac{1}{16} \cdot 4 + \dfrac{4}{16} \cdot 8 + \dfrac{6}{16} \cdot 8 + \dfrac{4}{16} \cdot 10 + \dfrac{1}{16} \cdot 11 = \dfrac{135}{16}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "135/16"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "IjGWZozWxyqtFvwcWWOl",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-2 11:58:26 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7193759,
    "source": "Jane Street",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Coin Pair V",
    "topic": "probability",
    "urlEnding": "coin-pair-v",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "IjGWZozWxyqtFvwcWWOl",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Coin Pair V",
    "topic": "probability",
    "urlEnding": "coin-pair-v"
  }
}
```
