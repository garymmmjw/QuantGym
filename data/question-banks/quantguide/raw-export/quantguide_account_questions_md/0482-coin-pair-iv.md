# QuantGuide Question

## 482. Coin Pair IV

**Metadata**

- ID: `MRK3TbPUytAydgU35VA0`
- URL: https://www.quantguide.io/questions/coin-pair-iv
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Jane Street
- Source: Jane Street
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-12 08:44:13 America/New_York
- Last Edited By: Gabe

### 题干

Four fair coins appear in front of you. You flip all four at once and observe the outcomes of the coins. After seeing the outcomes, you may flip any pair of tails again. You may not flip a single coin without flipping another. You can iterate this process as many times as there are at least two tails to flip. Find the expected number of coin flips needed until you are unable to better your position.

### Hint

Let $T$ be the total number of coin flips needed and $X$ be the total number of heads that appear on the first flipping of the coins. Then $\mathbb{E}[T] = \mathbb{E}[\mathbb{E}[T \mid X]] = \sum_{k=0}^{4}\mathbb{E}[T \mid X =k]\mathbb{P}[X = k]$ by Law of Total Expectation. $X \sim \text{Binom}\left(4,\dfrac{1}{2}\right)$ because $X$ counts the number of heads appearing in $4$ flips of a fair coin.

### 解答

Let $T$ be the total number of coin flips needed and $X$ be the total number of heads that appear on the first flipping of the coins. Then $\mathbb{E}[T] = \mathbb{E}[\mathbb{E}[T \mid X]] = \sum_{k=0}^{4}\mathbb{E}[T \mid X =k]\mathbb{P}[X = k]$ by Law of Total Expectation. $X \sim \text{Binom}\left(4,\dfrac{1}{2}\right)$ because $X$ counts the number of heads appearing in $4$ flips of a fair coin. To set our notation, let $e_i$ represent the additional number of flips needed to stop our process once we have $i$ heads.

$$$$

If $X = 4$, then obviously we don't flip any coins again, so $\mathbb{E}[T \mid X = 4] = 4$. This would mean $e_4 = 0$. Similarly, if $X = 3$, then we aren't able to flip just one tails, so $\mathbb{E}[T \mid X = 3] = 4$. This would mean $e_3 = 0$.

$$$$

If $X = 2$, then we are going to continually flip the two tail coins again until we don't obtain $TT$. We have that $\mathbb{E}[T \mid X = 2] = 4 + e_2$, as it takes $4$ flips at the beginning and then need $e_2$ additional flips to stop. We have that $$e_2 = \dfrac{1}{4} \cdot (2 + e_4) + \dfrac{1}{2} \cdot (2 + e_3) + \dfrac{1}{4} \cdot (2 + e_2)$$ This stems from the fact that we flip $2$ coins, and we get $0,1,$ or $2$ heads with those prescribed probabilities fries those two coins. Solving for $e_2$ here by plugging in $e_3 = e_4 = 0$ is $e_2 = \dfrac{8}{3}$, so $\mathbb{E}[T \mid X = 2] = 4 + \dfrac{8}{3} = \dfrac{20}{3}$.

$$$$

Iterating this logic, if $X = 1$, then we flip two tails until they don't appear $TT$. We know that $\mathbb{E}[T \mid X = 1] = 4 + e_1$ by the same logic as above. By doing the same conditioning argument, we have that $$e_1 = \dfrac{1}{4} \cdot (2 + e_3) + \dfrac{1}{2} \cdot (2 + e_2) + \dfrac{1}{4} \cdot (2 + e_1)$$ Plugging in $e_3 = 0$ and $e_2 = \dfrac{8}{3}$ yields that $e_1 = \dfrac{40}{9}$. Therefore, $\mathbb{E}[T \mid X = 1] = \dfrac{40}{9} + 4 = \dfrac{76}{9}$.

$$$$

Lastly, if $X = 0$, we have that $\mathbb{E}[T \mid X = 0] = 4 + e_0$. By doing the same conditioning argument once again, we get that $$e_0 = \dfrac{1}{4} \cdot (2 + e_2) + \dfrac{1}{2} \cdot (2 + e_1) + \dfrac{1}{4} \cdot (2 + e_0)$$ Solving for $e_0$ by plugging in $e_2 = \dfrac{8}{3}$ and $e_1 = \dfrac{40}{9}$ yields $e_0 = \dfrac{176}{27}$. We can now compute $\mathbb{E}[T \mid X = 0] = \dfrac{176}{27} + 4 = \dfrac{284}{27}$.

$$$$

Plugging the values and the PMF of $X$ into our expression from the beginning, we get that $$\mathbb{E}[T] = \dfrac{1}{16} \cdot 4 + \dfrac{4}{16} \cdot 4 + \dfrac{6}{16} \cdot \dfrac{20}{3} + \dfrac{4}{16} \cdot \dfrac{76}{9} + \dfrac{1}{16} \cdot \dfrac{284}{27} = \dfrac{176}{27}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "176/27"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "MRK3TbPUytAydgU35VA0",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-12 08:44:13 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3840739,
    "source": "Jane Street",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Coin Pair IV",
    "topic": "probability",
    "urlEnding": "coin-pair-iv",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "MRK3TbPUytAydgU35VA0",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Coin Pair IV",
    "topic": "probability",
    "urlEnding": "coin-pair-iv"
  }
}
```
